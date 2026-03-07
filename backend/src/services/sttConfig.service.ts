/**
 * STT (Speech-to-Text) Configuration Service
 * Quản lý cấu hình provider cho 2 bài toán:
 * - Bài 1: Voice Form (realtime, audio ngắn ~5s)
 * - Bài 2: Meeting Transcription (audio dài 1-2 tiếng)
 * 
 * @author TBU AI Team
 */

import fs from 'fs';
import path from 'path';

// ==================== Types ====================

export type VoiceFormProvider = 'webspeech' | 'gemini' | 'pollinations' | 'viettel';
export type MeetingTranscriptionProvider = 'whisper' | 'gemini' | 'pollinations' | 'viettel';

export interface STTConfig {
  voiceForm: {
    provider: VoiceFormProvider;
    description: string;
  };
  meetingTranscription: {
    provider: MeetingTranscriptionProvider;
    description: string;
  };
}

export interface STTProviderInfo {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
}

// ==================== Constants ====================

const CONFIG_FILE_PATH = path.join(__dirname, '../../data/stt_config.json');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Provider info for UI display
export const VOICE_FORM_PROVIDERS: STTProviderInfo[] = [
  {
    id: 'webspeech',
    name: 'Web Speech API (Mặc định)',
    description: 'Sử dụng API trình duyệt - miễn phí, realtime',
    pros: ['Miễn phí hoàn toàn', 'Phản hồi realtime < 0.5s', 'Không cần server'],
    cons: ['Phụ thuộc trình duyệt', 'Cần kết nối internet', 'Độ chính xác phụ thuộc Google']
  },
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash (Cloud)',
    description: 'Gửi audio lên Google Gemini để phiên âm',
    pros: ['Độ chính xác cao', 'Hỗ trợ tiếng Việt tốt', 'Xử lý context thông minh'],
    cons: ['Có phí theo usage', 'Latency ~1-3s', 'Cần GEMINI_API_KEY']
  },
  {
    id: 'pollinations',
    name: 'Pollinations.ai Whisper (Cloud)',
    description: 'Sử dụng Whisper qua Pollinations.ai API - OpenAI compatible',
    pros: ['Whisper large-v3 chất lượng cao', 'Không cần GPU local', 'Hỗ trợ nhiều ngôn ngữ'],
    cons: ['Cần POLLINATIONS_API_KEY', 'Latency ~2-5s', 'Phụ thuộc dịch vụ bên ngoài']
  },
  {
    id: 'viettel',
    name: 'Viettel AI ASR (Cloud)',
    description: 'Sử dụng Viettel AI để nhận dạng giọng nói tiếng Việt',
    pros: ['Tối ưu cho tiếng Việt', 'Độ chính xác cao với giọng Việt', 'Dịch vụ trong nước, latency thấp'],
    cons: ['Cần VIETTEL_STT_TOKEN', 'Có phí theo usage', 'Chỉ hỗ trợ tiếng Việt']
  }
];

export const MEETING_TRANSCRIPTION_PROVIDERS: STTProviderInfo[] = [
  {
    id: 'whisper',
    name: 'Whisper VinAI (Mặc định)',
    description: 'Sử dụng model Whisper local - miễn phí, bảo mật',
    pros: ['Miễn phí hoàn toàn', 'Dữ liệu không ra ngoài', 'Tối ưu tiếng Việt'],
    cons: ['Cần GPU mạnh', 'Thời gian xử lý dài hơn', 'Chiếm tài nguyên máy']
  },
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash (Cloud)',
    description: 'Gửi audio lên Google Gemini để phiên âm',
    pros: ['Tốc độ nhanh', 'Không cần GPU', 'Độ chính xác cao'],
    cons: ['Có phí theo usage', 'Giới hạn file size', 'Dữ liệu qua cloud']
  },
  {
    id: 'pollinations',
    name: 'Pollinations.ai Whisper (Cloud)',
    description: 'Sử dụng Whisper large-v3 qua Pollinations.ai',
    pros: ['Whisper large-v3 chính xác', 'Không cần GPU', 'Hỗ trợ file dài'],
    cons: ['Cần POLLINATIONS_API_KEY', 'Dữ liệu qua cloud', 'Phụ thuộc dịch vụ ngoài']
  },
  {
    id: 'viettel',
    name: 'Viettel AI ASR (Cloud)',
    description: 'Sử dụng Viettel AI để chuyển đổi ghi âm cuộc họp thành văn bản',
    pros: ['Tối ưu cho tiếng Việt', 'Dịch vụ trong nước', 'Phù hợp audio tiếng Việt dài'],
    cons: ['Cần VIETTEL_STT_TOKEN', 'Có phí theo usage', 'Chỉ hỗ trợ tiếng Việt']
  }
];

