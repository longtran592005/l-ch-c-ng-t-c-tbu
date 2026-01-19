import axios from 'axios';
import { AppError } from '../utils/errors.util';

// Cấu hình Ollama
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'qwen2.5';

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

        // Hàm xử lý từng đoạn nhỏ
        const processChunk = async (chunk: string): Promise<string> => {
            const prompt = `Bạn là biên tập viên tiếng Việt chuyên nghiệp.
Nhiệm vụ: Sửa lỗi chính tả và thêm dấu câu cho đoạn văn bản sau.
QUAN TRỌNG:
1. TUYỆT ĐỐI KHÔNG thêm lời dẫn, không thêm tiêu đề, không thêm mô tả.
2. CHỈ trả về đúng nội dung đã sửa.
3. Giữ nguyên ý nghĩa và cấu trúc dòng.

Văn bản gốc:
"${chunk}"

Văn bản đã sửa:`;

            try {
                const response = await axios.post(OLLAMA_API_URL, {
                    model: MODEL_NAME,
                    prompt: prompt,
                    stream: false,
                    options: { temperature: 0.1 } // Giảm temperature để AI ít sáng tạo, tôn trọng văn bản gốc hơn
                });
                return response.data?.response?.trim() || chunk;
            } catch (error) {
                console.error('Lỗi xử lý chunk:', error);
                return chunk; // Nếu lỗi thì trả về chunk gốc
            }
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
        for (const chunk of chunks) {
            const refined = await processChunk(chunk);
            refinedChunks.push(refined);
        }

        return refinedChunks.join('');
    },



    /**
     * Tạo biên bản cuộc họp từ nội dung văn bản (Transcript)
     */
    generateMinutes: async (content: string): Promise<string> => {
        if (!content || content.length < 10) return "Nội dung quá ngắn để tạo biên bản.";

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
                return response.data.response.trim();
            }
            throw new Error('No response from LLM');
        } catch (error: any) {
            console.error('[LLM] Error generating minutes:', error.message);
            if (error.code === 'ECONNREFUSED') {
                throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Không kết nối được với Ollama.');
            }
            throw new AppError(500, 'AI_PROCESSING_FAILED', `Lỗi tạo biên bản: ${error.message}`);
        }
    }
};
