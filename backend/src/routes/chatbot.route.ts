import { Router } from 'express';
import {
  chat,
  chatAudio,
  getStats,
  healthCheck,
  getLLMProviders,
  switchLLM,
  resetMemory
} from '../controllers/chatbot.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

/**
 * Chatbot Routes
 * Các endpoint cho RAG Chatbot
 */

// ============================================
// PUBLIC ROUTES (Không cần auth)
// ============================================

/**
 * @route   POST /api/chatbot/chat
 * @desc    Chat với RAG Chatbot
 * @access  Public
 */
router.post('/chat', chat);

/**
 * @route   POST /api/chatbot/chat-audio
 * @desc    Chat bằng audio (gửi trực tiếp tới Gemini/Pollinations)
 * @access  Public
 */
router.post('/chat-audio', chatAudio);

/**
 * @route   GET /api/chatbot/health
 * @desc    Health check cho RAG service
 * @access  Public
 */
router.get('/health', healthCheck);

// ============================================
// PROTECTED ROUTES (Cần auth)
// ============================================

/**
 * @route   GET /api/chatbot/stats
 * @desc    Lấy thống kê vector store
 * @access  Admin/BGH only
 */
router.get('/stats', authenticate, requireRole('admin', 'ban_giam_hieu'), getStats);

/**
 * @route   GET /api/chatbot/llm/providers
 * @desc    Lấy danh sách LLM providers
 * @access  Admin only
 */
router.get('/llm/providers', authenticate, requireRole('admin'), getLLMProviders);

/**
 * @route   POST /api/chatbot/llm/switch
 * @desc    Chuyển đổi LLM provider
 * @access  Admin only
 */
router.post('/llm/switch', authenticate, requireRole('admin'), switchLLM);

/**
 * @route   POST /api/chatbot/reset-memory
 * @desc    Reset bộ nhớ chatbot (xóa cache + lịch sử chat)
 * @access  Admin only
 */
router.post('/reset-memory', authenticate, requireRole('admin'), resetMemory);

export default router;
