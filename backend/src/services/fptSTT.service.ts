/**
 * FPT.AI Speech-to-Text Service
 * Sử dụng API ASR của FPT.AI (https://api.fpt.ai/hmi/asr/general)
 * Chuyển đổi giọng nói tiếng Việt thành văn bản
 * 
 * API Docs: https://fpt.ai/speech-to-text
 * API Key: Lấy tại https://console.fpt.ai
 * 
 * @author TBU AI Team
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ==================== Configuration ====================

const FPT_STT_URL = process.env.FPT_STT_URL || 'https://api.fpt.ai/hmi/asr/general';
const FPT_STT_API_KEY = process.env.FPT_STT_API_KEY || '';

// ==================== Types ====================

interface TranscribeResult {
    success: boolean;
    text: string;
    duration?: number;
    provider: string;
    model: string;
    parsedValue?: string;
    error?: string;
}

interface FPTSTTResponse {
    status: number; // 0=success, 1=no voice, 2=canceled, 9=system busy
    hypotheses?: Array<{ utterance: string }>;
    message?: string;
    id?: string;
}

// ==================== Audio Conversion ====================

const getBaseMimeType = (mimeType: string): string => {
    return mimeType.split(';')[0].trim().toLowerCase();
};

let ffmpegAvailable: boolean | null = null;
const checkFfmpeg = (): boolean => {
    if (ffmpegAvailable !== null) return ffmpegAvailable;
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        ffmpegAvailable = true;
        console.log('[FPT.AI] ffmpeg is available for audio conversion');
    } catch {
        ffmpegAvailable = false;
        console.warn('[FPT.AI] ffmpeg not found - audio conversion unavailable.');
    }
    return ffmpegAvailable;
};

const FPT_SUPPORTED_FORMATS = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a'];

/**
 * Clean FPT.AI text: strip trailing " ." artifact, normalize whitespace
 * FPT returns "Ngày 10/3/2026 ." → "Ngày 10/3/2026"
 * FPT returns "9h30 sáng ." → "9h30 sáng"
 */
const cleanFPTText = (text: string): string => {
    return text
        .replace(/\s+[.,]+\s*$/g, '')   // FPT trailing " ." or " ," artifact
        .replace(/[.,!?]+$/g, '')        // remaining trailing punctuation
        .replace(/\s{2,}/g, ' ')
        .trim();
};

const convertToWav = (inputPath: string, outputPath: string): boolean => {
    try {
        execSync(
            `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -acodec pcm_s16le "${outputPath}"`,
            { stdio: 'pipe', timeout: 30000 }
        );
        return fs.existsSync(outputPath);
    } catch (error: any) {
        console.error('[FPT.AI] ffmpeg conversion failed:', error.message);
        return false;
    }
};

// ==================== Health Check ====================

export const checkFPTSTTHealth = async (): Promise<boolean> => {
    try {
        if (!FPT_STT_API_KEY) {
            console.warn('[FPT.AI] API Key not configured');
            return false;
        }
        return true;
    } catch (error: any) {
        console.error('[FPT.AI] Health check failed:', error.message);
        return false;
    }
};

export const checkFPTAvailable = (): boolean => {
    return !!FPT_STT_API_KEY && FPT_STT_API_KEY.length > 5;
};

// ==================== Short Audio (Voice Form) ====================