// Default configuration
const DEFAULT_CONFIG: STTConfig = {
  voiceForm: {
    provider: 'webspeech',
    description: 'Sử dụng Web Speech API cho điền form nhanh'
  },
  meetingTranscription: {
    provider: 'whisper',
    description: 'Sử dụng Whisper VinAI cho ghi âm cuộc họp dài'
  }
};

// ==================== Service Functions ====================

/**
 * Đọc cấu hình STT từ file
 */
export const getSTTConfig = (): STTConfig => {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const config = JSON.parse(data);
      
      // Merge with default to ensure all fields exist
      return {
        voiceForm: { ...DEFAULT_CONFIG.voiceForm, ...config.voiceForm },
        meetingTranscription: { ...DEFAULT_CONFIG.meetingTranscription, ...config.meetingTranscription }
      };
    }
  } catch (error) {
    console.error('[STTConfig] Error reading config:', error);
  }
  
  return DEFAULT_CONFIG;
};

/**
 * Lưu cấu hình STT vào file
 */
export const saveSTTConfig = (config: Partial<STTConfig>): STTConfig => {
  try {
    const currentConfig = getSTTConfig();
    const newConfig: STTConfig = {
      voiceForm: config.voiceForm 
        ? { ...currentConfig.voiceForm, ...config.voiceForm }
        : currentConfig.voiceForm,
      meetingTranscription: config.meetingTranscription 
        ? { ...currentConfig.meetingTranscription, ...config.meetingTranscription }
        : currentConfig.meetingTranscription
    };
    
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    console.log('[STTConfig] Config saved:', newConfig);
    
    return newConfig;
  } catch (error) {
    console.error('[STTConfig] Error saving config:', error);
    throw new Error('Failed to save STT configuration');
  }
};

/**
 * Cập nhật provider cho Voice Form
 */
export const setVoiceFormProvider = (provider: VoiceFormProvider): STTConfig => {
  if (!['webspeech', 'gemini', 'pollinations', 'viettel'].includes(provider)) {
    throw new Error(`Invalid voice form provider: ${provider}`);
  }
  
  const providerInfo = VOICE_FORM_PROVIDERS.find(p => p.id === provider);
  
  return saveSTTConfig({
    voiceForm: {
      provider,
      description: providerInfo?.description || ''
    }
  });
};

/**
 * Cập nhật provider cho Meeting Transcription
 */
export const setMeetingTranscriptionProvider = (provider: MeetingTranscriptionProvider): STTConfig => {
  if (!['whisper', 'gemini', 'pollinations', 'viettel'].includes(provider)) {
    throw new Error(`Invalid meeting transcription provider: ${provider}`);
  }
  
  const providerInfo = MEETING_TRANSCRIPTION_PROVIDERS.find(p => p.id === provider);
  
  return saveSTTConfig({
    meetingTranscription: {
      provider,
      description: providerInfo?.description || ''
    }
  });
};

/**
 * Lấy provider info đầy đủ cho UI
 */
export const getSTTProvidersInfo = () => {
  const config = getSTTConfig();
  
  return {
    voiceForm: {
      active: config.voiceForm.provider,
      providers: VOICE_FORM_PROVIDERS
    },
    meetingTranscription: {
      active: config.meetingTranscription.provider,
      providers: MEETING_TRANSCRIPTION_PROVIDERS
    }
  };
};

/**
 * Kiểm tra Gemini API Key có sẵn không
 */
export const checkGeminiAvailable = (): boolean => {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!apiKey && apiKey.length > 10;
};

/**
 * Kiểm tra Pollinations STT có sẵn không
 * Pollinations.ai miễn phí, luôn available (không cần API key)
 */
export const checkPollinationsAvailable = (): boolean => {
  return true; // Pollinations is free, always available
};

/**
 * Kiểm tra Viettel AI STT Token có sẵn không
 */
export const checkViettelAvailable = (): boolean => {
  const token = process.env.VIETTEL_STT_TOKEN;
  return !!token && token.length > 10;
};
