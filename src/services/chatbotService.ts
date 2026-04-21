/**
 * Chatbot Service
 * Service giao tiếp với RAG Chatbot API
 * 
 * @author TBU AI Team
 */

import { api } from './api';
import { ScheduleLink } from '@/components/chatbot/ChatMessage';

/**
 * Interface cho tin nhắn chat
 */
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'bot';
  timestamp: Date;
  sources?: ChatSource[];
  scheduleLinks?: ScheduleLink[]; // Danh sách các lịch có thể navigate
}

/**
 * Interface cho nguồn trích dẫn
 */
export interface ChatSource {
  content: string;
  metadata: Record<string, any>;
  score: number;
  source_type?: string;
  source_id?: string;
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

const getBaseMimeType = (mimeType: string): string => {
  return mimeType.split(';')[0].trim().toLowerCase();
};

/**
 * Parse schedule links từ sources của RAG response
 * Trích xuất thông tin schedule từ metadata của sources có type 'schedule'
 */
const parseScheduleLinksFromSources = (sources: ChatSource[]): ScheduleLink[] => {
  if (!sources || sources.length === 0) return [];

  const scheduleLinks: ScheduleLink[] = [];
  const seenIds = new Set<string>();

  for (const source of sources) {
    // Kiểm tra source_type ở cả top-level và metadata
    const sourceType = source.source_type || source.metadata?.source_type;

    if (sourceType !== 'schedule') {
      continue;
    }

    const metadata = source.metadata || {};
    const scheduleId = source.source_id || metadata.id || metadata.schedule_id || metadata.source_id;

    if (!scheduleId || seenIds.has(scheduleId)) {
      continue;
    }
    seenIds.add(scheduleId);

    // Lấy ngày từ metadata
    let scheduleDate = '';
    let displayText = '';

    if (metadata.date) {
      // Format date
      try {
        const dateObj = new Date(metadata.date);
        if (!isNaN(dateObj.getTime())) {
          scheduleDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
          displayText = `Ngày ${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
        }
      } catch (e) {
        console.warn('[Chatbot] Failed to parse date:', metadata.date);
      }
    }

    // Fallback: try to extract date from content
    if (!scheduleDate && source.content) {
      const dateMatch = source.content.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        scheduleDate = `${year}-${month}-${day}`;
        displayText = `Ngày ${day}/${month}/${year}`;
      }
    }

    // Thêm thông tin nội dung vào displayText nếu có
    if (metadata.content) {
      const shortContent = metadata.content.length > 30
        ? metadata.content.substring(0, 30) + '...'
        : metadata.content;
      displayText = displayText ? `${displayText}: ${shortContent}` : shortContent;
    }

    if (scheduleId && scheduleDate) {
      scheduleLinks.push({
        scheduleId,
        scheduleDate,
        displayText: displayText || `Lịch ${scheduleId.substring(0, 8)}...`
      });
    }
  }

  return scheduleLinks;
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
  async sendMessage(message: string, chatHistory?: ChatMessage[]): Promise<ChatResponse & { scheduleLinks?: ScheduleLink[] }> {
    // Format chat history cho API
    const history = chatHistory?.slice(-4).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    try {
      console.log('[Chatbot] Sending message:', message);
      const response = await api.post<{ success: boolean; data: ChatResponse }>('/chatbot/chat', {
        message,
        session_id: getSessionId(),
        chat_history: history
      });

      if (response.success && response.data) {
        console.log('[Chatbot] Received response:', response.data.answer.substring(0, 50) + '...');
        console.log('[Chatbot] Sources count:', response.data.sources?.length || 0);

        // Parse schedule links từ sources
        const scheduleLinks = parseScheduleLinksFromSources(response.data.sources);
        console.log('[Chatbot] Extracted schedule links:', scheduleLinks.length);

        return {
          ...response.data,
          scheduleLinks
        };
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
  createMessage(content: string, role: 'user' | 'bot', sources?: ChatSource[], scheduleLinks?: ScheduleLink[]): ChatMessage {
    return {
      id: generateMessageId(),
      content,
      role,
      timestamp: new Date(),
      sources,
      scheduleLinks
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
  resetSession() {
    sessionStorage.removeItem('chatbot_session');
  },

  /**
   * Lấy danh sách LLM Providers
   */
  async getLLMProviders(): Promise<any> {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/chatbot/llm/providers');
      if (response.success) {
        return response.data;
      }
      throw new Error('Failed to fetch LLM providers');
    } catch (error) {
      console.error('[Chatbot] Get LLM providers error:', error);
      throw error;
    }
  },

  /**
   * Chuyển đổi LLM Provider
   */
  async switchLLM(provider: string): Promise<any> {
    try {
      const response = await api.post<{ success: boolean; data: any }>('/chatbot/llm/switch', { provider });
      if (response.success) {
        return response.data;
      }
      throw new Error('Failed to switch LLM provider');
    } catch (error) {
      console.error('[Chatbot] Switch LLM error:', error);
      throw error;
    }
  },

  /**
   * Reset bộ nhớ chatbot (xóa cache + lịch sử chat trong DB)
   */
  async resetMemory(): Promise<any> {
    try {
      const response = await api.post<{ success: boolean; data: any; message: string }>('/chatbot/reset-memory', {});
      if (response.success) {
        return response.data;
      }
      throw new Error('Failed to reset chatbot memory');
    } catch (error) {
      console.error('[Chatbot] Reset memory error:', error);
      throw error;
    }
  },

  /**
   * Gửi audio trực tiếp tới chatbot (Gemini/Pollinations xử lý audio)
   * 
   * @param audioBlob - Audio Blob từ recorder
   * @param chatHistory - Lịch sử chat tối đa 4 tin nhắn gần nhất
   * @returns Promise<ChatResponse>
   */
  async sendAudioMessage(audioBlob: Blob, chatHistory?: ChatMessage[]): Promise<ChatResponse & { scheduleLinks?: ScheduleLink[] }> {
    try {
      console.log('[Chatbot] Sending audio message, size:', audioBlob.size, 'type:', audioBlob.type);

      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // Remove "data:audio/webm;base64," prefix
          const base64Data = dataUrl.split(',')[1] || dataUrl;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const mimeType = getBaseMimeType(audioBlob.type || 'audio/webm');

      // Format chat history
      const history = chatHistory?.slice(-4).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      const response = await api.post<{ success: boolean; data: ChatResponse }>('/chatbot/chat-audio', {
        audioBase64: base64,
        mimeType,
        session_id: getSessionId(),
        chat_history: history
      });

      if (response.success && response.data) {
        console.log('[Chatbot] Audio response:', response.data.answer?.substring(0, 50) + '...');

        const scheduleLinks = parseScheduleLinksFromSources(response.data.sources);
        return {
          ...response.data,
          scheduleLinks
        };
      }

      throw new Error('Invalid response from chatbot audio');
    } catch (error: any) {
      console.error('[Chatbot] Send audio message error:', error);
      return {
        answer: error.message || 'Xin lỗi, có lỗi xảy ra khi xử lý audio. Vui lòng thử lại sau.',
        sources: [],
        query: '[Audio message]',
        num_retrieved: 0
      };
    }
  }
};

export default chatbotService;
