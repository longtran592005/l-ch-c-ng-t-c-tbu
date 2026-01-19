/**
 * Simple Whisper Routes
 * Integrate vinai.py script for speech-to-text
 */

import { Router } from 'express';
import * as whisperSimpleController from '../controllers/whisperSimple.controller';

const router = Router();

// Main transcription endpoint
router.post('/transcribe', whisperSimpleController.handleTranscribeAudio);

// Status check endpoint
router.get('/status', whisperSimpleController.handleCheckStatus);

export default router;
