/**
 * STT (Speech-to-Text) Configuration Routes
 * 
 * @author TBU AI Team
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as sttConfigController from '../controllers/sttConfig.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../temp_uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `stt-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max for long audio
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/m4a',
      'audio/aac',
      'audio/flac',
      'audio/x-m4a'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'));
    }
  }
});

// ==================== Public Routes ====================

// Health check
router.get('/health', sttConfigController.healthCheck);

// Get current config (public - frontend needs this)
router.get('/config', sttConfigController.getConfig);

// Get providers info (public - for UI display)
router.get('/providers', sttConfigController.getProviders);

// ==================== Protected Routes (Require Auth) ====================

// Transcribe short audio (Voice Form - Gemini)
router.post('/transcribe/short', authenticate, sttConfigController.transcribeShort);

// Transcribe long audio (Meeting - Gemini)
router.post(
  '/transcribe/long',
  authenticate,
  upload.single('audioFile'),
  sttConfigController.transcribeLong
);

// ==================== Admin Routes ====================

// Set Voice Form provider (Admin only)
router.post(
  '/voice-form/provider',
  authenticate,
  requireRole('admin'),
  sttConfigController.setVoiceFormProvider
);

// Set Meeting Transcription provider (Admin only)
router.post(
  '/meeting/provider',
  authenticate,
  requireRole('admin'),
  sttConfigController.setMeetingProvider
);

export default router;
