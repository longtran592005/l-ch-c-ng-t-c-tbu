/**
 * AI Chatbot Service sử dụng Groq API
 * Hoàn toàn miễn phí - Fastest inference
 *
 * @author Trường Đại học Thái Bình
 */

// ========================
// TYPES
// ========================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  question: string;
  conversationHistory?: ChatMessage[];
}

export interface AIResponse {
  answer: string;
  model: string;
  tokens: number;
}

// ========================
// CONFIGURATION
// ========================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama3-70b-8192';

// Available models (all FREE)
const AVAILABLE_MODELS = {
  'llama3-70b-8192': {
    name: 'Llama 3 70B',
    description: 'Largest model, best quality',
    context: '8,192 tokens',
  },
  'mixtral-8x7b-32768': {
    name: 'Mixtral 8x7B',
    description: 'Fast, good balance',
    context: '32,768 tokens',
  },
  'llama3-8b-8192': {
    name: 'Llama 3 8B',
    description: 'Fastest, lightweight',
    context: '8,192 tokens',
  },
};

// ========================
// SYSTEM PROMPT
// ========================

const SYSTEM_PROMPT = `Bạn là trợ lý ảo AI của Trường Đại học Thái Bình (TBU).

THÔNG TIN VỀ TRƯỜNG:
- Địa chỉ: [Điền địa chỉ trường - ví dụ: Số 123, Đường ABC, Quận/Huyện, Tỉnh/TP]
- Website: www.tbu.edu.vn
- Điện thoại: [Điền số điện thoại - ví dụ: 0xxx-xxx-xxx]
- Email: contact@tbu.edu.vn
- Giờ làm việc: Thứ 2-6: 8:00-17:00, Thứ 7: 8:00-12:00

CÁC NGÀNH ĐÀO TẠO:
- Khoa Kinh tế
- Khoa Quản trị
- Khoa Ngôn ngữ
- Khoa Công nghệ thông tin
- Khoa Cơ khí - Lý tự động hóa
- Khoa Nông nghiệp

NGUYÊN TẮC TRẢ LỜI:
1. Luôn lịch sự, chuyên nghiệp, đúng ngữ pháp tiếng Việt
2. Nếu câu hỏi liên quan đến trường, trả lời dựa trên thông tin đã cho
3. Nếu là câu hỏi về lịch công tác, trả lời ngắn gọn, rõ ràng
4. Nếu là câu hỏi về tuyển sinh, hãy hướng dẫn chi tiết
5. Nếu không có thông tin chính xác, hãy nói "Theo thông tin tôi có..." và gợi ý liên hệ
6. Không tự tạo thông tin sai lệch về trường
7. Nếu câu hỏi không liên quan đến trường, lịch sự trả lời và gợi ý hỏi về trường
8. Sử dụng emoji phù hợp để thân thiện hơn (📅, 📍, 📞, 🎓, v.v.)
9. Trả lời ngắn gọn, đi thẳng vào vấn đề
10. Nếu cần, hãy giải thích thêm chi tiết sau câu trả lời chính

VÍ DỤ CÁCH TRẢ LỜI:
- User: "Lịch hôm nay có gì?"
  Bot: "Hôm nay (07/01/2026) có 2 lịch công tác:\n\n📌 Sáng 9:00 - 11:00\n📝 Cuộc họp Ban Giám hiệu\n📍 Phòng họp 1\n👤 Chủ trì: Hiệu trưởng\n\n📌 Chiều 14:00 - 16:00\n📝 Giao ban Khoa CNTT\n📍 Phòng họp 2\n👤 Chủ trì: Trưởng phòng CNTT"

- User: "Địa chỉ trường ở đâu?"
  Bot: "📍 Địa chỉ Trường Đại học Thái Bình:\n\nSố 123, Đường ABC\nQuận/Huyện, Tỉnh/TP\n\n📞 Hotline: 0xxx-xxx-xxx\n📧 Email: contact@tbu.edu.vn\n\n⏰ Giờ làm việc:\n• Thứ 2-6: 8:00 - 17:00\n• Thứ 7: 8:00 - 12:00"

- User: "Điểm chuẩn ngành Kinh tế?"
  Bot: "🎓 Điểm chuẩn ngành Kinh tế:\n\nĐiểm chuẩn được công bố sau kỳ thi THPT Quốc gia. Để biết điểm chuẩn chi tiết, bạn có thể:\n\n📌 Truy cập: www.tbu.edu.vn\n📌 Liên hệ: Phòng Đào tạo\n📌 Hotline: 0xxx-xxx-xxx\n\n💡 Lưu ý: Điểm chuẩn thay đổi theo từng năm học."

- User: "Nhà trường có KTX không?"
  Bot: "🏢 Có! Trường có Ký túc xá cho sinh viên:\n\n📍 KTX trường: Có phòng 2-4 người, đầy đủ tiện nghi\n💰 Chi phí: Liên hệ Phòng Công tác sinh viên\n📋 Đăng ký: Đầu năm học tại Phòng CT Sinh viên\n📞 Liên hệ: 0xxx-xxx-xxx"

Hãy trả lời câu hỏi của user một cách hữu ích và lịch sự!`;

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Lấy conversation history gần nhất
 */
