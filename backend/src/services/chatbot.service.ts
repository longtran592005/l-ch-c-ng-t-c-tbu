import axios from 'axios';
import prisma from '../config/database';

/**
 * Chatbot Service
 * Giao tiếp với Python RAG Service và quản lý chat history
 */

// RAG Service URL
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8002';

// Timeout cho requests
const REQUEST_TIMEOUT = 120000; // 120 seconds

/**
 * Interface cho chat response
 */
interface ChatResponse {
  answer: string;
  sources: Array<{
    content: string;
    metadata: Record<string, any>;
    score: number;
  }>;
  query: string;
  num_retrieved: number;
  session_id?: string;
}

/**
 * Interface cho health response
 */
interface HealthResponse {
  status: string;
  service: string;
  models: Record<string, string>;
  vector_store: Record<string, any>;
}

export const chatbotService = {
  /**
   * Gửi message đến RAG chatbot
   */
  async chat(
    message: string,
    sessionId?: string,
    chatHistory?: any[],
    sourceType?: string
  ): Promise<ChatResponse> {
    try {
      const response = await axios.post<ChatResponse>(
        `${RAG_SERVICE_URL}/chat`,
        {
          message,
          session_id: sessionId,
          chat_history: chatHistory,
          source_type: sourceType
        },
        { timeout: REQUEST_TIMEOUT }
      );

      // Lưu vào chat history nếu có session ID
      if (sessionId) {
        try {
          await prisma.chatHistory.create({
            data: {
              sessionId,
              userMessage: message,
              botResponse: response.data.answer,
              retrievedDocs: JSON.stringify(response.data.sources)
            }
          });
        } catch (dbError) {
          console.error('[Chatbot] Failed to save chat history:', dbError);
          // Không throw error, vẫn trả về response
        }
      }

      return response.data;
    } catch (error: any) {
      console.error('[Chatbot] Chat error:', error.message);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('RAG service is not available. Please start the Python RAG service.');
      }

      if (error.code === 'ETIMEDOUT') {
        throw new Error('Request timed out. Please try again.');
      }

      throw new Error(error.response?.data?.detail || 'Failed to get chatbot response');
    }
  },

  /**
   * Reindex tất cả schedules vào vector store
   */
  async reindexSchedules(): Promise<any> {
    try {
      // Lấy tất cả schedules đã approved từ database
      const schedules = await prisma.schedule.findMany({
        where: { status: 'approved' },
        select: {
          id: true,
          date: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          content: true,
          location: true,
          leader: true,
          participants: true,
          preparingUnit: true,
          cooperatingUnits: true,
          notes: true
        }
      });

      console.log(`[Chatbot] Found ${schedules.length} approved schedules to index`);

      // Format schedules cho RAG service
      const formattedSchedules = schedules.map(s => ({
        id: s.id,
        date: s.date.toISOString(),
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime instanceof Date ? s.startTime.toISOString() : s.startTime,
        endTime: s.endTime instanceof Date ? s.endTime.toISOString() : s.endTime,
        content: s.content,
        location: s.location,
        leader: s.leader,
        participants: s.participants,
        preparingUnit: s.preparingUnit,
        cooperatingUnits: s.cooperatingUnits,
        notes: s.notes
      }));

      // Gửi đến RAG service
      const response = await axios.post(
        `${RAG_SERVICE_URL}/index/schedules`,
        { schedules: formattedSchedules },
        { timeout: REQUEST_TIMEOUT }
      );

      return response.data;
    } catch (error: any) {
      console.error('[Chatbot] Reindex schedules error:', error.message);
      throw new Error(error.response?.data?.detail || 'Failed to reindex schedules');
    }
  },

  /**
   * Index document (info.docx)
   */
  async indexDocument(): Promise<any> {
    try {
      const response = await axios.post(
        `${RAG_SERVICE_URL}/index/document`,
        {},
        { timeout: REQUEST_TIMEOUT }
      );

      return response.data;
    } catch (error: any) {
      console.error('[Chatbot] Index document error:', error.message);
      throw new Error(error.response?.data?.detail || 'Failed to index document');
    }
  },

  /**
   * Reindex news vào vector store
   */
  async reindexNews(): Promise<any> {
    try {
      const news = await prisma.news.findMany({
        select: {
          id: true,
          title: true,
          summary: true,
          content: true,
          category: true,
          publishedAt: true
        }
      });

      console.log(`[Chatbot] Found ${news.length} news articles to index`);

      const response = await axios.post(
        `${RAG_SERVICE_URL}/index/news`,
        news,
        { timeout: REQUEST_TIMEOUT }
      );

      return response.data;
    } catch (error: any) {
      console.error('[Chatbot] Reindex news error:', error.message);
      throw new Error(error.response?.data?.detail || 'Failed to reindex news');
    }
  },

  /**
   * Reindex announcements vào vector store
   */
  async reindexAnnouncements(): Promise<any> {
    try {
      const announcements = await prisma.announcement.findMany({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        select: {
          id: true,
          title: true,
          content: true,
          priority: true,
          publishedAt: true
        }
      });

      console.log(`[Chatbot] Found ${announcements.length} announcements to index`);

      const response = await axios.post(
        `${RAG_SERVICE_URL}/index/announcements`,
        announcements,
        { timeout: REQUEST_TIMEOUT }
      );

      return response.data;
    } catch (error: any) {
      console.error('[Chatbot] Reindex announcements error:', error.message);
      throw new Error(error.response?.data?.detail || 'Failed to reindex announcements');
    }
  },

  /**
   * Reindex tất cả dữ liệu
   */
  async reindexAll(): Promise<any> {
    try {
      const results: Record<string, any> = {};

      // Index schedules
      try {
        results.schedules = await this.reindexSchedules();
      } catch (e: any) {
        results.schedules = { error: e.message };
      }

      // Index news
      try {
        results.news = await this.reindexNews();
      } catch (e: any) {
        results.news = { error: e.message };
      }

      // Index announcements
      try {
        results.announcements = await this.reindexAnnouncements();
      } catch (e: any) {
        results.announcements = { error: e.message };
      }

      // Index document
      try {
        results.document = await this.indexDocument();
      } catch (e: any) {
        results.document = { error: e.message };
      }

      return results;
    } catch (error: any) {
      console.error('[Chatbot] Reindex all error:', error.message);
      throw new Error('Failed to reindex all data');
    }
  },

  /**
   * Lấy thống kê vector store
   */
  async getStats(): Promise<any> {
    try {
      const response = await axios.get(`${RAG_SERVICE_URL}/stats`, {
        timeout: 10000
      });

      return response.data;
    } catch (error: any) {
      console.error('[Chatbot] Get stats error:', error.message);
      throw new Error(error.response?.data?.detail || 'Failed to get stats');
    }
  },

  /**
   * Health check cho RAG service
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await axios.get<HealthResponse>(`${RAG_SERVICE_URL}/`, {
        timeout: 10000
      });

      return response.data;
    } catch (error: any) {
      console.error('[Chatbot] Health check error:', error.message);

      return {
        status: 'error',
        service: 'tbu-rag-chatbot',
        models: {
          embedding: 'unknown',
          llm: 'unknown'
        },
        vector_store: {
          error: error.message
        }
      };
    }
  },

  /**
   * Lấy chat history theo session ID
   */
  async getChatHistory(sessionId: string, limit: number = 20): Promise<any[]> {
    try {
      const history = await prisma.chatHistory.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return history.reverse();
    } catch (error: any) {
      console.error('[Chatbot] Get chat history error:', error.message);
      return [];
    }
  }
};
