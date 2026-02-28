import { Request, Response, NextFunction } from 'express';
import { chatbotService } from '../services/chatbot.service';

/**
 * Chatbot Controller
 * Xử lý các request liên quan đến RAG Chatbot
 */

/**
 * Chat với RAG Chatbot
 * POST /api/chatbot/chat
 */
export const chat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, session_id, chat_history, source_type } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Message is required'
      });
      return;
    }

    const result = await chatbotService.chat(
      message.trim(),
      session_id,
      chat_history,
      source_type
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Lấy thống kê vector store
 * GET /api/chatbot/stats
 */
export const getStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await chatbotService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Health check cho RAG service
 * GET /api/chatbot/health
 */
export const healthCheck = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await chatbotService.checkHealth();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy danh sách LLM Providers
 * GET /api/chatbot/llm/providers
 */
export const getLLMProviders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatbotService.getLLMProviders();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Chuyển đổi LLM Provider
 * POST /api/chatbot/llm/switch
 */
export const switchLLM = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.body;
    if (!provider) {
      res.status(400).json({ success: false, error: 'Provider is required' });
      return;
    }
    const result = await chatbotService.switchLLM(provider);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset bộ nhớ chatbot
 * POST /api/chatbot/reset-memory
 */
export const resetMemory = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatbotService.resetMemory();
    res.json({
      success: true,
      message: 'Đã reset bộ nhớ chatbot thành công',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Chat bằng audio (gửi audio trực tiếp tới Gemini/Pollinations)
 * POST /api/chatbot/chat-audio
 */
export const chatAudio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { audioBase64, mimeType, session_id, chat_history } = req.body;

    if (!audioBase64 || !mimeType) {
      res.status(400).json({
        success: false,
        error: 'audioBase64 and mimeType are required'
      });
      return;
    }

    const result = await chatbotService.chatWithAudio(
      audioBase64,
      mimeType,
      session_id,
      chat_history
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
