/**
 * Viettel AI Speech-to-Text Service
 * Sử dụng API ASR của Viettel AI (https://viettelai.vn/asr/recognize)
 * Chuyển đổi giọng nói tiếng Việt thành văn bản
 * 
 * API Docs: https://viettelai.vn/tai-lieu
 * Token: Lấy tại https://viettelai.vn/dashboard/token
 * 
 * @author TBU AI Team
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ==================== Configuration ====================

const VIETTEL_STT_URL = process.env.VIETTEL_STT_URL || 'https://viettelai.vn/asr/recognize';
const VIETTEL_STT_TOKEN = process.env.VIETTEL_STT_TOKEN || '';

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

interface ViettelSTTResponse {
    code: number;
    message: string;
    response: {
        text?: string;
        result?: Array<{ transcript: string; confidence?: number; [key: string]: any }> | string;
        [key: string]: any;
    };
}

/**
 * Trích xuất text từ Viettel AI response
 * Viettel AI trả về: {response: {result: [{transcript: "..."}]}}
 */
const extractTextFromResponse = (data: ViettelSTTResponse): string => {
    const resp = data?.response;
    if (!resp) return '';

    // Case 1: response.result là array (format thực tế từ Viettel AI)
    if (Array.isArray(resp.result)) {
        return resp.result
            .map((r: any) => r.transcript || '')
            .filter(Boolean)
            .join(' ')
            .trim();
    }

    // Case 2: response.text là string
    if (typeof resp.text === 'string') return resp.text;

    // Case 3: response.result là string
    if (typeof resp.result === 'string') return resp.result;

    // Case 4: response là string
    if (typeof resp === 'string') return resp;

    return '';
};

// ==================== Audio Conversion ====================

/**
 * Trích xuất base mimeType (bỏ codec params)
 * Ví dụ: 'audio/webm;codecs=opus' → 'audio/webm'
 */
const getBaseMimeType = (mimeType: string): string => {
    return mimeType.split(';')[0].trim().toLowerCase();
};

/**
 * Kiểm tra ffmpeg có sẵn không
 */
let ffmpegAvailable: boolean | null = null;
const checkFfmpeg = (): boolean => {
    if (ffmpegAvailable !== null) return ffmpegAvailable;
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        ffmpegAvailable = true;
        console.log('[ViettelSTT] ffmpeg is available for audio conversion');
    } catch {
        ffmpegAvailable = false;
        console.warn('[ViettelSTT] ffmpeg not found - audio conversion unavailable. Install ffmpeg for webm/ogg support.');
    }
    return ffmpegAvailable;
};

/**
 * Các format mà Viettel AI ASR hỗ trợ trực tiếp
 */
const VIETTEL_SUPPORTED_FORMATS = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a'];

/**
 * Convert audio file sang WAV sử dụng ffmpeg
 * Trả về path đến file WAV mới (cần cleanup sau)
 */
const convertToWav = (inputPath: string, outputPath: string): boolean => {
    try {
        // -y: overwrite, -i: input, -ar 16000: 16kHz sample rate, -ac 1: mono, -acodec pcm_s16le: PCM 16-bit
        execSync(
            `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -acodec pcm_s16le "${outputPath}"`,
            { stdio: 'pipe', timeout: 30000 }
        );
        return fs.existsSync(outputPath);
    } catch (error: any) {
        console.error('[ViettelSTT] ffmpeg conversion failed:', error.message);
        return false;
    }
};

// ==================== Health Check ====================

/**
 * Kiểm tra Viettel AI STT khả dụng
 * Chỉ cần kiểm tra token có được cấu hình không
 */
export const checkViettelSTTHealth = async (): Promise<boolean> => {
    try {
        if (!VIETTEL_STT_TOKEN) {
            console.warn('[ViettelSTT] Token not configured');
            return false;
        }
        // Viettel AI không có health endpoint riêng, chỉ check token exists
        return true;
    } catch (error: any) {
        console.error('[ViettelSTT] Health check failed:', error.message);
        return false;
    }
};

/**
 * Kiểm tra Viettel AI STT token có sẵn không
 */
export const checkViettelAvailable = (): boolean => {
    return !!VIETTEL_STT_TOKEN && VIETTEL_STT_TOKEN.length > 10;
};

// ==================== Short Audio (Voice Form) ====================

/**
 * Transcribe audio ngắn (Voice Form)
 * Gửi file audio lên Viettel AI ASR endpoint
 */
