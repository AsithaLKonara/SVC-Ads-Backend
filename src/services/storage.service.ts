import crypto from 'crypto';
import { Readable } from 'stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const ALLOWED_FOLDERS = new Set(['ads', 'categories', 'uploads', 'media']);

export const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/ogg': '.ogg',
};

interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;

function getStorageConfig(): StorageConfig {
  const endpoint = (process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3 || '').trim();
  const region = (process.env.S3_REGION || process.env.AWS_REGION || 'auto').trim();
  const bucket = (process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || '').trim();
  const accessKeyId = (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '').trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Object storage is not configured. Missing S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, or S3_SECRET_ACCESS_KEY.'
    );
  }

  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

function getS3Client(): { client: S3Client; bucket: string } {
  if (cachedClient && cachedBucket) {
    return { client: cachedClient, bucket: cachedBucket };
  }

  const config = getStorageConfig();
  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cachedBucket = config.bucket;
  return { client: cachedClient, bucket: cachedBucket };
}

export function sanitizeFolder(folder?: string): string {
  const normalized = (folder || 'uploads').trim().toLowerCase();
  return ALLOWED_FOLDERS.has(normalized) ? normalized : 'uploads';
}

export function sanitizeKey(key: string): string {
  const cleaned = key.replace(/^\/+/, '').trim();
  if (!cleaned || cleaned.includes('..') || !/^[a-z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(cleaned)) {
    throw new Error('Invalid storage key format');
  }
  return cleaned;
}

export function extractStorageKey(urlOrKey?: string | null): string | null {
  if (!urlOrKey || typeof urlOrKey !== 'string') return null;
  const trimmed = urlOrKey.trim();

  // Ignore legacy inline data URLs or static public assets
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('/images/') || trimmed.startsWith('/seed-images/')) {
    return null;
  }

  const mediaMarker = '/api/media/';
  const markerIdx = trimmed.indexOf(mediaMarker);
  if (markerIdx !== -1) {
    const candidate = trimmed.slice(markerIdx + mediaMarker.length).split('?')[0];
    try {
      return sanitizeKey(candidate);
    } catch {
      return null;
    }
  }

  // Handle direct S3 URLs if any exist
  try {
    const parsed = new URL(trimmed);
    const bucket = (process.env.S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || '').trim();
    if (parsed.hostname.endsWith('t3.storageapi.dev')) {
      let path = parsed.pathname.replace(/^\/+/, '');
      if (bucket && path.startsWith(`${bucket}/`)) {
        path = path.slice(bucket.length + 1);
      }
      return sanitizeKey(path);
    }
  } catch {
    // Not a full URL; check if raw key
    try {
      return sanitizeKey(trimmed);
    } catch {
      return null;
    }
  }

  return null;
}

export function isStorageConfigured(): boolean {
  try {
    getStorageConfig();
    return true;
  } catch {
    return false;
  }
}

export async function uploadFileToStorage(
  buffer: Buffer,
  mimeType: string,
  folder = 'uploads'
): Promise<{ key: string; contentType: string; size: number }> {
  const ext = ALLOWED_MIME_EXTENSIONS[mimeType.toLowerCase()];
  if (!ext) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const safeFolder = sanitizeFolder(folder);
  const key = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  const { client, bucket } = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return {
    key,
    contentType: mimeType,
    size: buffer.length,
  };
}

export async function getFileFromStorage(
  rawKey: string,
  range?: string
): Promise<{
  stream: Readable;
  contentType: string;
  contentLength?: number;
  contentRange?: string;
  acceptRanges?: string;
  eTag?: string;
  statusCode: number;
}> {
  const key = sanitizeKey(rawKey);
  const { client, bucket } = getS3Client();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: range,
    })
  );

  if (!response.Body) {
    throw new Error('Empty response body from storage');
  }

  return {
    stream: response.Body as Readable,
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength,
    contentRange: response.ContentRange,
    acceptRanges: response.AcceptRanges || 'bytes',
    eTag: response.ETag,
    statusCode: response.$metadata.httpStatusCode || (range ? 206 : 200),
  };
}

export async function deleteFileFromStorage(urlOrKey?: string | null): Promise<void> {
  const key = extractStorageKey(urlOrKey);
  if (!key || !isStorageConfigured()) return;

  try {
    const { client, bucket } = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } catch (error) {
    console.warn(`[Storage] Failed to delete object "${key}":`, error);
  }
}

export function resolvePublicMediaUrl(baseUrl: string, key: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanKey = key.replace(/^\/+/, '');
  return `${cleanBase}/api/media/${cleanKey}`;
}
