/**
 * AI Chatbot Controller
 * Xử lý requests chatbot với AI
 *
 * @author Trường Đại học Thái Bình
 */

import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import * as groqAI from '../services/groqAI.service';
import { ChatMessage } from '../services/groqAI.service';

/**
 * Handle AI chat request
 */
export const handleAIChat = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { question, conversationHistory } = req.body;

  // Validate input
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Câu hỏi không được để trống',
      },
    });
  }

  // Validate question length
  if (question.length > 1000) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'QUESTION_TOO_LONG',
        message: 'Câu hỏi quá dài. Vui lòng tóm tắt câu hỏi.',
      },
    });
  }

  try {
    // Process with AI
    const result = await groqAI.processWithAI(question, conversationHistory as ChatMessage[]);

    return res.status(200).json({
      success: true,
      data: {
        answer: result.answer,
        model: result.model,
        tokens: result.tokens,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Handle AI chat request with context
 */
export const handleAIChatWithContext = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { question, context, conversationHistory } = req.body;

  // Validate input
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Câu hỏi không được để trống',
      },
    });
  }

  if (!context || typeof context !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_CONTEXT',
        message: 'Context không hợp lệ',
      },
    });
  }

  try {
    // Process with AI and context
    const result = await groqAI.processWithAIContext(
      question,
      context,
      conversationHistory as ChatMessage[]
    );

    return res.status(200).json({
      success: true,
      data: {
        answer: result.answer,
        model: result.model,
        tokens: result.tokens,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Validate API key
 */
export const handleValidateAPIKey = asyncHandler(async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const isValid = await groqAI.validateAPIKey();

    return res.status(200).json({
      success: true,
      data: {
        valid: isValid,
        message: isValid ? 'API key hợp lệ' : 'API key không hợp lệ',
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get available models
 */
export const handleGetModels = asyncHandler(async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const models = groqAI.getAvailableModels();

    return res.status(200).json({
      success: true,
      data: models,
    });
  } catch (error: any) {
    next(error);
  }
});
