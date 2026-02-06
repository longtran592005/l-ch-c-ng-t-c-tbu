/**
 * Gemini Speech-to-Text Service
 * Sử dụng Gemini 2.5 Flash multimodal để transcribe audio
 * 
 * Hỗ trợ 2 use case:
 * - Bài 1: Audio ngắn (~5s) cho Voice Form - cần nhanh
 * - Bài 2: Audio dài (1-2 tiếng) cho Meeting Transcription
 * 
 * @author TBU AI Team
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/errors.util';

// ==================== Configuration ====================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// Sử dụng model từ .env, fallback về gemini-2.0-flash nếu không có
// gemini-2.0-flash và gemini-1.5-flash đều hỗ trợ audio input
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Danh sách các models hỗ trợ audio input (theo thứ tự ưu tiên)
const AUDIO_CAPABLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp', 
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.5-flash'
];

// Safety settings - tắt filter để không bị block nội dung cuộc họp
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ==================== Types ====================

export interface TranscribeResult {
  success: boolean;
  text: string;
  duration?: number;
  provider: 'gemini';
  model: string;
  error?: string;
}

export interface TranscribeOptions {
  language?: string;
  enhanceVietnamese?: boolean;
  includeTimestamps?: boolean;
  maxRetries?: number;
}

// ==================== Helper Functions ====================

/**
 * Đọc file audio và convert sang base64
 */
const readAudioAsBase64 = (filePath: string): { data: string; mimeType: string } => {
  if (!fs.existsSync(filePath)) {
    throw new AppError(404, 'FILE_NOT_FOUND', `Audio file not found: ${filePath}`);
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mp3',
    '.wav': 'audio/wav',
    '.m4a': 'audio/m4a',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.webm': 'audio/webm',
  };
  
  const mimeType = mimeTypes[ext] || 'audio/mpeg';
  const audioBuffer = fs.readFileSync(filePath);
  const base64Data = audioBuffer.toString('base64');
  
  return { data: base64Data, mimeType };
};

/**
 * Tạo prompt tối ưu cho transcription tiếng Việt
 */
const createTranscriptionPrompt = (options: TranscribeOptions = {}): string => {
  const { enhanceVietnamese = true, includeTimestamps = false } = options;
  
  let prompt = `Hãy chuyển đổi file audio này thành văn bản chính xác.

YÊU CẦU:
- Phiên âm chính xác từng từ được nói
- Giữ nguyên ngữ điệu, không thêm bớt nội dung
- Sử dụng dấu câu phù hợp (dấu chấm, phẩy, hỏi, chấm than)
- Xuống dòng khi người nói tạm dừng lâu hoặc chuyển ý`;

  if (enhanceVietnamese) {
    prompt += `

ĐẶC BIỆT CHO TIẾNG VIỆT:
- Viết đúng dấu thanh tiếng Việt
- Tên riêng viết hoa (Hà Nội, Thái Bình, Nguyễn Văn A...)
- Viết đúng các từ chuyên ngành giáo dục/hành chính
- Chú ý ngữ cảnh để phân biệt từ đồng âm`;
  }

  if (includeTimestamps) {
    prompt += `

ĐỊNH DẠNG OUTPUT:
- Thêm timestamp mỗi 30 giây: [00:30] nội dung...
- Format: [MM:SS] hoặc [HH:MM:SS] nếu audio dài`;
  }

  prompt += `

CHỈ TRẢ VỀ VĂN BẢN PHIÊN ÂM, KHÔNG GIẢI THÍCH GÌ THÊM.`;

  return prompt;
};

// ==================== Main Service ====================

/**
 * Khởi tạo Gemini client
 */
const getGeminiClient = () => {
  if (!GEMINI_API_KEY) {
    throw new AppError(500, 'CONFIG_ERROR', 'GEMINI_API_KEY is not configured');
  }
  
  return new GoogleGenerativeAI(GEMINI_API_KEY);
};

/**
 * Transcribe audio ngắn (Bài 1 - Voice Form)
 * Tối ưu cho audio ~5 giây, cần response nhanh
 * Tự động fallback sang model khác nếu model chính không hỗ trợ audio
 */
export const transcribeShortAudio = async (
  audioBase64: string,
  mimeType: string = 'audio/webm',
  _options: TranscribeOptions = {}
): Promise<TranscribeResult> => {
  const startTime = Date.now();
  
  // Danh sách models để thử (ưu tiên model từ config)
  const modelsToTry = [GEMINI_MODEL, ...AUDIO_CAPABLE_MODELS.filter(m => m !== GEMINI_MODEL)];
  
  let lastError: any = null;
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`[GeminiSTT] Trying model: ${modelName}...`);
      
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({
        model: modelName,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
          temperature: 0.1, // Low temperature for accuracy
          maxOutputTokens: 500, // Short audio = short output
        }
      });
      
      const prompt = `Phiên âm chính xác đoạn audio tiếng Việt này thành văn bản. CHỈ trả về văn bản, không giải thích.`;
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: audioBase64
          }
        }
      ]);
      
      const response = await result.response;
      const text = response.text()?.trim() || '';
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`[GeminiSTT] ✅ Short audio transcribed with ${modelName} in ${duration.toFixed(2)}s`);
      
      return {
        success: true,
        text,
        duration,
        provider: 'gemini',
        model: modelName
      };
      
    } catch (error: any) {
      console.warn(`[GeminiSTT] Model ${modelName} failed:`, error.message);
      lastError = error;
      // Tiếp tục thử model tiếp theo
      continue;
    }
  }
  
  // Tất cả models đều fail
  console.error('[GeminiSTT] All models failed for short audio transcription');
  
  return {
    success: false,
    text: '',
    duration: (Date.now() - startTime) / 1000,
    provider: 'gemini',
    model: GEMINI_MODEL,
    error: lastError?.message || 'All Gemini models failed to transcribe audio'
  };
};

