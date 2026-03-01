import axios from 'axios';
import https from 'https';

// RAG Service URL (for legacy text refinement / minutes generation)
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'https://localhost:8002';

// OpenCode.ai configuration (thay thế Ollama)
const OPENCODE_BASE_URL = process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1';
const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY || '';
const OPENCODE_MODEL = 'opencode/-5-nano';

// Pollinations configuration
const POLLINATIONS_BASE_URL = process.env.POLLINATIONS_BASE_URL || 'https://gen.pollinations.ai';
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || 'openai';

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

/**
 * Helper để gọi LLM thông qua Python RAG service (cho refineText / generateMinutes)
 */
const callRagLlm = async (prompt: string, temperature?: number, _maxTokens?: number): Promise<string> => {
    try {
        const response = await axios.post(`${RAG_SERVICE_URL}/llm/generate`, {
            prompt,
            temperature,
        }, {
            httpsAgent,
            timeout: 120000
        });

        if (response.data && response.data.answer) {
            return response.data.answer;
        }
        throw new Error('Empty response from RAG LLM');
    } catch (error: any) {
        console.warn(`[LLM] Python RAG LLM failed: ${error.message}. Falling back to OpenCode...`);
        // Fallback to OpenCode.ai
        return await callOpenCode(prompt, temperature);
    }
};

/**
 * Gọi OpenCode.ai API (thay thế Ollama)
 * API tương thích OpenAI Chat Completions
 */
const callOpenCode = async (prompt: string, temperature: number = 0.1): Promise<string> => {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (OPENCODE_API_KEY) {
            headers['Authorization'] = `Bearer ${OPENCODE_API_KEY}`;
        }

        const response = await axios.post(`${OPENCODE_BASE_URL}/chat/completions`, {
            model: OPENCODE_MODEL,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature,
        }, {
            headers,
            timeout: 60000,
        });

        return response.data?.choices?.[0]?.message?.content?.trim() || '';
    } catch (error: any) {
        console.error('[LLM/OpenCode] Error:', error.message);
        throw new Error(`OpenCode.ai error: ${error.message}`);
    }
};

/**
 * Gọi Pollinations LLM API
 * API tương thích OpenAI Chat Completions
 */
const callPollinations = async (prompt: string, temperature: number = 0.1): Promise<string> => {
    try {
        const response = await axios.post(`${POLLINATIONS_BASE_URL}/v1/chat/completions`, {
            model: POLLINATIONS_MODEL,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature,
        }, {
            timeout: 60000,
        });

        return response.data?.choices?.[0]?.message?.content?.trim() || '';
    } catch (error: any) {
        console.error('[LLM/Pollinations] Error:', error.message);
        throw new Error(`Pollinations error: ${error.message}`);
    }
};

/**
 * Service giao tiếp với các LLM providers
 * - OpenCode.ai (mặc định, thay thế Ollama)
 * - Pollinations
 * - Python RAG service (cho refineText, generateMinutes)
 */
export const llmService = {
    /**
     * Kiểm tra xem OpenCode.ai có đang hoạt động không
     */
    checkStatus: async (): Promise<boolean> => {
        try {
            await axios.get(OPENCODE_BASE_URL, { timeout: 5000 });
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
     * Xử lý prompt tùy ý — hỗ trợ chọn provider
     * @param provider - 'opencode' | 'pollinations' (default: 'opencode')
     */
    processPrompt: async (prompt: string, _model?: string, temperature: number = 0.1, provider: string = 'opencode'): Promise<string> => {
        if (provider === 'pollinations') {
            return await callPollinations(prompt, temperature);
        }
        // Default: OpenCode.ai
        return await callOpenCode(prompt, temperature);
    }
};
