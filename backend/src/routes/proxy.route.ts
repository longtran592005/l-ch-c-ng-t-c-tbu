import express from 'express';
import multer from 'multer';
import { proxyController } from '../controllers/proxy.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Configure multer for temp file storage
const upload = multer({ dest: 'uploads/temp/' });

// Proxy Whisper (Audio Transcription)
// Endpoint: /api/proxy/whisper/transcribe
router.post('/whisper/transcribe', authenticate, upload.single('file'), proxyController.proxyWhisper);

// Proxy RAG (Knowledge Base)
// Endpoint: /api/proxy/rag/* (wildcard)
router.use('/rag', authenticate, proxyController.proxyRag);

export default router;
