import { Router } from 'express';
import {
  chat,
  indexSchedules,
  indexDocument,
  reindexAll,
  getStats,
  healthCheck
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
 * @access  Admin only
 */
router.get('/stats', authenticate, requireRole('admin'), getStats);

/**
 * @route   POST /api/chatbot/index/schedules
 * @desc    Reindex schedules vào vector store
 * @access  Admin only
 */
router.post('/index/schedules', authenticate, requireRole('admin'), indexSchedules);

/**
 * @route   POST /api/chatbot/index/document
 * @desc    Index document (info.docx)
 * @access  Admin only
 */
router.post('/index/document', authenticate, requireRole('admin'), indexDocument);

/**
 * @route   POST /api/chatbot/reindex-all
 * @desc    Reindex tất cả dữ liệu
 * @access  Admin only
 */
router.post('/reindex-all', authenticate, requireRole('admin'), reindexAll);

export default router;