export const transcribeShortAudio = async (
    audioBase64: string,
    mimeType: string = 'audio/webm'
): Promise<TranscribeResult> => {
    if (!VIETTEL_STT_TOKEN) {
        return {
            success: false,
            text: '',
            provider: 'viettel',
            model: 'viettel-asr',
            error: 'VIETTEL_STT_TOKEN not configured. Get token at https://viettelai.vn/dashboard/token'
        };
    }

    const startTime = Date.now();

    try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioBase64, 'base64');

        // Trích xuất base mimeType (bỏ codec params như ;codecs=opus)
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

        // Write to temp file
        const tempDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempFile = path.join(tempDir, `viettel_stt_${Date.now()}.${ext}`);
        fs.writeFileSync(tempFile, audioBuffer);
        
        console.log(`[ViettelSTT] Saved temp audio: ${tempFile} (${audioBuffer.length} bytes, mime: ${baseMime})`);

        // Danh sách files cần cleanup
        const filesToCleanup: string[] = [tempFile];

        try {
            // Kiểm tra xem format có cần convert không
            let fileToSend = tempFile;
            let sendMimeType = baseMime;
            let sendFilename = `audio.${ext}`;

            if (!VIETTEL_SUPPORTED_FORMATS.includes(baseMime)) {
                // Cần convert sang WAV (webm, ogg không được Viettel AI hỗ trợ)
                console.log(`[ViettelSTT] Format ${baseMime} not supported by Viettel AI, converting to WAV...`);
                
                if (!checkFfmpeg()) {
                    return {
                        success: false,
                        text: '',
                        duration: (Date.now() - startTime) / 1000,
                        provider: 'viettel',
                        model: 'viettel-asr',
                        error: `Format ${baseMime} không được Viettel AI hỗ trợ và ffmpeg không khả dụng để convert. Cài ffmpeg hoặc dùng format wav/mp3.`,
                    };
                }

                const wavFile = path.join(tempDir, `viettel_stt_${Date.now()}_converted.wav`);
                const converted = convertToWav(tempFile, wavFile);
                
                if (!converted) {
                    return {
                        success: false,
                        text: '',
                        duration: (Date.now() - startTime) / 1000,
                        provider: 'viettel',
                        model: 'viettel-asr',
                        error: 'Không thể convert audio sang WAV. Kiểm tra file audio đầu vào.',
                    };
                }

                filesToCleanup.push(wavFile);
                fileToSend = wavFile;
                sendMimeType = 'audio/wav';
                sendFilename = 'audio.wav';
                
                const wavSize = fs.statSync(wavFile).size;
                console.log(`[ViettelSTT] Converted to WAV: ${wavSize} bytes`);
            }

            const form = new FormData();
            form.append('file', fs.createReadStream(fileToSend), {
                filename: sendFilename,
                contentType: sendMimeType
            });
            form.append('token', VIETTEL_STT_TOKEN);

            console.log(`[ViettelSTT] Sending to ${VIETTEL_STT_URL} (file: ${sendFilename}, mime: ${sendMimeType})`);

            const response = await axios.post<ViettelSTTResponse>(
                VIETTEL_STT_URL,
                form,
                {
                    headers: {
                        ...form.getHeaders(),
                        'accept': '*/*',
                    },
                    timeout: 30000,
                }
            );

            const duration = (Date.now() - startTime) / 1000;

            console.log(`[ViettelSTT] Response status: ${response.status}, body:`, JSON.stringify(response.data).substring(0, 500));

            // Xử lý response từ Viettel AI
            if (response.data?.code === 200 || response.status === 200) {
                const text = extractTextFromResponse(response.data);

                console.log(`[ViettelSTT] Transcribed in ${duration.toFixed(2)}s: "${text.substring(0, 80)}"`);

                return {
                    success: !!text,
                    text,
                    duration,
                    provider: 'viettel',
                    model: 'viettel-asr',
                    ...(text ? {} : { error: 'Viettel AI trả về text rỗng - có thể audio quá ngắn hoặc không nhận được giọng nói' }),
                };
            } else {
                const errorMsg = response.data?.message || 'Unknown Viettel AI error';
                console.error(`[ViettelSTT] API error (code ${response.data?.code}): ${errorMsg}`);
                return {
                    success: false,
                    text: '',
                    duration,
                    provider: 'viettel',
                    model: 'viettel-asr',
                    error: errorMsg,
                };
            }
        } finally {
            // Clean up all temp files
            for (const f of filesToCleanup) {
                try { fs.unlinkSync(f); } catch { }
            }
        }
    } catch (error: any) {
        const duration = (Date.now() - startTime) / 1000;
        console.error(`[ViettelSTT] Transcription failed (${duration.toFixed(2)}s):`, error.message);
        if (error.response?.data) {
            console.error(`[ViettelSTT] Response body:`, JSON.stringify(error.response.data).substring(0, 500));
        }

        // Xử lý lỗi HTTP cụ thể
        let errorMessage = error.message;
        if (error.response?.status === 401) {
            errorMessage = 'Token không hợp lệ. Kiểm tra VIETTEL_STT_TOKEN trong .env';
        } else if (error.response?.status === 403) {
            errorMessage = 'Không có quyền truy cập. Kiểm tra token tại https://viettelai.vn/dashboard/token';
        } else if (error.response?.status === 400) {
            const detail = error.response?.data?.message || error.response?.data?.error || '';
            errorMessage = `Viettel AI trả lỗi 400: ${detail || 'Dữ liệu đầu vào không hợp lệ'}`;
        }

        return {
            success: false,
            text: '',
            duration,
            provider: 'viettel',
            model: 'viettel-asr',
            error: errorMessage,
        };
    }
};

