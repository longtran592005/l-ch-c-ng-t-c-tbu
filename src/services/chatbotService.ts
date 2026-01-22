/**
 * Chatbot Service
 * Service giao tiếp với RAG Chatbot API
 * 
 * @author TBU AI Team
 */

import { api } from './api';

/**
 * Interface cho tin nhắn chat
 */
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'bot';
  timestamp: Date;
  sources?: ChatSource[];
}

/**
 * Interface cho nguồn trích dẫn
 */
export interface ChatSource {
  content: string;
  metadata: Record<string, any>;
  score: number;
  source_type?: string;
}

/**
 * Interface cho response từ API
 */
export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  query: string;
  num_retrieved: number;
  session_id?: string;
}

/**
 * Interface cho health check
 */
export interface ChatbotHealth {
  status: string;
  service: string;
  models: Record<string, string>;
  vector_store: Record<string, any>;
}

/**
 * Generate unique session ID
 * Lưu vào sessionStorage để duy trì trong phiên
 */
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('chatbot_session');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('chatbot_session', sessionId);
  }
  return sessionId;
};

/**
 * Generate unique message ID
 */
const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Chatbot Service
 */
export const chatbotService = {
  /**
   * Gửi message đến chatbot
   * 
   * @param message - Tin nhắn người dùng
   * @param chatHistory - Lịch sử chat (tối đa 4 tin nhắn gần nhất)
   * @returns Promise<ChatResponse>
   */
  async sendMessage(message: string, chatHistory?: ChatMessage[]): Promise<ChatResponse> {
    // Format chat history cho API
    const history = chatHistory?.slice(-4).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    try {
      const response = await api.post<{ success: boolean; data: ChatResponse }>('/chatbot/chat', {
        message,
        session_id: getSessionId(),
        chat_history: history
      });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Invalid response from chatbot');
    } catch (error: any) {
      console.error('[Chatbot] Send message error:', error);
      
      // Return fallback response
      return {
        answer: 'Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.',
        sources: [],
        query: message,
        num_retrieved: 0
      };
    }
  },

  /**
   * Tạo message object
   */
  createMessage(content: string, role: 'user' | 'bot', sources?: ChatSource[]): ChatMessage {
    return {
      id: generateMessageId(),
      content,
      role,
      timestamp: new Date(),
      sources
    };
  },

  /**
   * Health check cho chatbot service
   */
  async checkHealth(): Promise<ChatbotHealth> {
    try {
      const response = await api.get<{ success: boolean; data: ChatbotHealth }>('/chatbot/health');
      
      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Health check failed');
    } catch (error) {
      console.error('[Chatbot] Health check error:', error);
      
      return {
        status: 'error',
        service: 'tbu-rag-chatbot',
        models: { embedding: 'unknown', llm: 'unknown' },
        vector_store: { error: 'Connection failed' }
      };
    }
  },

  /**
   * Lấy session ID hiện tại
   */
  getSessionId,

  /**
   * Reset session (tạo session mới)
   */
  resetSession(): string {
    sessionStorage.removeItem('chatbot_session');
    return getSessionId();
  }
};

export default chatbotService;
