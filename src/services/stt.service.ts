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

export type VoiceFormProvider = 'webspeech' | 'gemini' | 'pollinations' | 'viettel' | 'fpt';
export type MeetingTranscriptionProvider = 'whisper' | 'gemini' | 'pollinations' | 'viettel' | 'fpt';

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
  pollinationsAvailable: boolean;
  viettelAvailable: boolean;
  fptAvailable: boolean;
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
  pollinationsAvailable: boolean;
  viettelAvailable: boolean;
  fptAvailable: boolean;
}

export interface TranscribeResult {
  success: boolean;
  text: string;
  duration?: number;
  provider: string;
  model?: string;
  error?: string;
  parsedValue?: string;
}

// Field info for Gemini one-shot mode
export interface STTFieldInfo {
  name: string;
  type: 'date' | 'time' | 'string' | 'array' | 'enum';
  label: string;
  enumValues?: { label: string; value: string }[];
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
      geminiAvailable: false,
      pollinationsAvailable: false,
      viettelAvailable: false
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
 * Transcribe audio ngắn bằng provider server-side (Gemini/Pollinations)
 * Nếu có fieldInfo → one-shot: audio → giá trị chuẩn (1 request duy nhất)
 * Nếu không có fieldInfo → chỉ transcribe text thô
 * 
 * ⚡ Tối ưu: Gửi thẳng audio gốc (webm/opus) mà KHÔNG downsample sang WAV.
 * Cloud providers (Gemini, Pollinations/Whisper) đều hỗ trợ webm/opus natively.
 * Tránh phình kích thước 8x (webm 12KB → WAV 100KB → base64 133KB).
 */
export const transcribeShortAudioWithGemini = async (
  audioBlob: Blob,
  fieldInfo?: STTFieldInfo
): Promise<TranscribeResult> => {
  try {
    const t0 = performance.now();
    // Gửi thẳng audio gốc (webm/opus) — KHÔNG downsample sang WAV
    // Gemini & Whisper đều decode webm/opus server-side, nhỏ hơn ~8x so với WAV
    const mimeType = audioBlob.type || 'audio/webm';
    const base64 = await blobToBase64(audioBlob);
    const origKB = (audioBlob.size / 1024).toFixed(1);
    const b64KB = (base64.length / 1024).toFixed(1);
    console.log(`⏱️ [STT] Audio prep: ${((performance.now() - t0) / 1000).toFixed(2)}s | orig: ${origKB}KB | base64: ${b64KB}KB (${mimeType})`);
    
    const payload: any = {
      audioBase64: base64,
      mimeType
    };
    
    // Gửi fieldInfo nếu có → backend sẽ dùng one-shot mode
    if (fieldInfo) {
      payload.fieldInfo = fieldInfo;
    }
    
    const response = await api.post<{ success: boolean; data: TranscribeResult }>(
      '/stt/transcribe/short',
      payload
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
 * Sử dụng ArrayBuffer để nhanh hơn FileReader
 */
const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Xử lý theo chunk để tránh stack overflow với file lớn
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

/**
 * Downsample audio blob để giảm kích thước trước khi gửi lên server
 * Chuyển về mono 16kHz PCM rồi encode lại thành WAV
 * Giảm ~60-70% dung lượng mà không ảnh hưởng chất lượng nhận dạng giọng nói
 */
const downsampleAudioBlob = async (blob: Blob): Promise<{ blob: Blob; mimeType: string }> => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000 // Target: 16kHz (tối ưu cho speech recognition)
    });
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Mix to mono
    const length = audioBuffer.length;
    const numChannels = audioBuffer.numberOfChannels;
    const monoData = new Float32Array(length);
    
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        monoData[i] += channelData[i] / numChannels;
      }
    }
    
    // Resample tới 16kHz nếu cần
    const targetSampleRate = 16000;
    let finalData: Float32Array;
    if (audioBuffer.sampleRate !== targetSampleRate) {
      const ratio = audioBuffer.sampleRate / targetSampleRate;
      const newLength = Math.round(length / ratio);
      finalData = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        const srcIndex = Math.min(Math.round(i * ratio), length - 1);
        finalData[i] = monoData[srcIndex];
      }
    } else {
      finalData = monoData;
    }
    
    // Encode thành WAV 16-bit PCM
    const wavBuffer = encodeWAV(finalData, targetSampleRate);
    await audioContext.close();
    
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    console.log(`[STT] Audio downsample: ${(blob.size / 1024).toFixed(1)}KB → ${(wavBlob.size / 1024).toFixed(1)}KB (${((1 - wavBlob.size / blob.size) * 100).toFixed(0)}% nhỏ hơn)`);
    
    return { blob: wavBlob, mimeType: 'audio/wav' };
  } catch (error) {
    console.warn('[STT] Downsample failed, using original audio:', error);
    return { blob, mimeType: blob.type || 'audio/webm' };
  }
};

/**
 * Encode Float32Array thành WAV 16-bit PCM buffer
 */
function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  
  return buffer;
}

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
