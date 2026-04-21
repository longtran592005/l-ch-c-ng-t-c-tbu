import prisma from '../config/database';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { aiToolsService, isScheduleQuery, parseDateFromVietnamese } from './aiTools.service';

/**
 * Chatbot Service
 * Quản lý hội thoại Agentic AI qua Gemini Function Calling và Pollinations.
 */

let cachedActiveProvider: string | null = 'pollinations';

const getBaseMimeType = (mimeType: string): string => {
  return mimeType.split(';')[0].trim().toLowerCase();
};

export interface ChatResponse {
  answer: string;
  sources: Array<any>;
  query: string;
  session_id?: string;
}

export const chatbotService = {
  /**
   * Lấy danh sách providers
   */
  async getLLMProviders(): Promise<any> {
    return {
      active: cachedActiveProvider || 'gemini',
      providers: [
        { id: 'gemini', name: 'Google Gemini (Cloud)', model: 'gemini-3-flash/gemini-2.5-flash' },
        { id: 'opencode', name: 'OpenCode Zen (Cloud)', model: 'gpt-5-nano' },
        { id: 'pollinations', name: 'Pollinations.ai (Cloud)', model: 'openai' }
      ]
    };
  },

  /**
   * Chuyển đổi LLM provider
   */
  async switchLLM(provider: string): Promise<any> {
    cachedActiveProvider = provider;
    return { status: 'success', message: `Đã đổi sang ${provider}` };
  },

  /**
   * Khởi tạo và thiết lập Gemini Tools
   */
  setupGeminiTools() {
    const getSchedulesByDateDeclaration: FunctionDeclaration = {
      name: "get_schedules_by_date",
      description: "Sử dụng để tra cứu lịch công tác của nhà trường cho MỘT ngày cụ thể.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          date: {
            type: SchemaType.STRING,
            description: "Ngày cần tra cứu theo định dạng YYYY-MM-DD. Ví dụ: '2026-03-01'",
          },
        },
        required: ["date"],
      },
    };

    const getSchedulesByRangeDeclaration: FunctionDeclaration = {
      name: "get_schedules_by_range",
      description: "Sử dụng để tra cứu lịch công tác của nhà trường trong NHIỀU ngày hoặc một TUẦN.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          startDate: {
            type: SchemaType.STRING,
            description: "Ngày bắt đầu theo định dạng YYYY-MM-DD",
          },
          endDate: {
            type: SchemaType.STRING,
            description: "Ngày kết thúc theo định dạng YYYY-MM-DD",
          }
        },
        required: ["startDate", "endDate"],
      },
    };

    const getLatestNewsDeclaration: FunctionDeclaration = {
      name: "get_latest_news",
      description: "Lấy danh sách các tin tức, sự kiện mới nhất trên website của trường.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: {
            type: SchemaType.NUMBER,
            description: "Số lượng tin tức muốn lấy (từ 1 đến 10, khuyên dùng 5)",
          },
        },
      },
    };

    const getActiveAnnouncementsDeclaration: FunctionDeclaration = {
      name: "get_active_announcements",
      description: "Lấy các thông báo quan trọng đang có hiệu lực trong nhà trường.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {},
      }
    };

    return [
      getSchedulesByDateDeclaration,
      getSchedulesByRangeDeclaration,
      getLatestNewsDeclaration,
      getActiveAnnouncementsDeclaration
    ];
  },

  /**
   * Xử lý Function Calling của Gemini
   */
  async handleFunctionCalling(functionCall: any) {
    const { name, args } = functionCall;

    switch (name) {
      case 'get_schedules_by_date':
        return await aiToolsService.getSchedulesByDate(args.date);
      case 'get_schedules_by_range':
        return await aiToolsService.getSchedulesByRange(args.startDate, args.endDate);
      case 'get_latest_news':
        return await aiToolsService.getLatestNews(args.limit || 5);
      case 'get_active_announcements':
        return await aiToolsService.getActiveAnnouncements();
      default:
        return `Function ${name} không tồn tại.`;
    }
  },

  /**
   * Chat với Gemini (Agentic AI)
   */
  async chatWithGeminiInner(message: string, chatHistory: any[] = []): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Cấu hình thiếu GEMINI_API_KEY');

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelOptions = {
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      tools: [{ functionDeclarations: this.setupGeminiTools() }],
      systemInstruction: `Bạn là trợ lý AI ảo của Trường Đại học Thái Bình (TBU). 
Nhiệm vụ của bạn là hỗ trợ sinh viên và giảng viên tra cứu lịch công tác, tin tức, thông báo.
Hôm nay là ngày ${new Date().toISOString().split('T')[0]}.
Nguyên tắc:
1. Luôn sử dụng Function Tool để tìm kiếm dữ liệu thực tế (Lịch, Tin tức) trước khi trả lời. 
2. Không bịa đặt thông tin nếu không tìm thấy trong Tool. 
3. Trả lời ngắn gọn, lịch sự, thân thiện. Giữ form markdown cho đẹp.
4. Nếu tìm được lịch công tác, hãy format rõ ràng thời gian, địa điểm, thành phần.`,
    };

    // Chuẩn bị history cho Gemini
    const formattedHistory = chatHistory.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    const model = genAI.getGenerativeModel(modelOptions);
    const chatSession = model.startChat({ history: formattedHistory });

    let result = await chatSession.sendMessage(message);
    const call = result.response.functionCalls()?.[0];

    // Xử lý Function Calling
    if (call) {
      console.log(`[Gemini Agent] Calling tool: ${call.name} with args:`, call.args);
      const functionResult = await this.handleFunctionCalling(call);

      // Gửi kết quả của hàm lại cho model
      result = await chatSession.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: { result: functionResult }
          }
        }
      ]);
    }

    return result.response.text();
  },

  /**
   * Chat với Pollinations (Fallback/Stuffing Context)
   */
  async chatWithPollinationsInner(message: string, chatHistory: any[] = [], extraScheduleContext?: string): Promise<string> {
    const axiosLib = (await import('axios')).default;
    const baseUrl = process.env.POLLINATIONS_BASE_URL || 'https://text.pollinations.ai';

    // System message với bối cảnh thời gian thực
    const systemPrompt = `Bạn là trợ lý ảo của ĐH Thái Bình. Hôm nay là ${new Date().toISOString().split('T')[0]}. Trả lời ngắn gọn, rõ ràng. Nếu tìm thấy lịch công tác, hãy format chi tiết thời gian, địa điểm, nội dung, lãnh đạo. Nếu không có lịch, hãy nói rõ không tìm thấy.`;

    // Lấy context: ưu tiên schedule context từ pre-search, fallback sang today
    let scheduleContext = extraScheduleContext;
    if (!scheduleContext) {
      scheduleContext = await aiToolsService.getSchedulesByDate(new Date().toISOString().split('T')[0]);
    }
    const announcements = await aiToolsService.getActiveAnnouncements();

    const contextStr = `DỮ LIỆU TRA CỨU:\n- Lịch công tác:\n${scheduleContext}\n- Thông báo:\n${announcements}`;

    const url = `${baseUrl}/v1/chat/completions`;
    const payload = {
      model: 'openai',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: contextStr },
        ...chatHistory.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
        { role: 'user', content: message }
      ]
    };

    const res = await axiosLib.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
    return res.data?.choices?.[0]?.message?.content || 'Xin lỗi, Pollinations AI không thể phản hồi lúc này.';
  },

  /**
   * Chat với OpenCode Zen (gpt-5-nano) API
   */
  async chatWithOpenCodeInner(message: string, chatHistory: any[] = [], extraScheduleContext?: string): Promise<string> {
    const axiosLib = (await import('axios')).default;
    const apiKey = process.env.OPENCODE_API_KEY;
    const baseUrl = process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1';

    if (!apiKey) {
      console.warn('[Chatbot/OpenCode] API key missing, falling back to Pollinations');
      return await this.chatWithPollinationsInner(message, chatHistory, extraScheduleContext);
    }

    const systemPrompt = `Bạn là trợ lý ảo của ĐH Thái Bình. Hôm nay là ${new Date().toISOString().split('T')[0]}. Trả lời ngắn gọn, lịch sự, thân thiện. Nếu tìm thấy lịch công tác, hãy format chi tiết. Nếu không có lịch, nói rõ không tìm thấy.`;

    // Lấy context: ưu tiên schedule context từ pre-search
    let scheduleContext = extraScheduleContext;
    if (!scheduleContext) {
      scheduleContext = await aiToolsService.getSchedulesByDate(new Date().toISOString().split('T')[0]);
    }
    const announcements = await aiToolsService.getActiveAnnouncements();

    const contextStr = `DỮ LIỆU TRA CỨU:\n- Lịch công tác:\n${scheduleContext}\n- Thông báo:\n${announcements}`;

    const url = `${baseUrl}/chat/completions`;
    const openCodeModel = process.env.OPENCODE_MODEL || 'gpt-5-nano';
    const payload = {
      model: openCodeModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: contextStr },
        ...chatHistory.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
        { role: 'user', content: message }
      ]
    };

    const res = await axiosLib.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return res.data?.choices?.[0]?.message?.content || 'Xin lỗi, OpenCode Zen không thể phản hồi lúc này.';
  },

  /**
   * Gửi message đến AI (Entry point chung)
   */
  async chat(
    message: string,
    sessionId?: string,
    chatHistoryData?: any[],
    _sourceType?: string
  ): Promise<ChatResponse> {
    try {
      // 1. Fetch History from DB
      let historyToUse: any[] = [];
      if (sessionId) {
        const dbHistory = await prisma.chatHistory.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
          take: 10
        });

        historyToUse = dbHistory.flatMap(h => [
          { role: 'user', content: h.userMessage },
          { role: 'bot', content: h.botResponse }
        ]);
      } else if (chatHistoryData) {
        historyToUse = chatHistoryData; // dùng log client gửi lên
      }

      // 2. Pre-search schedules from user message (for ALL providers)
      const scheduleSearch = await aiToolsService.searchSchedulesFromMessage(message);

      // 3. Select Provider
      const activeProvider = cachedActiveProvider || 'gemini';
      console.log(`[Chatbot] Processing chat with provider: ${activeProvider}`);

      let answerText = '';
      if (activeProvider === 'pollinations') {
        answerText = await this.chatWithPollinationsInner(message, historyToUse, scheduleSearch?.contextText);
      } else if (activeProvider === 'opencode') {
        answerText = await this.chatWithOpenCodeInner(message, historyToUse, scheduleSearch?.contextText);
      } else {
        answerText = await this.chatWithGeminiInner(message, historyToUse);
      }

      // 4. Build sources from found schedules (for frontend navigation)
      const sources: any[] = [];
      if (scheduleSearch && scheduleSearch.schedules.length > 0) {
        for (const sched of scheduleSearch.schedules) {
          sources.push({
            content: sched.content,
            metadata: {
              id: sched.id,
              date: sched.date,
              startTime: sched.startTime,
              endTime: sched.endTime,
              content: sched.content,
              location: sched.location,
              leader: sched.leader,
            },
            score: 1.0,
            source_type: 'schedule',
            source_id: sched.id,
          });
        }
        console.log(`[Chatbot] Returning ${sources.length} schedule sources for navigation`);
      }

      // 5. Save to DB
      if (sessionId) {
        try {
          await prisma.chatHistory.create({
            data: {
              sessionId,
              userMessage: message,
              botResponse: answerText,
              retrievedDocs: JSON.stringify(sources.map(s => s.source_id).filter(Boolean))
            }
          });
        } catch (dbError) {
          console.error('[Chatbot] Failed to save chat history:', dbError);
        }
      }

      return {
        answer: answerText,
        sources,
        query: message,
        session_id: sessionId
      };

    } catch (error: any) {
      console.error('[Chatbot] Chat error:', error.message);
      throw new Error(error.message || 'Failed to get chatbot response');
    }
  },

  /**
   * Xử lý file Audio Chat (Tương thích)
   */
  async chatWithAudio(
    audioBase64: string,
    mimeType: string,
    sessionId?: string,
    chatHistory?: any[]
  ): Promise<ChatResponse> {
    try {
      const activeProvider = cachedActiveProvider || 'gemini';
      console.log(`[Chatbot] chatWithAudio using provider: ${activeProvider}`);

      if (activeProvider === 'gemini') {
        return await this.chatAudioWithGemini(audioBase64, mimeType, sessionId, chatHistory);
      } else if (activeProvider === 'pollinations' || activeProvider === 'opencode') {
        // Reuse Pollinations STT for OpenCode since it's free/fast, and then 'this.chat' routes to opencode appropriately
        return await this.chatAudioWithPollinations(audioBase64, mimeType, sessionId, chatHistory);
      } else {
        throw new Error('Cấu hình Provider không hợp lệ.');
      }
    } catch (error: any) {
      console.error('[Chatbot] chatWithAudio error:', error.message);
      throw error;
    }
  },

  /**
   * Gemini STT + Agentic Chat
   */
  async chatAudioWithGemini(
    audioBase64: string,
    mimeType: string,
    sessionId?: string,
    chatHistory?: any[]
  ): Promise<ChatResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY chưa được cấu hình');

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    const normalizedMimeType = getBaseMimeType(mimeType);
    const transcribePrompt = `Phiên âm chính xác đoạn audio tiếng Việt này thành văn bản. CHỈ trả về văn bản phiên âm.`;

    let transcribedText = '';
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          transcribePrompt,
          { inlineData: { mimeType: normalizedMimeType, data: audioBase64 } }
        ]);
        transcribedText = result.response.text()?.trim() || '';
        if (transcribedText) break;
      } catch (e) {
        continue;
      }
    }

    if (!transcribedText) throw new Error('Không thể phiên âm audio với Gemini');

    console.log(`[Chatbot] Gemini transcribed for chat: "${transcribedText}"`);
    const chatRes = await this.chat(transcribedText, sessionId, chatHistory);
    chatRes.answer = `[Giọng nói: "${transcribedText}"]\n\n${chatRes.answer}`;
    chatRes.query = transcribedText;
    return chatRes;
  },

  /**
   * Pollinations STT + Pollinations Chat
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

    const sttBaseUrl = process.env.POLLINATIONS_STT_URL || 'https://gen.pollinations.ai';
    const normalizedMimeType = getBaseMimeType(mimeType);
    const tempFile = path.join(os.tmpdir(), `poll_chat_${Date.now()}.webm`);
    fs.writeFileSync(tempFile, Buffer.from(audioBase64, 'base64'));

    let transcribedText = '';
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(tempFile), { filename: 'audio.webm', contentType: normalizedMimeType });
      form.append('model', 'whisper-large-v3');
      form.append('language', 'vi');

      const sttHeaders = { ...form.getHeaders() };
      const transcribeRes = await axiosLib.post(`${sttBaseUrl}/v1/audio/transcriptions`, form, { headers: sttHeaders });
      transcribedText = transcribeRes.data?.text || '';
    } finally {
      try { fs.unlinkSync(tempFile); } catch { }
    }

    if (!transcribedText) throw new Error('Không thể nhận dạng giọng nói từ audio.');
    const chatRes = await this.chat(transcribedText, sessionId, chatHistory);
    chatRes.answer = `[Giọng nói: "${transcribedText}"]\n\n${chatRes.answer}`;
    chatRes.query = transcribedText;
    return chatRes;
  },

  /**
   * Lấy lịch sử đoạn chat gần nhất
   */
  async getChatHistory(sessionId: string, limit: number = 20): Promise<any[]> {
    try {
      const history = await prisma.chatHistory.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      return history.reverse();
    } catch {
      return [];
    }
  },

  /**
   * Database Stats Dummy for UI Compatibility
   */
  async getStats(): Promise<any> {
    return {
      total: await prisma.schedule.count(),
      by_source: {
        schedules: await prisma.schedule.count(),
        news: await prisma.news.count(),
        announcements: await prisma.announcement.count()
      }
    };
  },

  /**
   * Reset bộ nhớ
   */
  async resetMemory(): Promise<any> {
    try {
      const deleted = await prisma.chatHistory.deleteMany({});
      return { chatHistory: { deleted: deleted.count } };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  /**
   * Health Check
   */
  async checkHealth(): Promise<any> {
    return {
      status: 'ok',
      service: 'tbu-agentic-ai',
      models: { embedding: 'none', llm: cachedActiveProvider || 'gemini' },
      vector_store: { total: await prisma.schedule.count() }
    };
  }
};