export const transcribeShortAudio = async (
    audioBase64: string,
    mimeType: string = 'audio/webm'
): Promise<TranscribeResult> => {
    if (!FPT_STT_API_KEY) {
        return {
            success: false,
            text: '',
            provider: 'fpt',
            model: 'fpt-asr',
            error: 'FPT_STT_API_KEY not configured. Get key at https://console.fpt.ai'
        };
    }

    const startTime = Date.now();

    try {
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        const baseMime = getBaseMimeType(mimeType);

        const extMap: Record<string, string> = {
            'audio/webm': 'webm',
            'audio/wav': 'wav',
            'audio/mp3': 'mp3',
            'audio/mpeg': 'mp3',
            'audio/ogg': 'ogg',
            'audio/mp4': 'mp4',
            'audio/m4a': 'm4a',
        };
        const ext = extMap[baseMime] || 'webm';

        const tempDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempFile = path.join(tempDir, `fpt_stt_${Date.now()}.${ext}`);
        fs.writeFileSync(tempFile, audioBuffer);

        console.log(`[FPT.AI] Saved temp audio: ${tempFile} (${audioBuffer.length} bytes, mime: ${baseMime})`);

        const filesToCleanup: string[] = [tempFile];

        try {
            let fileToSend = tempFile;

            if (!FPT_SUPPORTED_FORMATS.includes(baseMime)) {
                console.log(`[FPT.AI] Format ${baseMime} not supported, converting to WAV...`);

                if (!checkFfmpeg()) {
                    return {
                        success: false,
                        text: '',
                        duration: (Date.now() - startTime) / 1000,
                        provider: 'fpt',
                        model: 'fpt-asr',
                        error: `Format ${baseMime} không được FPT.AI hỗ trợ và ffmpeg không khả dụng.`,
                    };
                }

                const wavFile = path.join(tempDir, `fpt_stt_${Date.now()}_converted.wav`);
                const converted = convertToWav(tempFile, wavFile);

                if (!converted) {
                    return {
                        success: false,
                        text: '',
                        duration: (Date.now() - startTime) / 1000,
                        provider: 'fpt',
                        model: 'fpt-asr',
                        error: 'Không thể convert audio sang WAV.',
                    };
                }

                filesToCleanup.push(wavFile);
                fileToSend = wavFile;

                const wavSize = fs.statSync(wavFile).size;
                console.log(`[FPT.AI] Converted to WAV: ${wavSize} bytes`);
            }

            // FPT.AI uses -T (upload) with api_key header
            const audioData = fs.readFileSync(fileToSend);

            console.log(`[FPT.AI] Sending to ${FPT_STT_URL} (${audioData.length} bytes)`);

            const response = await axios.post<FPTSTTResponse>(
                FPT_STT_URL,
                audioData,
                {
                    headers: {
                        'api_key': FPT_STT_API_KEY,
                        'Content-Type': 'application/octet-stream',
                    },
                    timeout: 30000,
                }
            );

            const duration = (Date.now() - startTime) / 1000;

            console.log(`[FPT.AI] Response:`, JSON.stringify(response.data).substring(0, 500));

            if (response.data?.status === 0) {
                // Success — extract and clean text
                const rawText = (response.data.hypotheses || [])
                    .map(h => h.utterance)
                    .filter(Boolean)
                    .join(' ')
                    .trim();
                const text = cleanFPTText(rawText);

                console.log(`[FPT.AI] Transcribed in ${duration.toFixed(2)}s: "${text.substring(0, 80)}"`);

                return {
                    success: !!text,
                    text,
                    duration,
                    provider: 'fpt',
                    model: 'fpt-asr',
                    ...(text ? {} : { error: 'FPT.AI trả về text rỗng - audio quá ngắn hoặc không nhận được giọng nói' }),
                };
            } else {
                // Error: status 1=no voice, 2=canceled, 9=system busy
                const statusMessages: Record<number, string> = {
                    1: 'Không phát hiện giọng nói trong audio',
                    2: 'Yêu cầu bị hủy',
                    9: 'Hệ thống FPT.AI đang bận, vui lòng thử lại',
                };
                const errorMsg = response.data?.message || statusMessages[response.data?.status] || 'Unknown FPT.AI error';
                console.error(`[FPT.AI] API error (status ${response.data?.status}): ${errorMsg}`);
                return {
                    success: false,
                    text: '',
                    duration,
                    provider: 'fpt',
                    model: 'fpt-asr',
                    error: errorMsg,
                };
            }
        } finally {
            for (const f of filesToCleanup) {
                try { fs.unlinkSync(f); } catch { }
            }
        }
    } catch (error: any) {
        const duration = (Date.now() - startTime) / 1000;
        console.error(`[FPT.AI] Transcription failed (${duration.toFixed(2)}s):`, error.message);

        let errorMessage = error.message;
        if (error.response?.status === 401 || error.response?.status === 403) {
            errorMessage = 'API Key không hợp lệ. Kiểm tra FPT_STT_API_KEY trong .env';
        } else if (error.response?.status === 400) {
            errorMessage = `FPT.AI trả lỗi 400: ${error.response?.data?.message || 'Dữ liệu không hợp lệ'}`;
        }

        return {
            success: false,
            text: '',
            duration,
            provider: 'fpt',
            model: 'fpt-asr',
            error: errorMessage,
        };
    }
};

