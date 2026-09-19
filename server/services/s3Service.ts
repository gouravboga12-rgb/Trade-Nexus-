import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

const REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'tradex-media-419819288573';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

export const s3Client = new S3Client({
  region: REGION,
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}), // Uses default AWS credentials chain (e.g. EC2 IAM role or ~/.aws/credentials) if env not set
});

export interface UploadResult {
  s3Key: string;
  s3Url: string;
  cdnUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Uploads a file buffer directly to AWS S3 and returns both direct S3 and CloudFront CDN URLs.
 */
export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = 'general'
): Promise<UploadResult> {
  const fileExt = path.extname(originalName) || '';
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const safeBaseName = path
    .basename(originalName, fileExt)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);

  const s3Key = `uploads/${folder}/${Date.now()}_${safeBaseName}_${randomSuffix}${fileExt}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  const s3Url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${s3Key}`;
  const cdnUrl = CLOUDFRONT_DOMAIN
    ? `${CLOUDFRONT_DOMAIN.replace(/\/$/, '')}/${s3Key}`
    : s3Url;

  return {
    s3Key,
    s3Url,
    cdnUrl,
    fileName: originalName,
    mimeType,
    sizeBytes: buffer.length,
  };
}

/**
 * Deletes a file from AWS S3
 */
export async function deleteFromS3(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });
  await s3Client.send(command);
}
