import axios from 'axios';
import https from 'https';

// RAG Service URL
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'https://localhost:8002';

// Cấu hình Ollama direct (dùng cho fallback)
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'qwen2.5:7b';

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

/**
 * Helper để gọi LLM thông qua Python RAG service (để dùng chung cấu hình Ollama/Gemini)
 */
const callRagLlm = async (prompt: string, temperature?: number, maxTokens?: number): Promise<string> => {
    try {
        const response = await axios.post(`${RAG_SERVICE_URL}/llm/generate`, {
            prompt,
            temperature,
            max_tokens: maxTokens
        }, {
            httpsAgent,
            timeout: 120000
        });

        if (response.data && response.data.answer) {
            return response.data.answer;
        }
        throw new Error('Empty response from RAG LLM');
    } catch (error: any) {
        console.warn(`[LLM] Python RAG LLM failed: ${error.message}. Falling back to local Ollama...`);
        // Fallback to direct Ollama if RAG service is down
        const response = await axios.post(OLLAMA_API_URL, {
            model: MODEL_NAME,
            prompt,
            stream: false,
            options: { temperature: temperature || 0.1 }
        }, { timeout: 90000 });

        return response.data?.response?.trim() || '';
    }
};

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
     * Sửa lỗi chính tả và chuẩn hóa văn bản
     */
    refineText: async (text: string): Promise<string> => {
        if (!text || text.length < 10) return text;

        const prompt = `Bạn là biên tập viên tiếng Việt chuyên xử lý văn bản được chuyển từ giọng nói (ASR transcript).
Chuẩn hóa chính tả và thêm dấu câu cho văn bản, KHÔNG thay đổi nội dung.
GIỮ NGUYÊN timestamp [00:00:00,000 -> 00:00:00,000].
Văn bản gốc:
"${text}"
Văn bản đã chỉnh sửa:`;

        return await callRagLlm(prompt, 0.1);
    },

    /**
     * Tạo biên bản cuộc họp từ nội dung văn bản
     */
    generateMinutes: async (content: string): Promise<string> => {
        if (!content || content.length < 10) return "Nội dung quá ngắn để tạo biên bản.";

        const prompt = `Bạn là thư ký chuyên nghiệp. Hãy tạo biên bản cuộc họp chi tiết từ nội dung ghi âm dưới đây.
Định dạng biên bản cần:
1. Tiêu đề: Tóm tắt nội dung chính (ngắn gọn)
2. Thành phần tham dự
3. Các nội dung thảo luận chính
4. Kết luận/Chỉ đạo
5. Nhiệm vụ cần làm (Action Items)
Nội dung ghi âm: "${content}"
Biên bản cuộc họp:`;

        return await callRagLlm(prompt, 0.5);
    },

    /**
     * Xử lý prompt tùy ý
     */
    processPrompt: async (prompt: string, _model?: string, temperature: number = 0.1): Promise<string> => {
        return await callRagLlm(prompt, temperature);
    }
};