/**
 * One-shot: Audio → Text (cho Voice Form)
 * Gửi audio qua FPT.AI STT, trả raw text — client-side parse date/time/enum
 */
export const transcribeAndParseShortAudio = async (
    audioBase64: string,
    mimeType: string,
    fieldInfo: { name: string; type: string; label: string; enumValues?: { label: string; value: string }[] }
): Promise<TranscribeResult> => {
    const sttResult = await transcribeShortAudio(audioBase64, mimeType);
    if (!sttResult.success || !sttResult.text) {
        return sttResult;
    }

    console.log(`[FPT.AI] Returning raw text for client-side parsing: "${sttResult.text}"`);
    return {
        ...sttResult,
        parsedValue: sttResult.text,
    };
};

// ==================== Long Audio (Meeting Transcription) ====================

export const transcribeLongAudio = async (
    filePath: string,
    language: string = 'vi'
): Promise<TranscribeResult> => {
    if (!FPT_STT_API_KEY) {
        return {
            success: false,
            text: '',
            provider: 'fpt',
            model: 'fpt-asr',
            error: 'FPT_STT_API_KEY not configured. Get key at https://console.fpt.ai'
        };
    }

    const startTime = Date.now();
    const filesToCleanup: string[] = [];

    try {
        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                text: '',
                provider: 'fpt',
                model: 'fpt-asr',
                error: `Audio file not found: ${filePath}`
            };
        }

        let fileToSend = filePath;
        const ext = path.extname(filePath).toLowerCase();
        const unsupportedExts = ['.webm', '.ogg', '.opus'];

        if (unsupportedExts.includes(ext)) {
            console.log(`[FPT.AI] Long audio format ${ext} not supported, converting to WAV...`);
            if (checkFfmpeg()) {
                const wavFile = filePath.replace(/\.[^.]+$/, '_fpt_converted.wav');
                if (convertToWav(filePath, wavFile)) {
                    filesToCleanup.push(wavFile);
                    fileToSend = wavFile;
                    console.log(`[FPT.AI] Converted long audio to WAV: ${fs.statSync(wavFile).size} bytes`);
                }
            }
        }

        const audioData = fs.readFileSync(fileToSend);

        const response = await axios.post<FPTSTTResponse>(
            FPT_STT_URL,
            audioData,
            {
                headers: {
                    'api_key': FPT_STT_API_KEY,
                    'Content-Type': 'application/octet-stream',
                },
                timeout: 600000,
            }
        );

        const duration = (Date.now() - startTime) / 1000;

        console.log(`[FPT.AI] Long response:`, JSON.stringify(response.data).substring(0, 500));

        if (response.data?.status === 0) {
            const rawText = (response.data.hypotheses || [])
                .map(h => h.utterance)
                .filter(Boolean)
                .join(' ')
                .trim();
            const text = cleanFPTText(rawText);

            console.log(`[FPT.AI] Long transcription completed in ${duration.toFixed(2)}s (${text.length} chars)`);

            return {
                success: !!text,
                text,
                duration,
                provider: 'fpt',
                model: 'fpt-asr',
                ...(text ? {} : { error: 'FPT.AI trả về text rỗng' }),
            };
        } else {
            const errorMsg = response.data?.message || 'Unknown FPT.AI error';
            return {
                success: false,
                text: '',
                duration,
                provider: 'fpt',
                model: 'fpt-asr',
                error: errorMsg,
            };
        }
    } catch (error: any) {
        const duration = (Date.now() - startTime) / 1000;
        console.error(`[FPT.AI] Long transcription failed (${duration.toFixed(2)}s):`, error.message);
        return {
            success: false,
            text: '',
            duration,
            provider: 'fpt',
            model: 'fpt-asr',
            error: error.message,
        };
    } finally {
        for (const f of filesToCleanup) {
            try { fs.unlinkSync(f); } catch { }
        }
    }
};
