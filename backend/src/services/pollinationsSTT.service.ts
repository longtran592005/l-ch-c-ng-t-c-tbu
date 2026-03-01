/**
 * Pollinations.ai Speech-to-Text Service
 * Sử dụng endpoint /v1/audio/transcriptions (Whisper-compatible)
 * và /v1/chat/completions cho one-shot parse (audio → structured data)
 *
 * @author TBU AI Team
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// STT (audio) phải dùng gen.pollinations.ai, không dùng text.pollinations.ai
const POLLINATIONS_BASE_URL = process.env.POLLINATIONS_STT_URL || 'https://gen.pollinations.ai';
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY || '';
const POLLINATIONS_STT_MODEL = process.env.POLLINATIONS_STT_MODEL || 'whisper-large-v3';

interface TranscribeResult {
    success: boolean;
    text: string;
    duration?: number;
    provider: string;
    model: string;
    parsedValue?: string;
    error?: string;
}

/**
 * Kiểm tra Pollinations.ai STT khả dụng
 */
export const checkPollinationsSTTHealth = async (): Promise<boolean> => {
    try {
        // Pollinations is free, just check if endpoint responds
        const response = await axios.get(`${POLLINATIONS_BASE_URL}/`, {
            timeout: 10000
        });
        return response.status === 200;
    } catch (error: any) {
        console.error('[PollinationsSTT] Health check failed:', error.message);
        return false;
    }
};

/**
 * Transcribe audio ngắn (Voice Form)
 * Sử dụng /v1/audio/transcriptions endpoint (Whisper-compatible)
 */
export const transcribeShortAudio = async (
    audioBase64: string,
    mimeType: string = 'audio/webm'
): Promise<TranscribeResult> => {
    if (!POLLINATIONS_API_KEY) {
        return { success: false, text: '', provider: 'pollinations', model: POLLINATIONS_STT_MODEL, error: 'POLLINATIONS_API_KEY not configured' };
    }

    const startTime = Date.now();
    
    try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        
        // Determine file extension from mime type
        const extMap: Record<string, string> = {
            'audio/webm': 'webm',
            'audio/wav': 'wav',
            'audio/mp3': 'mp3',
            'audio/mpeg': 'mp3',
            'audio/ogg': 'ogg',
            'audio/mp4': 'mp4',
            'audio/m4a': 'm4a',
        };
        const ext = extMap[mimeType] || 'webm';

        // Write to temp file (Pollinations expects multipart file upload)
        const tempDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempFile = path.join(tempDir, `poll_stt_${Date.now()}.${ext}`);
        fs.writeFileSync(tempFile, audioBuffer);

        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(tempFile), { filename: `audio.${ext}`, contentType: mimeType });
            form.append('model', POLLINATIONS_STT_MODEL);
            form.append('language', 'vi');
            form.append('response_format', 'json');

            const sttHeaders: Record<string, string> = {
                ...form.getHeaders(),
            };
            if (POLLINATIONS_API_KEY) {
                sttHeaders['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
            }

            const response = await axios.post(
                `${POLLINATIONS_BASE_URL}/v1/audio/transcriptions`,
                form,
                {
                    headers: sttHeaders,
                    timeout: 30000,
                }
            );

            const duration = (Date.now() - startTime) / 1000;
            const text = response.data?.text || '';

            console.log(`[PollinationsSTT] Transcribed in ${duration.toFixed(2)}s: "${text.substring(0, 80)}..."`);

            return {
                success: true,
                text,
                duration,
                provider: 'pollinations',
                model: POLLINATIONS_STT_MODEL,
            };
        } finally {
            // Clean up temp file
            try { fs.unlinkSync(tempFile); } catch { }
        }
    } catch (error: any) {
        const duration = (Date.now() - startTime) / 1000;
        console.error(`[PollinationsSTT] Transcription failed (${duration.toFixed(2)}s):`, error.message);
        return {
            success: false,
            text: '',
            duration,
            provider: 'pollinations',
            model: POLLINATIONS_STT_MODEL,
            error: error.message,
        };
    }
};

