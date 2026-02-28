import axios from 'axios';
import https from 'https';
import prisma from '../config/database';

/**
 * Chatbot Service
 * Giao tiếp với Python RAG Service và quản lý chat history
 */

// RAG Service URL - sử dụng HTTPS cho production
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'https://localhost:8002';

// Timeout cho requests
const REQUEST_TIMEOUT = 120000; // 120 seconds

// HTTPS Agent cho self-signed certificates (development)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Cho phép self-signed certs
});

// Tạo axios instance với httpsAgent
const ragAxios = axios.create({
  httpsAgent,
  timeout: REQUEST_TIMEOUT
});

// Cache cục bộ cho active provider để đảm bảo UI không bị nhảy ngược lại khi dùng fallback
let cachedActiveProvider: string | null = null;

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
      const response = await ragAxios.post<ChatResponse>(
        `${RAG_SERVICE_URL}/chat`,
        {
          message,
          session_id: sessionId,
          chat_history: chatHistory,
          source_type: sourceType
        }
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
      const response = await ragAxios.post(
        `${RAG_SERVICE_URL}/index/schedules`,
        { schedules: formattedSchedules }
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
      const response = await ragAxios.post(
        `${RAG_SERVICE_URL}/index/document`,
        {}
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

      const response = await ragAxios.post(
        `${RAG_SERVICE_URL}/index/news`,
        news
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

      const response = await ragAxios.post(
        `${RAG_SERVICE_URL}/index/announcements`,
        announcements
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
      const response = await ragAxios.get(`${RAG_SERVICE_URL}/stats`);

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
      const response = await ragAxios.get<HealthResponse>(`${RAG_SERVICE_URL}/`);

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
  },

  /**
   * Lấy danh sách các LLM providers
   */
  async getLLMProviders(): Promise<any> {
    try {
      const response = await ragAxios.get(`${RAG_SERVICE_URL}/llm/providers`);
      const data = response.data;
      if (data && data.active) {
        cachedActiveProvider = data.active;
      }
      return data;
    } catch (error: any) {
      console.warn('[Chatbot] Get LLM providers error, using fallback:', error.message);
      return {
        active: cachedActiveProvider || 'ollama',
        providers: [
          { id: 'ollama', name: 'Ollama (Cục bộ)', model: 'qwen2.5:7b' },
          { id: 'gemini', name: 'Google Gemini (Cloud)', model: 'gemini-2.5-flash' },
          { id: 'pollinations', name: 'Pollinations.ai (Cloud)', model: 'openai' }
        ]
      };
    }
  },

  /**
   * Chuyển đổi LLM provider
   */
  async switchLLM(provider: string): Promise<any> {
    try {
      cachedActiveProvider = provider; // Cập nhật cache ngay khi bấm chuyển
      const response = await ragAxios.post(`${RAG_SERVICE_URL}/llm/switch`, { provider });
      return response.data;
    } catch (error: any) {
      console.error('[Chatbot] Switch LLM error:', error.message);
      return { status: 'error', message: 'Failed to notify Python service, but local state updated.' };
    }
  },

  /**
   * Reset bộ nhớ chatbot: xóa cache Python + lịch sử chat trong DB
   */
  async resetMemory(): Promise<any> {
    const results: Record<string, any> = {};

    // 1. Xóa query cache trên Python RAG service
    try {
      const cacheRes = await ragAxios.post(`${RAG_SERVICE_URL}/cache/clear`);
      results.cache = cacheRes.data;
    } catch (error: any) {
      console.error('[Chatbot] Clear cache error:', error.message);
      results.cache = { error: error.message };
    }

    // 2. Xóa toàn bộ chat history trong DB
    try {
      const deleted = await prisma.chatHistory.deleteMany({});
      results.chatHistory = { deleted: deleted.count };
    } catch (error: any) {
      console.error('[Chatbot] Clear chat history error:', error.message);
      results.chatHistory = { error: error.message };
    }

    return results;
  },

  /**
   * Chat bằng audio - gửi audio trực tiếp tới Gemini/Pollinations
   * Gemini: Multimodal (audio + text) → response
   * Pollinations: Transcribe rồi chat
   */
  async chatWithAudio(
    audioBase64: string,
    mimeType: string,
    sessionId?: string,
    chatHistory?: any[]
  ): Promise<ChatResponse> {
    try {
      // Lấy active LLM provider
      const providersRes = await this.getLLMProviders();
      const activeProvider = providersRes?.active || cachedActiveProvider || 'ollama';

      console.log(`[Chatbot] chatWithAudio using provider: ${activeProvider}`);

      if (activeProvider === 'gemini') {
        return await this.chatAudioWithGemini(audioBase64, mimeType, sessionId, chatHistory);
      } else if (activeProvider === 'pollinations') {
        return await this.chatAudioWithPollinations(audioBase64, mimeType, sessionId, chatHistory);
      } else {
        // Ollama: không hỗ trợ audio, transcribe trước rồi chat
        throw new Error('Ollama không hỗ trợ gửi audio trực tiếp. Vui lòng chuyển sang Gemini hoặc Pollinations.');
      }
    } catch (error: any) {
      console.error('[Chatbot] chatWithAudio error:', error.message);
      throw error;
    }
  },

  /**
   * Gửi audio tới Gemini multimodal để TRANSCRIBE, rồi gửi text qua RAG pipeline
   * 2 bước: Gemini transcribe audio → RAG pipeline trả lời với dữ liệu thực
   */
  async chatAudioWithGemini(
    audioBase64: string,
    mimeType: string,
    sessionId?: string,
    chatHistory?: any[]
  ): Promise<ChatResponse> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY chưa được cấu hình');

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash'];

    // ===== STEP 1: Dùng Gemini multimodal để TRANSCRIBE audio thành text =====
    const transcribePrompt = `Phiên âm chính xác đoạn audio tiếng Việt này thành văn bản.

YÊU CẦU QUAN TRỌNG:
- CHỈ trả về văn bản phiên âm, KHÔNG giải thích, KHÔNG trả lời câu hỏi
- Giữ nguyên số liệu, ngày tháng chính xác như người nói (ví dụ: "tháng 1" thì ghi "tháng 1", KHÔNG đổi thành tháng khác)
- Viết đúng dấu thanh tiếng Việt
- Tên riêng viết hoa

CHỈ TRẢ VỀ VĂN BẢN PHIÊN ÂM.`;

    let transcribedText = '';
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Chatbot] Trying Gemini ${modelName} for audio transcription...`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent([
          transcribePrompt,
          { inlineData: { mimeType, data: audioBase64 } }
        ]);

        const response = await result.response;
        transcribedText = response.text()?.trim() || '';

        if (transcribedText) {
          console.log(`[Chatbot] ✅ Gemini ${modelName} transcribed: "${transcribedText}"`);
          break;
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`[Chatbot] Gemini ${modelName} transcription failed:`, error.message);
        continue;
      }
    }

    if (!transcribedText) {
      throw new Error(`Không thể phiên âm audio: ${lastError?.message || 'Tất cả models đều thất bại'}`);
    }

    // ===== STEP 2: Gửi text đã transcribe qua RAG pipeline (có dữ liệu lịch thực) =====
    console.log(`[Chatbot] Sending transcribed text to RAG pipeline: "${transcribedText}"`);
    const chatRes = await this.chat(transcribedText, sessionId, chatHistory);

    // Gắn nội dung transcribe vào đầu answer để user biết chatbot nghe được gì
    chatRes.answer = `[Người dùng nói: "${transcribedText}"]\n\n${chatRes.answer}`;
    chatRes.query = transcribedText;

    return chatRes;
  },

  /**
   * Gửi audio tới Pollinations - transcribe rồi dùng chat completions
   */
  async chatAudioWithPollinations(
    audioBase64: string,
    mimeType: string,
    sessionId?: string,
    chatHistory?: any[]
  ): Promise<ChatResponse> {
    const axiosLib = (await import('axios')).default;
    const FormData = (await import('form-data')).default;
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;
    const os = (await import('os')).default;

    const baseUrl = process.env.POLLINATIONS_BASE_URL || 'https://gen.pollinations.ai';
    const apiKey = process.env.POLLINATIONS_API_KEY || '';
    const model = process.env.POLLINATIONS_MODEL || 'openai';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    // Step 1: Transcribe audio via Pollinations Whisper
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const extMap: Record<string, string> = {
      'audio/webm': 'webm', 'audio/wav': 'wav', 'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3', 'audio/ogg': 'ogg'
    };
    const ext = extMap[mimeType] || 'webm';
    const tempFile = path.join(os.tmpdir(), `poll_chat_${Date.now()}.${ext}`);
    fs.writeFileSync(tempFile, audioBuffer);

    let transcribedText = '';
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(tempFile), { filename: `audio.${ext}`, contentType: mimeType });
      form.append('model', 'whisper-large-v3');
      form.append('language', 'vi');
      form.append('response_format', 'json');

      const sttHeaders: Record<string, string> = { ...form.getHeaders() };
      if (apiKey) sttHeaders['Authorization'] = `Bearer ${apiKey}`;

      const transcribeRes = await axiosLib.post(
        `${baseUrl}/v1/audio/transcriptions`,
        form,
        { headers: sttHeaders, timeout: 30000 }
      );
      transcribedText = transcribeRes.data?.text || '';
    } finally {
      try { fs.unlinkSync(tempFile); } catch { }
    }

    if (!transcribedText) {
      throw new Error('Không thể nhận dạng giọng nói từ audio.');
    }

    console.log(`[Chatbot] Pollinations transcribed: "${transcribedText}"`);

    // Step 2: Gửi text đã transcribe tới RAG pipeline bình thường
    const chatRes = await this.chat(transcribedText, sessionId, chatHistory);

    // Gắn thêm nội dung transcribe vào đầu answer
    chatRes.answer = `[Người dùng nói: "${transcribedText}"]\n\n${chatRes.answer}`;
    chatRes.query = transcribedText;

    return chatRes;
  }
};
