/**
 * TTS Controller
 * Xử lý các HTTP requests liên quan đến Text-to-Speech
 */

import { Request, Response, NextFunction } from 'express';
import { ttsService, VoiceType } from '../services/tts.service';
import prisma from '../config/database';

export const ttsController = {
    /**
     * GET /api/tts/audio/:scheduleId/:voiceType
     * Lấy URL audio cho 1 lịch cụ thể
     */
    getAudio: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { scheduleId, voiceType } = req.params;

            // Validate voice type
            if (!['male', 'female'].includes(voiceType)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid voice type. Must be "male" or "female"'
                });
                return;
            }

            // Kiểm tra schedule tồn tại
            const schedule = await prisma.schedule.findUnique({
                where: { id: scheduleId }
            });

            if (!schedule) {
                res.status(404).json({
                    success: false,
                    error: 'Schedule not found'
                });
                return;
            }

            // Lấy audio URL
            const audioUrl = ttsService.getAudioUrl(scheduleId, voiceType as VoiceType);

            if (!audioUrl) {
                res.status(404).json({
                    success: false,
                    error: 'Audio not found. Please generate first.',
                    needsGeneration: true
                });
                return;
            }

            res.json({
                success: true,
                audioUrl,
                voiceType,
                scheduleId
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/tts/status/:scheduleId
     * Kiểm tra trạng thái audio của 1 lịch (đã generate chưa)
     */
    getStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { scheduleId } = req.params;

            const audioStatus = ttsService.hasAllAudio(scheduleId);

            res.json({
                success: true,
                scheduleId,
                audio: {
                    male: {
                        available: audioStatus.male,
                        url: audioStatus.male ? ttsService.getAudioUrl(scheduleId, 'male') : null
                    },
                    female: {
                        available: audioStatus.female,
                        url: audioStatus.female ? ttsService.getAudioUrl(scheduleId, 'female') : null
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/tts/generate/:scheduleId
     * Generate/Regenerate audio cho 1 lịch cụ thể
     */
    generateForSchedule: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { scheduleId } = req.params;
            const { voiceType } = req.body; // Optional: chỉ generate 1 giọng

            // Lấy schedule từ DB
            const schedule = await prisma.schedule.findUnique({
                where: { id: scheduleId }
            });

            if (!schedule) {
                res.status(404).json({
                    success: false,
                    error: 'Schedule not found'
                });
                return;
            }

            // Generate
            if (voiceType && ['male', 'female'].includes(voiceType)) {
                // Generate 1 giọng cụ thể
                const result = await ttsService.generateAudio(schedule, voiceType as VoiceType);

                res.json({
                    success: result.success,
                    message: result.success ? 'Audio generated successfully' : 'Generation failed',
                    voiceType,
                    audioUrl: result.audioUrl,
                    duration: result.duration,
                    error: result.error
                });
            } else {
                // Generate cả 2 giọng
                const results = await ttsService.generateAllVoices(schedule);

                res.json({
                    success: results.male.success && results.female.success,
                    message: 'Audio generation completed',
                    results: {
                        male: {
                            success: results.male.success,
                            audioUrl: results.male.audioUrl,
                            error: results.male.error
                        },
                        female: {
                            success: results.female.success,
                            audioUrl: results.female.audioUrl,
                            error: results.female.error
                        }
                    }
                });
            }
        } catch (error: any) {
            console.error('[TTS Controller] Error generating audio:', error.message);
            res.status(500).json({
                success: false,
                error: error.message || 'Lỗi không xác định khi tạo âm thanh'
            });
        }
    },

    /**
     * POST /api/tts/generate-all
     * Generate audio cho tất cả lịch đã approved (Admin only, chạy background)
     */
    generateAll: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Lấy tất cả lịch approved
            const schedules = await prisma.schedule.findMany({
                where: { status: 'approved' },
                orderBy: { date: 'desc' }
            });

            if (schedules.length === 0) {
                res.json({
                    success: true,
                    message: 'No approved schedules to process'
                });
                return;
            }

            // Chạy background (không chờ)
            const processInBackground = async () => {
                let successCount = 0;
                let errorCount = 0;

                for (const schedule of schedules) {
                    try {
                        const results = await ttsService.generateAllVoices(schedule);
                        if (results.male.success && results.female.success) {
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    } catch (err) {
                        errorCount++;
                        console.error(`[TTS] Error processing schedule ${schedule.id}:`, err);
                    }
                }

                console.log(`[TTS] Batch complete: ${successCount} success, ${errorCount} errors`);
            };

            // Fire and forget
            processInBackground().catch(console.error);

            res.json({
                success: true,
                message: `Processing ${schedules.length} schedules in background`,
                totalSchedules: schedules.length
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /api/tts/audio/:scheduleId
     * Xóa audio của 1 lịch (Admin only)
     */
    deleteAudio: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { scheduleId } = req.params;

            await ttsService.deleteAudio(scheduleId);

            res.json({
                success: true,
                message: 'Audio files deleted'
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/tts/health
     * Kiểm tra trạng thái XTTS Service
     */
    healthCheck: async (_req: Request, res: Response): Promise<void> => {
        const health = await ttsService.checkHealth();

        res.json({
            success: true,
            service: 'XTTS v2',
            status: health.available ? 'available' : 'unavailable',
            modelLoaded: health.modelLoaded,
            error: health.error
        });
    },

    /**
     * GET /api/tts/voices
     * Lấy danh sách giọng đọc có sẵn
     */
    getVoices: async (_req: Request, res: Response): Promise<void> => {
        const voices = await ttsService.getAvailableVoices();

        res.json({
            success: true,
            voices
        });
    },

    /**
     * POST /api/tts/warmup
     * Load model vào VRAM trước (Admin only)
     */
    warmup: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const success = await ttsService.warmupModel();

            res.json({
                success,
                message: success ? 'Model loaded to GPU' : 'Failed to warmup model'
            });
        } catch (error) {
            next(error);
        }
    }
};

export default ttsController;
