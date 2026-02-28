import { Router } from 'express';
import {
  chat,
  chatAudio,
  indexSchedules,
  indexDocument,
  indexNews,
  indexAnnouncements,
  reindexAll,
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
 * @route   POST /api/chatbot/index/schedules
 * @desc    Reindex schedules vào vector store
 * @access  Admin/BGH only
 */
router.post('/index/schedules', authenticate, requireRole('admin', 'ban_giam_hieu'), indexSchedules);

/**
 * @route   POST /api/chatbot/index/document
 * @desc    Index document (info.docx)
 * @access  Admin only
 */
router.post('/index/document', authenticate, requireRole('admin'), indexDocument);

/**
 * @route   POST /api/chatbot/index/news
 * @desc    Reindex news vào vector store
 * @access  Admin/BGH only
 */
router.post('/index/news', authenticate, requireRole('admin', 'ban_giam_hieu'), indexNews);

/**
 * @route   POST /api/chatbot/index/announcements
 * @desc    Reindex announcements vào vector store
 * @access  Admin/BGH only
 */
router.post('/index/announcements', authenticate, requireRole('admin', 'ban_giam_hieu'), indexAnnouncements);

/**
 * @route   POST /api/chatbot/reindex-all
 * @desc    Reindex tất cả dữ liệu
 * @access  Admin/BGH only
 */
router.post('/reindex-all', authenticate, requireRole('admin', 'ban_giam_hieu'), reindexAll);

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
