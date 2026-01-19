/**
 * Simple Whisper API Service
 * Calls backend endpoint that runs vinai.py script
 */

import { api } from './api';

export interface TranscribeRequest {
    audioPath: string;
    batchSize?: number;
    beamSize?: number;
    device?: 'cuda' | 'cpu';
}

export interface TranscribeResponse {
    success: boolean;
    data: {
        text: string;
        outputPath: string;
    };
}

export interface WhisperStatus {
    success: boolean;
    data: {
        ready: boolean;
        pythonPath: string;
        scriptPath: string;
        model: string;
    };
}

/**
 * Transcribe audio file to text
 * POST /api/whisper/transcribe
 */
export const transcribeAudio = async (request: TranscribeRequest): Promise<TranscribeResponse> => {
    return api.post<TranscribeResponse>('/whisper/transcribe', request);
};

/**
 * Check Whisper environment status
 * GET /api/whisper/status
 */
export const checkWhisperStatus = async (): Promise<WhisperStatus> => {
    return api.get<WhisperStatus>('/whisper/status');
};

/**
 * Simple wrapper - transcribe by audio path
 */
export const transcribeByPath = async (audioPath: string): Promise<string> => {
    const response = await transcribeAudio({
        audioPath,
        batchSize: 4,
        beamSize: 5,
        device: 'cuda'
    });

    if (!response.success || !response.data?.text) {
        throw new Error('Transcription failed');
    }

    return response.data.text;
};
