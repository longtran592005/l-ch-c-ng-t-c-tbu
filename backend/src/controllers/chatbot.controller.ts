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
 * Reindex schedules vào vector store
 * POST /api/chatbot/index/schedules
 */
export const indexSchedules = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatbotService.reindexSchedules();

    res.json({
      success: true,
      message: 'Schedules indexed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Index document (info.docx)
 * POST /api/chatbot/index/document
 */
export const indexDocument = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatbotService.indexDocument();

    res.json({
      success: true,
      message: 'Document indexed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reindex tất cả dữ liệu
 * POST /api/chatbot/reindex-all
 */
export const reindexAll = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatbotService.reindexAll();

    res.json({
      success: true,
      message: 'All data reindexed successfully',
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
