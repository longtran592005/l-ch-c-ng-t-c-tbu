/**
 * Service để tích hợp với API chuyển đổi audio sang text từ daotao.abaii.vn
 * 
 * Lưu ý: Service này cần được cấu hình với endpoint và API key thực tế từ daotao.abaii.vn
 * Nếu họ không có API công khai, có thể cần tạo backend proxy endpoint
 */

const ABAII_API_BASE_URL = import.meta.env.VITE_ABAII_API_URL || 'https://daotao.abaii.vn';
const ABAII_API_KEY = import.meta.env.VITE_ABAII_API_KEY || ''; // API key nếu cần

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
 * Upload audio file và chuyển đổi sang văn bản
 * 
 * Gọi qua backend proxy của dự án để tránh lỗi CORS và quản lý tập trung.
 */
export const convertAudioToText = async (
  request: AudioToTextRequest
): Promise<AudioToTextResponse> => {
  // Luôn sử dụng backend proxy để xử lý, tránh lỗi CORS và quản lý tập trung.
  return convertAudioToTextViaBackend(request);
};

/**
 * Phương án 2: Gọi qua backend proxy của dự án
 * Backend sẽ proxy request đến daotao.abaii.vn
 */
const convertAudioToTextViaBackend = async (
  request: AudioToTextRequest
): Promise<AudioToTextResponse> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const token = localStorage.getItem('tbu_auth_token');

  const formData = new FormData();
  formData.append('audioFile', request.audioFile);
  if (request.language) {
    formData.append('language', request.language);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/audio-to-text/convert`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        // Không set Content-Type cho FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      text: result.text || result.transcript || result.data,
      processingTime: result.processingTime,
    };
  } catch (error: any) {
    console.error('Backend proxy failed:', error);
    return {
      success: false,
      error: error.message || 'Không thể chuyển đổi audio sang text. Vui lòng thử lại sau.',
    };
  }
};

/**
 * Phương án 3: Nếu không có API, trả về hướng dẫn thủ công
 * Người dùng sẽ cần upload file lên trang web và copy kết quả
 */
export const getManualConversionInstructions = (): string => {
  return `
Hướng dẫn chuyển đổi audio sang text thủ công:

1. Truy cập: https://daotao.abaii.vn/#/tockyat-fileat
2. Upload file audio của bạn
3. Chờ hệ thống xử lý và tạo văn bản
4. Copy văn bản kết quả
5. Dán vào phần "Văn bản thô" trong tab "Nội dung cuộc họp"
6. Chỉnh sửa và đưa vào biên bản cuộc họp

Lưu ý: Nếu có API key từ daotao.abaii.vn, vui lòng cấu hình trong file .env:
VITE_ABAII_API_URL=https://daotao.abaii.vn
VITE_ABAII_API_KEY=your_api_key_here
  `;
};

export default {
  convertAudioToText,
  getManualConversionInstructions,
};

