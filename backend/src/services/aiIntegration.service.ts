import fs from 'fs';
import { AppError } from '../utils/errors.util';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';

export const transcribeAudio = async (filePath: string): Promise<{ text: string; language: string }> => {
    if (!fs.existsSync(filePath)) {
        throw new AppError(404, 'NOT_FOUND', 'Audio file does not exist.');
    }

    try {
        // Read file into memory (Note: High memory usage for large files, but avoids extra deps)
        const fileBuffer = await fs.promises.readFile(filePath);
        const fileName = filePath.split(/[/\\]/).pop() || 'audio.mp3';
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

        // Construct multipart body
        const preBuffer = Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
            `Content-Type: application/octet-stream\r\n\r\n`
        );
        const postBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);
        const body = Buffer.concat([preBuffer, fileBuffer, postBuffer]);

        const response = await fetch(`${PYTHON_SERVICE_URL}/transcribe`, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: body as any, // Node types might complain but fetch accepts Buffer
        });

        if (!response.ok) {
            throw new Error(`AI Service returned ${response.status} ${response.statusText}`);
        }

        return await response.json() as { text: string; language: string };
    } catch (error: any) {
        console.error('AI Service Error (Transcribe):', error);
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            throw new AppError(503, 'CONNECTION_REFUSED', 'AI Service is not running (Connection Refused).');
        }
        throw new AppError(500, 'TRANSCRIPTION_FAILED', `Failed to transcribe audio via AI Service: ${error.message}`);
    }
};

export const generateMinutesAI = async (text: string, template: string = 'administrative'): Promise<string> => {
    try {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

        // Construct multipart body for simple fields
        let bodyString = '';

        bodyString += `--${boundary}\r\n`;
        bodyString += `Content-Disposition: form-data; name="text"\r\n\r\n`;
        bodyString += `${text}\r\n`;

        bodyString += `--${boundary}\r\n`;
        bodyString += `Content-Disposition: form-data; name="format_type"\r\n\r\n`;
        bodyString += `${template}\r\n`;

        bodyString += `--${boundary}--\r\n`;

        const response = await fetch(`${PYTHON_SERVICE_URL}/generate-minutes`, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: bodyString,
        });

        if (!response.ok) {
            throw new Error(`AI Service returned ${response.status}`);
        }

        const data = await response.json() as { minutes: string };
        return data.minutes;
    } catch (error: any) {
        console.error('AI Service Error (Generate Minutes):', error);
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            throw new AppError(503, 'CONNECTION_REFUSED', 'AI Service is not running (Connection Refused).');
        }
        throw new AppError(500, 'GENERATION_FAILED', 'Failed to generate minutes via AI Service.');
    }
}
