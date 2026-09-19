import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import db from '../db/connection.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Service.js';

const router = Router();

// Configure Multer for memory storage (max 15MB file size)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
  fileFilter: (_req, file, cb) => {
    // Allow images, documents, audio
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: images, PDFs, audio.`));
    }
  },
});

/**
 * POST /api/media/upload
 * Uploads an image or document to S3, returns the CloudFront CDN URL, and saves a relational record.
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const { entityType = 'GENERAL', entityId = null, uploadedBy = null, folder = 'images' } = req.body;

    // 1. Upload to AWS S3
    const uploadResult = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    // 2. Insert relational record into database
    const mediaId = crypto.randomUUID();
    const insertStmt = db.prepare(`
      INSERT INTO media_files (
        id, originalName, s3Key, s3Url, cdnUrl, mimeType, sizeBytes, entityType, entityId, uploadedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      mediaId,
      uploadResult.fileName,
      uploadResult.s3Key,
      uploadResult.s3Url,
      uploadResult.cdnUrl,
      uploadResult.mimeType,
      uploadResult.sizeBytes,
      entityType,
      entityId,
      uploadedBy
    );

    const createdRecord = db.prepare('SELECT * FROM media_files WHERE id = ?').get(mediaId);

    res.status(201).json({
      success: true,
      message: 'File uploaded and media record created successfully',
      media: createdRecord,
    });
  } catch (error: any) {
    console.error('[Media Upload Error]:', error);
    res.status(500).json({
      error: 'Failed to upload media',
      details: error.message,
    });
  }
});

/**
 * GET /api/media/:id
 * Fetches media file relational record by ID
 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const media = db.prepare('SELECT * FROM media_files WHERE id = ?').get(id);

    if (!media) {
      res.status(404).json({ error: 'Media file not found' });
      return;
    }

    res.json({ success: true, media });
  } catch (error: any) {
    console.error('[Get Media Error]:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * DELETE /api/media/:id
 * Deletes media from S3 and removes relational record
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const media: any = db.prepare('SELECT * FROM media_files WHERE id = ?').get(id);

    if (!media) {
      res.status(404).json({ error: 'Media file not found' });
      return;
    }

    // Delete from S3
    await deleteFromS3(media.s3Key);

    // Delete from DB
    db.prepare('DELETE FROM media_files WHERE id = ?').run(id);

    res.json({ success: true, message: 'Media file deleted successfully' });
  } catch (error: any) {
    console.error('[Delete Media Error]:', error);
    res.status(500).json({ error: 'Failed to delete media', details: error.message });
  }
});

export default router;
