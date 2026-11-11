import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { deleteMedia, uploadMedia } from '../controllers/upload.controller';
import { ALLOWED_MIME_EXTENSIONS } from '../services/storage.service';

const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB
const MAX_FILES_PER_REQUEST = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_PER_REQUEST,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_EXTENSIONS[file.mimetype.toLowerCase()]) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file format "${file.mimetype}". Allowed formats: JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, MOV, OGG.`
        )
      );
    }
  },
});

const handleMulterUpload = (req: Request, res: Response, next: NextFunction) => {
  const uploader = upload.array('files', MAX_FILES_PER_REQUEST);
  uploader(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ message: 'File size exceeds the 30MB limit.' });
        return;
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({ message: 'Maximum 10 files can be uploaded at once.' });
        return;
      }
      res.status(400).json({ message: err.message });
      return;
    }

    if (err) {
      res.status(400).json({ message: err.message || 'Invalid file upload.' });
      return;
    }

    next();
  });
};

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole(['ADMIN', 'STAFF']),
  handleMulterUpload,
  uploadMedia
);

router.delete(
  '/',
  requireAuth,
  requireRole(['ADMIN', 'STAFF']),
  deleteMedia
);

export default router;