function getRecentHistory(history: ChatMessage[], maxMessages = 10): ChatMessage[] {
  return history.slice(-maxMessages);
}

/**
 * Format system message với context bổ sung
 */
function buildSystemPrompt(customContext?: string): string {
  if (customContext) {
    return `${SYSTEM_PROMPT}\n\nTHÔNG TIN BỔ SUNG:\n${customContext}`;
  }
  return SYSTEM_PROMPT;
}

// ========================
// MAIN FUNCTIONS
// ========================

/**
 * Xử lý câu hỏi với Groq AI
 */
export async function processWithAI(question: string, conversationHistory?: ChatMessage[]): Promise<AIResponse> {
  // Validate API key
  if (!GROQ_API_KEY) {
    console.error('[AI] GROQ_API_KEY not configured');
    throw new Error('GROQ_API_KEY chưa được cấu hình. Vui lòng thêm vào .env');
  }

  try {
    // Build messages array
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(),
      },
      ...getRecentHistory(conversationHistory || [], 8),
      {
        role: 'user',
        content: question,
      },
    ];

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI] Groq API error:', errorText);

      // Rate limit handling
      if (response.status === 429) {
        throw new Error('Đang có quá nhiều yêu cầu. Vui lòng thử lại sau vài giây.');
      }

      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract answer
    const answer = (data as any).choices[0]?.message?.content || 'Xin lỗi, tôi không thể xử lý câu hỏi này.';
    const usage = (data as any).usage || {};

    return {
      answer,
      model: (data as any).model || DEFAULT_MODEL,
      tokens: usage.total_tokens || 0,
    };

  } catch (error) {
    console.error('[AI] Error processing question:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Đã có lỗi xảy ra khi xử lý câu hỏi. Vui lòng thử lại.');
  }
}

/**
 * Xử lý với context bổ sung (database info)
 */
export async function processWithAIContext(
  question: string,
  context: string,
  conversationHistory?: ChatMessage[]
): Promise<AIResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY chưa được cấu hình');
  }

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(context),
      },
      ...getRecentHistory(conversationHistory || [], 8),
      {
        role: 'user',
        content: question,
      },
    ];

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.6, // Lower temperature for factual responses
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = (data as any).choices[0]?.message?.content || 'Xin lỗi, tôi không thể xử lý câu hỏi này.';
    const usage = (data as any).usage || {};

    return {
      answer,
      model: (data as any).model || DEFAULT_MODEL,
      tokens: usage.total_tokens || 0,
    };

  } catch (error) {
    console.error('[AI] Error processing with context:', error);
    throw error;
  }
}

/**
 * Lấy thông tin về models
 */
export function getAvailableModels() {
  return AVAILABLE_MODELS;
}

/**
 * Validate API key
 */
export async function validateAPIKey(): Promise<boolean> {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
