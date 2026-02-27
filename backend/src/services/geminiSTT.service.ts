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
  parsedValue?: string;
}

export interface FieldInfo {
  name: string;
  type: 'date' | 'time' | 'string' | 'array' | 'enum';
  label: string;
  enumValues?: { label: string; value: string }[];
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

// Singleton cache để không tạo lại client/model mỗi lần gọi
let _geminiClient: GoogleGenerativeAI | null = null;
const _modelCache: Map<string, any> = new Map();

/**
 * Khởi tạo Gemini client (singleton - chỉ tạo 1 lần)
 */
const getGeminiClient = () => {
  if (_geminiClient) return _geminiClient;
  if (!GEMINI_API_KEY) {
    throw new AppError(500, 'CONFIG_ERROR', 'GEMINI_API_KEY is not configured');
  }
  _geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  return _geminiClient;
};

/**
 * Lấy model instance từ cache (tránh tạo lại mỗi request)
 */
const getCachedModel = (modelName: string, maxOutputTokens: number = 500) => {
  const cacheKey = `${modelName}_${maxOutputTokens}`;
  if (_modelCache.has(cacheKey)) return _modelCache.get(cacheKey);
  
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: modelName,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens,
    }
  });
  _modelCache.set(cacheKey, model);
  return model;
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
      
      const model = getCachedModel(modelName, 500);
      
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
 * Transcribe + Parse audio ngắn trực tiếp thành giá trị chuẩn (Gemini one-shot)
 * Kết hợp STT + parsing trong 1 lần gọi Gemini duy nhất
 * Dùng cho Voice Form khi chọn provider = gemini
 */
export const transcribeAndParseShortAudio = async (
  audioBase64: string,
  mimeType: string = 'audio/webm',
  fieldInfo: FieldInfo
): Promise<TranscribeResult> => {
  const startTime = Date.now();

  let enumIds = '';
  if (fieldInfo.type === 'enum' && fieldInfo.enumValues) {
    enumIds = fieldInfo.enumValues.map(e => `"${e.value}" (${e.label})`).join(', ');
  }

  const fieldPrompt = buildFieldParsingPrompt(fieldInfo, enumIds);

  const modelsToTry = [GEMINI_MODEL, ...AUDIO_CAPABLE_MODELS.filter(m => m !== GEMINI_MODEL)];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[GeminiSTT] Transcribe+Parse with ${modelName} for field "${fieldInfo.name}"...`);

      const model = getCachedModel(modelName, 500);

      const result = await model.generateContent([
        fieldPrompt,
        {
          inlineData: {
            mimeType,
            data: audioBase64
          }
        }
      ]);

      const response = await result.response;
      const rawOutput = response.text()?.trim() || '';
      const duration = (Date.now() - startTime) / 1000;

      console.log(`[GeminiSTT] ✅ Transcribe+Parse done with ${modelName} in ${duration.toFixed(2)}s → "${rawOutput}"`);

      // Clean up Gemini output
      let parsedValue = rawOutput
        .replace(/```json|```/g, '')
        .replace(/^["']|["']$/g, '')
        .trim();

      // Validate output based on field type
      if (parsedValue.toLowerCase() === 'null' || parsedValue === '' || parsedValue === '""') {
        parsedValue = '';
      }

      return {
        success: true,
        text: rawOutput,
        parsedValue,
        duration,
        provider: 'gemini',
        model: modelName
      };

    } catch (error: any) {
      console.warn(`[GeminiSTT] Model ${modelName} failed:`, error.message);
      lastError = error;
      continue;
    }
  }

  return {
    success: false,
    text: '',
    parsedValue: '',
    duration: (Date.now() - startTime) / 1000,
    provider: 'gemini',
    model: GEMINI_MODEL,
    error: lastError?.message || 'All Gemini models failed'
  };
};

/**
 * Build prompt cho Gemini để vừa phiên âm audio vừa parse thành giá trị chuẩn
 */
function buildFieldParsingPrompt(fieldInfo: FieldInfo, enumIds: string): string {
  const typeRules: Record<string, string> = {
    date: `Xuất ra định dạng YYYY-MM-DD. Năm hiện tại ${new Date().getFullYear()} nếu không nói rõ năm.\nVí dụ: "ngày mười lăm tháng sáu" → 2026-06-15`,
    time: `Xuất ra định dạng HH:mm (24 giờ).\nVí dụ: "tám giờ sáng" → 08:00, "hai giờ chiều" → 14:00, "tám rưỡi" → 08:30`,
    string: `Xuất ra văn bản đã chuẩn hóa. Viết hoa tên riêng. Nếu là mã phòng, chuẩn hóa: "ép hai linh tám" → F208, "hờ một linh một" → H101.`,
    array: `Xuất ra danh sách ngăn cách bằng dấu phẩy. Ví dụ: "Ban giám hiệu, Phòng Đào tạo, Phòng CNTT"`,
    enum: `CHỈ trả về một trong các ID sau: ${enumIds}. Ví dụ: nói "cuộc họp" → trả về cuoc_hop`
  };

  return `BẠN LÀ BỘ PHIÊN ÂM + CHUẨN HÓA DỮ LIỆU cho hệ thống lịch công tác Trường Đại học Thái Bình.

NHIỆM VỤ: Nghe audio tiếng Việt, phiên âm VÀ chuyển thành GIÁ TRỊ CHUẨN cho trường "${fieldInfo.label}" (${fieldInfo.name}).

KIỂU DỮ LIỆU: ${fieldInfo.type}
QUY TẮC:
${typeRules[fieldInfo.type] || typeRules.string}

XỬ LÝ TIẾNG VIỆT:
- Ghép số rời rạc: "hai không hai sáu" → 2026, "một năm" → 15
- Chuyển chữ số: "tám" → 8, "mười lăm" → 15, "linh/lẻ" → 0
- Loại bỏ từ thừa: "ờ, à, ừm, xong, hết, kết thúc, giúp tôi"
- Viết hoa tên riêng và tên đơn vị

TỪ ĐIỂN ĐƠN VỊ TBU:
- Đào tạo → Phòng Đào tạo
- Hành chính/Tổng hợp → Phòng Hành chính - Tổng hợp
- Kế hoạch/Tài chính → Phòng Kế hoạch - Tài chính
- Tổ chức cán bộ → Phòng Tổ chức cán bộ

NGUYÊN TẮC VÀNG: CHỈ TRẢ VỀ GIÁ TRỊ THUẦN. KHÔNG giải thích, KHÔNG thêm chữ, KHÔNG bọc ngoặc kép.
Nếu không hiểu được audio → trả về chuỗi rỗng.`;
}

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
    const model = getCachedModel(GEMINI_MODEL, 8192);
    
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
    
    const model = getCachedModel(GEMINI_MODEL, 8192);
    
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
    const model = getCachedModel(GEMINI_MODEL, 10);
    
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
