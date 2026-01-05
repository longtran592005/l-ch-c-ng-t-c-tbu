
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from './errors.util';

const UPLOAD_DIR = './uploads/audio';

// Create upload directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/x-m4a', 'audio/ogg'];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.mp4', '.ogg'];

/**
 * Validates audio file type and size.
 * @param file - The file to validate.
 */
export const validateAudioFile = (file: Express.Multer.File) => {
    if (!file) {
        throw new AppError('No file provided for validation.', 400);
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
        throw new AppError(`Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} are allowed.`, 400);
    }
    return true;
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    try {
      const meetingId = (req as any).meetingId || req.params?.id || 'unknown';
      const timestamp = Date.now();
      const originalname = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename
      const newFilename = `meeting-${meetingId}-${timestamp}-${originalname}`;
      cb(null, newFilename);
    } catch (error) {
      console.error('[FileUpload] Error generating filename:', error);
      cb(error as Error, '');
    }
  },
});

// Multer file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  try {
      validateAudioFile(file);
      cb(null, true);
  } catch(error: any) {
      // Pass error to multer's error handling
      cb(error);
  }
};

// Multer instance for audio uploads
export const uploadAudio = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

/**
 * Deletes an audio file from the filesystem.
 * @param filename - The name of the file to delete.
 */
export const deleteAudioFile = async (filename: string): Promise<void> => {
    if(!filename) return;
    try {
        const filePath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    } catch (error) {
        console.error(`Failed to delete audio file ${filename}:`, error);
        // We don't throw here to avoid breaking the main flow if a file is already gone
    }
};

/**
 * Gets the full path of an audio file.
 * @param filename - The name of the file.
 * @returns The full file path.
 */
export const getAudioFilePath = (filename: string): string => {
    return path.join(UPLOAD_DIR, filename);
};
