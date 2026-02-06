/**
 * STT (Speech-to-Text) Service Frontend
 * Quản lý cấu hình và gọi API cho 2 bài toán:
 * - Bài 1: Voice Form (realtime, audio ngắn ~5s)
 * - Bài 2: Meeting Transcription (audio dài 1-2 tiếng)
 * 
 * @author TBU AI Team
 */

import { api } from '@/services/api';
import { getApiBaseUrl } from '@/lib/utils';

// ==================== Types ====================

export type VoiceFormProvider = 'webspeech' | 'gemini';
export type MeetingTranscriptionProvider = 'whisper' | 'gemini';

export interface STTConfig {
  voiceForm: {
    provider: VoiceFormProvider;
    description: string;
  };
  meetingTranscription: {
    provider: MeetingTranscriptionProvider;
    description: string;
  };
  geminiAvailable: boolean;
}

export interface STTProviderInfo {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
}

export interface STTProvidersInfo {
  voiceForm: {
    active: VoiceFormProvider;
    providers: STTProviderInfo[];
  };
  meetingTranscription: {
    active: MeetingTranscriptionProvider;
    providers: STTProviderInfo[];
  };
  geminiAvailable: boolean;
}

export interface TranscribeResult {
  success: boolean;
  text: string;
  duration?: number;
  provider: string;
  model?: string;
  error?: string;
}

// ==================== Local Storage Keys ====================

const STORAGE_KEYS = {
  VOICE_FORM_PROVIDER: 'tbu_stt_voice_form_provider',
  MEETING_PROVIDER: 'tbu_stt_meeting_provider',
};

// ==================== API Functions ====================

/**
 * Lấy cấu hình STT hiện tại từ server
 */
export const getSTTConfig = async (): Promise<STTConfig> => {
  try {
    const response = await api.get<{ success: boolean; data: STTConfig }>('/stt/config');
    if (response.success) {
      // Cache locally
      localStorage.setItem(STORAGE_KEYS.VOICE_FORM_PROVIDER, response.data.voiceForm.provider);
      localStorage.setItem(STORAGE_KEYS.MEETING_PROVIDER, response.data.meetingTranscription.provider);
      return response.data;
    }
    throw new Error('Failed to get STT config');
  } catch (error) {
    console.error('[STTService] Error getting config:', error);
    // Return cached or default values
    return {
      voiceForm: {
        provider: (localStorage.getItem(STORAGE_KEYS.VOICE_FORM_PROVIDER) as VoiceFormProvider) || 'webspeech',
        description: ''
      },
      meetingTranscription: {
        provider: (localStorage.getItem(STORAGE_KEYS.MEETING_PROVIDER) as MeetingTranscriptionProvider) || 'whisper',
        description: ''
      },
      geminiAvailable: false
    };
  }
};

/**
 * Lấy thông tin chi tiết các providers
 */
export const getSTTProviders = async (): Promise<STTProvidersInfo> => {
  const response = await api.get<{ success: boolean; data: STTProvidersInfo }>('/stt/providers');
  if (response.success) {
    return response.data;
  }
  throw new Error('Failed to get STT providers');
};

/**
 * Đổi provider cho Voice Form
 */
export const setVoiceFormProvider = async (provider: VoiceFormProvider): Promise<STTConfig> => {
  const response = await api.post<{ success: boolean; data: STTConfig; message: string }>(
    '/stt/voice-form/provider',
    { provider }
  );
  if (response.success) {
    localStorage.setItem(STORAGE_KEYS.VOICE_FORM_PROVIDER, provider);
    return response.data;
  }
  throw new Error(response.message || 'Failed to set voice form provider');
};

/**
 * Đổi provider cho Meeting Transcription
 */
export const setMeetingProvider = async (provider: MeetingTranscriptionProvider): Promise<STTConfig> => {
  const response = await api.post<{ success: boolean; data: STTConfig; message: string }>(
    '/stt/meeting/provider',
    { provider }
  );
  if (response.success) {
    localStorage.setItem(STORAGE_KEYS.MEETING_PROVIDER, provider);
    return response.data;
  }
  throw new Error(response.message || 'Failed to set meeting provider');
};

/**
 * Lấy provider hiện tại cho Voice Form (từ cache hoặc default)
 */
export const getCurrentVoiceFormProvider = (): VoiceFormProvider => {
  return (localStorage.getItem(STORAGE_KEYS.VOICE_FORM_PROVIDER) as VoiceFormProvider) || 'webspeech';
};

/**
 * Lấy provider hiện tại cho Meeting Transcription (từ cache hoặc default)
 */
export const getCurrentMeetingProvider = (): MeetingTranscriptionProvider => {
  return (localStorage.getItem(STORAGE_KEYS.MEETING_PROVIDER) as MeetingTranscriptionProvider) || 'whisper';
};

// ==================== Transcription Functions ====================

/**
 * Transcribe audio ngắn bằng Gemini (Bài 1 - Voice Form)
 * Gửi audio base64 lên server
 */
export const transcribeShortAudioWithGemini = async (
  audioBlob: Blob
): Promise<TranscribeResult> => {
  try {
    // Convert blob to base64
    const base64 = await blobToBase64(audioBlob);
    const mimeType = audioBlob.type || 'audio/webm';
    
    const response = await api.post<{ success: boolean; data: TranscribeResult }>(
      '/stt/transcribe/short',
      {
        audioBase64: base64,
        mimeType
      }
    );
    
    if (response.success) {
      return response.data;
    }
    
    throw new Error('Transcription failed');
  } catch (error: any) {
    console.error('[STTService] Short transcription error:', error);
    return {
      success: false,
      text: '',
      provider: 'gemini',
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Transcribe audio dài bằng Gemini (Bài 2 - Meeting)
 * Upload file lên server
 */
export const transcribeLongAudioWithGemini = async (
  file: File
): Promise<TranscribeResult> => {
  try {
    const formData = new FormData();
    formData.append('audioFile', file);
    
    const token = localStorage.getItem('tbu_auth_token');
    const API_BASE_URL = getApiBaseUrl();
    
    const response = await fetch(`${API_BASE_URL}/stt/transcribe/long`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    }
    
    throw new Error(result.message || 'Transcription failed');
  } catch (error: any) {
    console.error('[STTService] Long transcription error:', error);
    return {
      success: false,
      text: '',
      provider: 'gemini',
      error: error.message || 'Unknown error'
    };
  }
};

// ==================== Helper Functions ====================

/**
 * Convert Blob to base64 string
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/webm;base64,")
      const base64Data = base64.split(',')[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Health check for STT services
 */
export const checkSTTHealth = async (): Promise<{
  gemini: { available: boolean; error?: string };
  whisper: { available: boolean };
  webSpeech: { available: boolean };
}> => {
  try {
    const response = await api.get<{ success: boolean; data: any }>('/stt/health');
    if (response.success) {
      return response.data;
    }
  } catch (error) {
    console.error('[STTService] Health check error:', error);
  }
  
  return {
    gemini: { available: false, error: 'Unable to check' },
    whisper: { available: true },
    webSpeech: { available: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window }
  };
};
