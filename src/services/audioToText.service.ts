/**
 * Service để tích hợp với API chuyển đổi audio sang text từ Python FastAPI (VinAI Whisper)
 */

const PYTHON_API_BASE_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8081';

export interface AudioToTextRequest {
  audioFile: File;
  language?: string; // 'vi' cho tiếng Việt
}

export interface AudioToTextResponse {
  success: boolean;
  text?: string;
  error?: string;
  processingTime?: number;
}

/**
 * Upload audio file và chuyển đổi sang văn bản bằng Python FastAPI (VinAI Whisper)
 */
export const convertAudioToText = async (
  request: AudioToTextRequest
): Promise<AudioToTextResponse> => {
  const formData = new FormData();
  formData.append('file', request.audioFile);

  try {
    const response = await fetch(`${PYTHON_API_BASE_URL}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      text: result.text || '',
      processingTime: result.processingTime,
    };
  } catch (error: any) {
    console.error('Python API failed:', error);
    return {
      success: false,
      error: error.message || 'Không thể chuyển đổi audio sang text. Vui lòng thử lại sau.',
    };
  }
};

/**
 * Hướng dẫn thủ công khi Python API không hoạt động
 */
export const getManualConversionInstructions = (): string => {
  return `
Hướng dẫn chuyển đổi audio sang text thủ công:

1. Đảm bảo Python service đang chạy:
   - cd python_service
   - python main.py

2. Nếu Python service không hoạt động:
   - Truy cập: https://daotao.abaii.vn/#/tockyat-fileat
   - Upload file audio của bạn
   - Chờ hệ thống xử lý và tạo văn bản
   - Copy văn bản kết quả
   - Dán vào phần "Văn bản thô" trong tab "Nội dung cuộc họp"

Lưu ý: Cấu hình Python API URL trong file .env:
VITE_PYTHON_API_URL=http://localhost:8081
  `;
};

export default {
  convertAudioToText,
  getManualConversionInstructions,
};
