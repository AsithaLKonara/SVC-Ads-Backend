import { Request, Response } from 'express';
import {
  deleteFileFromStorage,
  getFileFromStorage,
  resolvePublicMediaUrl,
  sanitizeFolder,
  uploadFileToStorage,
} from '../services/storage.service';

function getPublicBaseUrl(req: Request): string {
  const configured = process.env.BACKEND_PUBLIC_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const host = req.get('host');
  if (host) {
    return `${req.protocol}://${host}`;
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  return 'http://localhost:5000';
}

export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No files provided for upload.' });
      return;
    }

    const folder = sanitizeFolder(
      (req.body?.folder as string) || (req.query?.folder as string)
    );
    const baseUrl = getPublicBaseUrl(req);

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const result = await uploadFileToStorage(file.buffer, file.mimetype, folder);
        return {
          url: resolvePublicMediaUrl(baseUrl, result.key),
          key: result.key,
          contentType: result.contentType,
          size: result.size,
          originalName: file.originalname,
        };
      })
    );

    res.status(201).json({
      files: uploaded,
      urls: uploaded.map((item) => item.url),
    });
  } catch (error: any) {
    console.error('[Upload Error]:', error);
    res.status(500).json({
      message: error?.message || 'Failed to upload files to object storage.',
    });
  }
};

export const serveMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const folder = String(req.params.folder || '');
    const filename = String(req.params.filename || '');
    const key = `${folder}/${filename}`;
    const range = req.headers.range;

    const obj = await getFileFromStorage(key, range);

    if (obj.eTag && req.headers['if-none-match'] === obj.eTag && !range) {
      obj.stream.destroy();
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('ETag', obj.eTag);
      res.status(304).end();
      return;
    }

    res.status(obj.statusCode);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', obj.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', obj.acceptRanges || 'bytes');

    if (obj.contentLength !== undefined) {
      res.setHeader('Content-Length', String(obj.contentLength));
    }
    if (obj.contentRange) {
      res.setHeader('Content-Range', obj.contentRange);
    }
    if (obj.eTag) {
      res.setHeader('ETag', obj.eTag);
    }

    res.on('close', () => {
      if (!obj.stream.destroyed) {
        obj.stream.destroy();
      }
    });

    obj.stream.on('error', (streamErr) => {
      console.error('[Media Stream Error]:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to stream media object' });
      } else {
        res.end();
      }
    });

    obj.stream.pipe(res);
  } catch (error: any) {
    const code = error?.name || error?.Code || '';
    const httpStatus = error?.$metadata?.httpStatusCode;

    if (code === 'NoSuchKey' || httpStatus === 404 || error?.message === 'Invalid storage key format') {
      res.status(404).json({ message: 'Media file not found' });
      return;
    }

    if (code === 'InvalidRange' || httpStatus === 416) {
      res.status(416).json({ message: 'Requested range not satisfiable' });
      return;
    }

    console.error('[Serve Media Error]:', error);
    res.status(500).json({ message: 'Failed to load media file' });
  }
};

export const deleteMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const target = (req.body?.url || req.body?.key) as string | undefined;
    if (!target) {
      res.status(400).json({ message: 'Media url or key is required' });
      return;
    }

    await deleteFileFromStorage(target);
    res.json({ message: 'Media deleted successfully' });
  } catch (error: any) {
    console.error('[Delete Media Error]:', error);
    res.status(500).json({ message: 'Failed to delete media file' });
  }
};

