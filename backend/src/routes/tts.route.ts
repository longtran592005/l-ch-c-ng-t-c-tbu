/**
 * TTS Routes
 * Định nghĩa các API endpoints cho Text-to-Speech
 */

import { Router } from 'express';
import { ttsController } from '../controllers/tts.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// ============================================
// PUBLIC ROUTES (Không cần auth)
// ============================================

/**
 * @route   GET /api/tts/audio/:scheduleId/:voiceType
 * @desc    Lấy URL audio cho 1 lịch
 * @access  Public
 */
router.get('/audio/:scheduleId/:voiceType', ttsController.getAudio);

/**
 * @route   GET /api/tts/status/:scheduleId
 * @desc    Kiểm tra trạng thái audio (đã generate chưa)
 * @access  Public
 */
router.get('/status/:scheduleId', ttsController.getStatus);

/**
 * @route   GET /api/tts/voices
 * @desc    Lấy danh sách giọng đọc có sẵn
 * @access  Public
 */
router.get('/voices', ttsController.getVoices);

/**
 * @route   GET /api/tts/health
 * @desc    Kiểm tra trạng thái XTTS Service
 * @access  Public
 */
router.get('/health', ttsController.healthCheck);

// ============================================
// PROTECTED ROUTES (Cần auth + role admin)
// ============================================

/**
 * @route   POST /api/tts/generate/:scheduleId
 * @desc    Generate audio cho 1 lịch cụ thể (Public hoặc On-demand)
 * @access  Public
 */
router.post('/generate/:scheduleId', ttsController.generateForSchedule);

/**
 * @route   POST /api/tts/generate-all
 * @desc    Generate audio cho tất cả lịch (background job)
 * @access  Admin only
 */
router.post('/generate-all', authenticate, requireRole('admin'), ttsController.generateAll);

/**
 * @route   DELETE /api/tts/audio/:scheduleId
 * @desc    Xóa audio của 1 lịch
 * @access  Admin only
 */
router.delete('/audio/:scheduleId', authenticate, requireRole('admin'), ttsController.deleteAudio);

/**
 * @route   POST /api/tts/warmup
 * @desc    Load model vào VRAM trước
 * @access  Admin only
 */
router.post('/warmup', authenticate, requireRole('admin'), ttsController.warmup);

export default router;
