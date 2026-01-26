import axios from 'axios';
import { AppError } from '../utils/errors.util';

// Cấu hình Ollama
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'qwen2.5:7b';

interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

/**
 * Service giao tiếp với Local LLM (Ollama)
 */
export const llmService = {
    /**
     * Kiểm tra xem Ollama có đang chạy không
     */
    checkStatus: async (): Promise<boolean> => {
        try {
            await axios.get('http://localhost:11434');
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Sửa lỗi chính tả và chuẩn hóa văn bản (có chia nhỏ nếu văn bản dài)
     * @param text Văn bản thô cần xử lý
     */
    refineText: async (text: string): Promise<string> => {
        if (!text || text.length < 10) return text;

        // Kiểm tra Ollama có đang chạy không
        const isOllamaRunning = await llmService.checkStatus();
        if (!isOllamaRunning) {
            throw new AppError(503, 'OLLAMA_UNAVAILABLE', 'Ollama AI service chưa chạy. Vui lòng khởi động Ollama trên máy chủ.');
        }

        // Hàm xử lý từng đoạn nhỏ
        const processChunk = async (chunk: string): Promise<string> => {
            const prompt = `Bạn là biên tập viên tiếng Việt chuyên xử lý văn bản được chuyển từ giọng nói (ASR transcript).

Nhiệm vụ: Chuẩn hóa chính tả và thêm dấu câu cho văn bản, KHÔNG thay đổi nội dung.

YÊU CẦU BẮT BUỘC:

1. CHỈ sửa các lỗi sau:
   - Lỗi chính tả
   - Thiếu dấu câu (.,;:!?…)
   - Viết hoa tên riêng, chức danh, cơ quan nhà nước theo chuẩn tiếng Việt
   - Ngắt câu hợp lý để đúng văn phong phát biểu chính luận

2. TUYỆT ĐỐI KHÔNG:
   - Không thêm nội dung mới
   - Không lược bỏ nội dung
   - Không diễn giải lại
   - Không thay đổi ý nghĩa câu
   - Không dịch sang ngôn ngữ khác
   - Không tóm tắt

3. GIỮ NGUYÊN CẤU TRÚC:
   - Giữ nguyên từng dòng
   - Giữ nguyên timestamp dạng [00:00:00,000 -> 00:00:00,000]
   - Không gộp dòng, không tách dòng

4. ĐỐI VỚI TÊN RIÊNG & CHỨC DANH:
   - Giữ nguyên tên người, kể cả tên nước ngoài hoặc tiếng Trung
   - Không suy đoán, không sửa theo kiến thức bên ngoài
   - Nếu tên viết lẫn ngôn ngữ khác → giữ nguyên, chỉ thêm dấu câu xung quanh nếu cần

5. VĂN PHONG:
   - Phù hợp văn bản hành chính – nghị trường – lễ nghi nhà nước
   - Trang trọng, chuẩn mực

6. ĐẦU RA:
   - CHỈ trả về văn bản đã chỉnh sửa
   - Không thêm lời giải thích
   - Không thêm tiêu đề
   - Không thêm ghi chú

Văn bản gốc:
"${chunk}"

Văn bản đã chỉnh sửa:
`;

            console.log('[LLM] Sending chunk to Ollama, length:', chunk.length);

            const response = await axios.post(OLLAMA_API_URL, {
                model: MODEL_NAME,
                prompt: prompt,
                stream: false,
                options: { temperature: 0.1 }
            });

            const result = response.data?.response?.trim();
            if (!result) {
                console.warn('[LLM] Ollama returned empty response for chunk');
                return chunk; // Trả về gốc nếu AI không trả gì
            }

            console.log('[LLM] Chunk processed successfully');
            return result;
        };

        // Chia văn bản thành các đoạn nhỏ (khoảng 1000 ký tự), ngắt tại dấu xuống dòng hoặc dấu chấm
        const chunkSize = 1000;
        const chunks: string[] = [];
        let currentIndex = 0;

        while (currentIndex < text.length) {
            let end = Math.min(currentIndex + chunkSize, text.length);

            // Tìm điểm ngắt hợp lý (xuống dòng hoặc dấu câu) để không cắt giữa câu
            if (end < text.length) {
                const lastNewline = text.lastIndexOf('\n', end);
                const lastPeriod = text.lastIndexOf('.', end);

                // Ưu tiên ngắt ở dấu xuống dòng gần nhất trong phạm vi an toàn
                if (lastNewline > currentIndex + chunkSize * 0.8) {
                    end = lastNewline + 1;
                } else if (lastPeriod > currentIndex + chunkSize * 0.8) {
                    end = lastPeriod + 1;
                }
            }

            chunks.push(text.slice(currentIndex, end));
            currentIndex = end;
        }

        console.log(`[LLM] Chia văn bản thành ${chunks.length} đoạn để xử lý...`);

        // Xử lý tuần tự từng đoạn để đảm bảo thứ tự
        const refinedChunks = [];
        for (let i = 0; i < chunks.length; i++) {
            try {
                console.log(`[LLM] Processing chunk ${i + 1}/${chunks.length}...`);
                const refined = await processChunk(chunks[i]);
                refinedChunks.push(refined);
            } catch (error: any) {
                console.error(`[LLM] Error processing chunk ${i + 1}:`, error.message);
                // Nếu lỗi 404 (model not found), throw error rõ ràng
                if (error.response?.status === 404) {
                    throw new AppError(503, 'MODEL_NOT_FOUND', `Model "${MODEL_NAME}" chưa được cài đặt. Chạy: ollama pull ${MODEL_NAME}`);
                }
                throw new AppError(500, 'AI_PROCESSING_FAILED', `Lỗi xử lý AI: ${error.message}`);
            }
        }

        return refinedChunks.join('');
    },



    /**
     * Tạo biên bản cuộc họp từ nội dung văn bản (Transcript)
     */
    generateMinutes: async (content: string): Promise<string> => {
        if (!content || content.length < 10) return "Nội dung quá ngắn để tạo biên bản.";

        // Kiểm tra Ollama có đang chạy không
        const isOllamaRunning = await llmService.checkStatus();
        if (!isOllamaRunning) {
            throw new AppError(503, 'OLLAMA_UNAVAILABLE', 'Ollama AI service chưa chạy. Vui lòng khởi động Ollama trên máy chủ.');
        }

        const prompt = `Bạn là thư ký chuyên nghiệp. Hãy tạo biên bản cuộc họp chi tiết từ nội dung ghi âm dưới đây.
Định dạng biên bản cần:
1. Tiêu đề: Tóm tắt nội dung chính (ngắn gọn)
2. Thành phần tham dự (nếu có trong nội dung)
3. Các nội dung thảo luận chính (gạch đầu dòng chi tiết)
4. Kết luận/Chỉ đạo (nếu có)
5. Nhiệm vụ cần làm (Action Items) - Ai làm gì, hạn bao giờ

Nội dung ghi âm:
"${content}"

Biên bản cuộc họp:`;

        try {
            console.log('[LLM] Generating minutes with Qwen 2.5...');
            const response = await axios.post(OLLAMA_API_URL, {
                model: MODEL_NAME,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.5,
                }
            });

            if (response.data && response.data.response) {
                console.log('[LLM] Minutes generated successfully');
                return response.data.response.trim();
            }
            throw new Error('No response from LLM');
        } catch (error: any) {
            console.error('[LLM] Error generating minutes:', error.message);
            if (error.code === 'ECONNREFUSED') {
                throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Không kết nối được với Ollama. Đảm bảo Ollama đang chạy.');
            }
            if (error.response?.status === 404) {
                throw new AppError(503, 'MODEL_NOT_FOUND', `Model "${MODEL_NAME}" chưa được cài đặt. Chạy: ollama pull ${MODEL_NAME}`);
            }
            throw new AppError(500, 'AI_PROCESSING_FAILED', `Lỗi tạo biên bản: ${error.message}`);
        }
    },

    /**
         * Xử lý prompt tùy ý từ Frontend (Proxy mode)
         */
    processPrompt: async (prompt: string, model: string = MODEL_NAME, temperature: number = 0.1): Promise<string> => {
        try {
            console.log('[LLM] Processing generic prompt...');
            const response = await axios.post(OLLAMA_API_URL, {
                model: model,
                prompt: prompt,
                stream: false,
                options: { temperature }
            });

            if (response.data && response.data.response) {
                return response.data.response.trim();
            }
            throw new Error('No response from LLM');
        } catch (error: any) {
            console.error('[LLM] Error processing prompt:', error.message);
            if (error.code === 'ECONNREFUSED') {
                throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Không kết nối được với Ollama.');
            }
            throw new AppError(500, 'AI_PROCESSING_FAILED', `Lỗi xử lý AI: ${error.message}`);
        }
    }
};