/**
 * One-shot: Audio → Text (cho Voice Form)
 * Gửi audio qua Viettel AI STT, trả raw text — client-side parse date/time/enum
 */
export const transcribeAndParseShortAudio = async (
    audioBase64: string,
    mimeType: string,
    fieldInfo: { name: string; type: string; label: string; enumValues?: { label: string; value: string }[] }
): Promise<TranscribeResult> => {
    // Transcribe bằng Viettel AI — trả raw text, parse ở client-side
    // Không gọi Pollinations LLM (chậm ~3-4s, hay cắt mất text)
    const sttResult = await transcribeShortAudio(audioBase64, mimeType);
    if (!sttResult.success || !sttResult.text) {
        return sttResult;
    }

    console.log(`[ViettelSTT] Returning raw text for client-side parsing: "${sttResult.text}"`);
    return {
        ...sttResult,
        parsedValue: sttResult.text,
    };
};

// ==================== Long Audio (Meeting Transcription) ====================

/**
 * Transcribe audio dài (Meeting Transcription)
 * Viettel AI ASR hỗ trợ file audio lớn
 */
export const transcribeLongAudio = async (
    filePath: string,
    language: string = 'vi'
): Promise<TranscribeResult> => {
    if (!VIETTEL_STT_TOKEN) {
        return {
            success: false,
            text: '',
            provider: 'viettel',
            model: 'viettel-asr',
            error: 'VIETTEL_STT_TOKEN not configured. Get token at https://viettelai.vn/dashboard/token'
        };
    }

    const startTime = Date.now();

    const filesToCleanup: string[] = [];

    try {
        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                text: '',
                provider: 'viettel',
                model: 'viettel-asr',
                error: `Audio file not found: ${filePath}`
            };
        }

        // Kiểm tra format file - convert nếu cần
        let fileToSend = filePath;
        const ext = path.extname(filePath).toLowerCase();
        const unsupportedExts = ['.webm', '.ogg', '.opus'];
        
        if (unsupportedExts.includes(ext)) {
            console.log(`[ViettelSTT] Long audio format ${ext} not supported, converting to WAV...`);
            if (checkFfmpeg()) {
                const wavFile = filePath.replace(/\.[^.]+$/, '_converted.wav');
                if (convertToWav(filePath, wavFile)) {
                    filesToCleanup.push(wavFile);
                    fileToSend = wavFile;
                    console.log(`[ViettelSTT] Converted long audio to WAV: ${fs.statSync(wavFile).size} bytes`);
                } else {
                    console.warn('[ViettelSTT] WAV conversion failed, trying original file...');
                }
            } else {
                console.warn('[ViettelSTT] ffmpeg not available, trying original file...');
            }
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(fileToSend));
        form.append('token', VIETTEL_STT_TOKEN);

        const response = await axios.post<ViettelSTTResponse>(
            VIETTEL_STT_URL,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'accept': '*/*',
                },
                timeout: 600000, // 10 min for long audio
            }
        );

        const duration = (Date.now() - startTime) / 1000;

        console.log(`[ViettelSTT] Long response status: ${response.status}, body:`, JSON.stringify(response.data).substring(0, 500));

        if (response.data?.code === 200 || response.status === 200) {
            const text = extractTextFromResponse(response.data);

            console.log(`[ViettelSTT] Long transcription completed in ${duration.toFixed(2)}s (${text.length} chars)`);

            return {
                success: !!text,
                text,
                duration,
                provider: 'viettel',
                model: 'viettel-asr',
                ...(text ? {} : { error: 'Viettel AI trả về text rỗng' }),
            };
        } else {
            const errorMsg = response.data?.message || 'Unknown Viettel AI error';
            console.error(`[ViettelSTT] Long transcription API error: ${errorMsg}`);
            return {
                success: false,
                text: '',
                duration,
                provider: 'viettel',
                model: 'viettel-asr',
                error: errorMsg,
            };
        }
    } catch (error: any) {
        const duration = (Date.now() - startTime) / 1000;
        console.error(`[ViettelSTT] Long transcription failed (${duration.toFixed(2)}s):`, error.message);
        if (error.response?.data) {
            console.error(`[ViettelSTT] Response body:`, JSON.stringify(error.response.data).substring(0, 500));
        }
        return {
            success: false,
            text: '',
            duration,
            provider: 'viettel',
            model: 'viettel-asr',
            error: error.message,
        };
    } finally {
        for (const f of filesToCleanup) {
            try { fs.unlinkSync(f); } catch { }
        }
    }
};