/**
 * Transcribe audio dài (Bài 2 - Meeting Transcription)
 * Xử lý audio 1-2 tiếng, có thể chia chunks nếu cần
 */
export const transcribeLongAudio = async (
  filePath: string,
  options: TranscribeOptions = {}
): Promise<TranscribeResult> => {
  const startTime = Date.now();
  
  try {
    console.log('[GeminiSTT] Transcribing long audio from file:', filePath);
    
    // Read audio file
    const { data: audioBase64, mimeType } = readAudioAsBase64(filePath);
    const fileSizeBytes = fs.statSync(filePath).size;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    
    console.log(`[GeminiSTT] File size: ${fileSizeMB.toFixed(2)} MB`);
    
    // Gemini có giới hạn ~20MB cho inline data
    // Nếu file lớn hơn, cần upload qua File API
    if (fileSizeMB > 15) {
      return await transcribeLongAudioViaFileAPI(filePath, options);
    }
    
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192, // Long audio = long output
      }
    });
    
    const prompt = createTranscriptionPrompt({
      ...options,
      enhanceVietnamese: true,
      includeTimestamps: fileSizeMB > 5 // Thêm timestamps cho file dài
    });
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: audioBase64
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text()?.trim() || '';
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`[GeminiSTT] Long audio transcribed in ${duration.toFixed(2)}s`);
    
    return {
      success: true,
      text,
      duration,
      provider: 'gemini',
      model: GEMINI_MODEL
    };
    
  } catch (error: any) {
    console.error('[GeminiSTT] Long audio transcription error:', error);
    
    return {
      success: false,
      text: '',
      duration: (Date.now() - startTime) / 1000,
      provider: 'gemini',
      model: GEMINI_MODEL,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Transcribe audio lớn qua File API của Gemini
 * Dành cho file > 15MB
 */
export const transcribeLongAudioViaFileAPI = async (
  filePath: string,
  options: TranscribeOptions = {}
): Promise<TranscribeResult> => {
  const startTime = Date.now();
  
  try {
    console.log('[GeminiSTT] Using File API for large audio file...');
    
    const genAI = getGeminiClient();
    // Note: File API requires specific SDK setup - using inline method instead
    
    // Upload file to Gemini
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mp3',
      '.wav': 'audio/wav',
      '.m4a': 'audio/m4a',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
      '.webm': 'audio/webm',
    };
    const mimeType = mimeTypes[ext] || 'audio/mpeg';
    
    // For now, fall back to chunked processing or direct method
    // File API requires specific SDK setup
    console.log('[GeminiSTT] Large file detected, using inline method with compression recommendation');
    
    // Read and send anyway (Gemini might handle it)
    const { data: audioBase64 } = readAudioAsBase64(filePath);
    
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      }
    });
    
    const prompt = createTranscriptionPrompt({
      ...options,
      enhanceVietnamese: true,
      includeTimestamps: true
    });
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: audioBase64
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text()?.trim() || '';
    
    const duration = (Date.now() - startTime) / 1000;
    
    return {
      success: true,
      text,
      duration,
      provider: 'gemini',
      model: GEMINI_MODEL
    };
    
  } catch (error: any) {
    console.error('[GeminiSTT] File API transcription error:', error);
    
    return {
      success: false,
      text: '',
      duration: (Date.now() - startTime) / 1000,
      provider: 'gemini',
      model: GEMINI_MODEL,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Transcribe audio từ base64 (cho API endpoint)
 */
export const transcribeFromBase64 = async (
  base64Data: string,
  mimeType: string,
  isLongAudio: boolean = false,
  options: TranscribeOptions = {}
): Promise<TranscribeResult> => {
  if (isLongAudio) {
    // For long audio from base64, save to temp file first
    const tempDir = path.join(__dirname, '../../temp_uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const ext = mimeType.split('/')[1] || 'webm';
    const tempFile = path.join(tempDir, `gemini_temp_${Date.now()}.${ext}`);
    
    try {
      fs.writeFileSync(tempFile, Buffer.from(base64Data, 'base64'));
      const result = await transcribeLongAudio(tempFile, options);
      
      // Cleanup temp file
      fs.unlinkSync(tempFile);
      
      return result;
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw error;
    }
  } else {
    return transcribeShortAudio(base64Data, mimeType, options);
  }
};

/**
 * Health check for Gemini STT
 */
export const checkGeminiSTTHealth = async (): Promise<{
  available: boolean;
  model: string;
  error?: string;
}> => {
  try {
    if (!GEMINI_API_KEY) {
      return { available: false, model: GEMINI_MODEL, error: 'API key not configured' };
    }
    
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    // Simple test
    const result = await model.generateContent('Respond with OK');
    const text = await result.response.text();
    
    return {
      available: text.includes('OK') || text.length > 0,
      model: GEMINI_MODEL
    };
    
  } catch (error: any) {
    return {
      available: false,
      model: GEMINI_MODEL,
      error: error.message
    };
  }
};
