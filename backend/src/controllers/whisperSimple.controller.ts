/**
 * Simple Whisper Controller
 * Uses local Python script (vinai.py) for speech-to-text
 * Simpler and more reliable than FastAPI service
 */

import { Request, Response } from 'express';
import * as whisperSimpleService from '../services/whisperSimple.service';

/**
 * POST /api/whisper/transcribe
 * Transcribe audio file to text using vinai.py
 * 
 * Request body:
 * {
 *   audioPath: string; // Full path to audio file
 *   batch_size?: number; // default 4
 *   beam_size?: number; // default 5
 *   device?: 'cuda' | 'cpu'; // default 'cuda'
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     text: string;
 *     outputPath: string;
 *   }
 * }
 */
export const handleTranscribeAudio = async (req: Request, res: Response): Promise<void> => {
    try {
        const { audioPath, batch_size, beam_size, device } = req.body as any;

        if (!audioPath || typeof audioPath !== 'string') {
            res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_PATH',
                    message: 'Audio file path is required'
                }
            });
            return;
        }

        console.log('[Whisper Controller] Starting transcription:', audioPath);

        const result = await whisperSimpleService.transcribeAudioFile({
            inputFile: audioPath,
            batchSize: batch_size,
            beamSize: beam_size,
            device: device || 'cuda'
        });

        if (!result.success) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'TRANSCRIPTION_FAILED',
                    message: result.error || 'Transcription failed'
                }
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                text: result.text,
                outputPath: result.outputPath
            }
        });
    } catch (error: any) {
        console.error('[Whisper Controller] Error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Internal server error',
                ...(process.env.NODE_ENV === 'development' && {
                    stack: error.stack,
                    details: error
                })
            }
        });
    }
};

/**
 * GET /api/whisper/status
 * Check if Whisper environment is ready
 */
export const handleCheckStatus = async (_req: Request, res: Response): Promise<void> => {
    const isReady = whisperSimpleService.checkPythonEnv();

    res.status(200).json({
        success: true,
        data: {
            ready: isReady,
            pythonPath: process.env.WHISPER_VENV || '.venv/Scripts/python',
            scriptPath: 'whisper/vinai.py',
            model: 'suzii/vi-whisper-large-v3-turbo-v1-ct2'
        }
    });
};