/**
 * One-shot: Audio → Structured Value (cho Voice Form)
 * Gửi audio qua Whisper STT, rồi dùng LLM parse kết quả
 */
export const transcribeAndParseShortAudio = async (
    audioBase64: string,
    mimeType: string,
    fieldInfo: { name: string; type: string; label: string; enumValues?: { label: string; value: string }[] }
): Promise<TranscribeResult> => {
    // Step 1: Transcribe
    const sttResult = await transcribeShortAudio(audioBase64, mimeType);
    if (!sttResult.success || !sttResult.text) {
        return sttResult;
    }

    // Step 2: Parse with LLM (chat completions)
    try {
        let enumInfo = '';
        if (fieldInfo.type === 'enum' && fieldInfo.enumValues) {
            enumInfo = `\nGiá trị hợp lệ: ${fieldInfo.enumValues.map(e => `${e.value} (${e.label})`).join(', ')}`;
        }

        const prompt = `Bạn là trợ lý chuẩn hóa dữ liệu từ giọng nói tiếng Việt.
Trường: ${fieldInfo.label} (${fieldInfo.name})
Kiểu: ${fieldInfo.type}${enumInfo}

Văn bản gốc từ giọng nói: "${sttResult.text}"

CHỈ TRẢ VỀ GIÁ TRỊ THUẦN, không giải thích. Nếu không chuẩn hóa được → trả chuỗi rỗng.`;

        const parseHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (POLLINATIONS_API_KEY) {
            parseHeaders['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
        }

        // LLM parse dùng text.pollinations.ai (khác với STT dùng gen.pollinations.ai)
        const llmUrl = process.env.POLLINATIONS_BASE_URL || 'https://text.pollinations.ai';
        const response = await axios.post(
            `${llmUrl}/v1/chat/completions`,
            {
                model: process.env.POLLINATIONS_MODEL || 'openai',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 200,
            },
            {
                headers: parseHeaders,
                timeout: 15000,
            }
        );

        const parsedValue = response.data?.choices?.[0]?.message?.content?.trim() || sttResult.text;
        
        return {
            ...sttResult,
            parsedValue,
        };
    } catch (error: any) {
        console.error('[PollinationsSTT] Parse failed, returning raw text:', error.message);
        return {
            ...sttResult,
            parsedValue: sttResult.text,
        };
    }
};

/**
 * Transcribe audio dài (Meeting Transcription)
 * Pollinations Whisper hỗ trợ file audio lớn
 */
export const transcribeLongAudio = async (
    filePath: string,
    language: string = 'vi'
): Promise<TranscribeResult> => {
    const startTime = Date.now();

    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('model', POLLINATIONS_STT_MODEL);
        form.append('language', language);
        form.append('response_format', 'verbose_json');

        const longHeaders: Record<string, string> = {
            ...form.getHeaders(),
        };
        if (POLLINATIONS_API_KEY) {
            longHeaders['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
        }

        const response = await axios.post(
            `${POLLINATIONS_BASE_URL}/v1/audio/transcriptions`,
            form,
            {
                headers: longHeaders,
                timeout: 600000, // 10 min for long audio
            }
        );

        const duration = (Date.now() - startTime) / 1000;
        const text = response.data?.text || '';

        console.log(`[PollinationsSTT] Long transcription completed in ${duration.toFixed(2)}s (${text.length} chars)`);

        return {
            success: true,
            text,
            duration,
            provider: 'pollinations',
            model: POLLINATIONS_STT_MODEL,
        };
    } catch (error: any) {
        const duration = (Date.now() - startTime) / 1000;
        console.error(`[PollinationsSTT] Long transcription failed (${duration.toFixed(2)}s):`, error.message);
        return {
            success: false,
            text: '',
            duration,
            provider: 'pollinations',
            model: POLLINATIONS_STT_MODEL,
            error: error.message,
        };
    }
};
