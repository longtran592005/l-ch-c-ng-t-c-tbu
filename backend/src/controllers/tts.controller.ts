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
    generateForSchedule: async (req: Request, res: Response): Promise<void> => {
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
     * POST /api/tts/sync-all
     * Đồng bộ lại TTS cho 5 tuần gần nhất (3 tuần trước, tuần này, tuần sau)
     */
    syncAll: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Kiểm tra xem có đang đồng bộ không
            if (ttsService.syncProgress.isSyncing) {
                res.status(400).json({
                    success: false,
                    message: 'Một quá trình đồng bộ đang diễn ra. Vui lòng đợi.'
                });
                return;
            }

            // 1. Tính toán khoảng ngày
            const now = new Date();
            const dayOfWeek = now.getDay();
            const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const currentMonday = new Date(now);
            currentMonday.setDate(now.getDate() - diffToMonday);
            currentMonday.setHours(0, 0, 0, 0);

            const startDate = new Date(currentMonday);
            startDate.setDate(currentMonday.getDate() - (3 * 7));
            const endDate = new Date(currentMonday);
            endDate.setDate(currentMonday.getDate() + 13);
            endDate.setHours(23, 59, 59, 999);

            // 2. Lấy danh sách lịch
            const schedules = await prisma.schedule.findMany({
                where: {
                    status: 'approved',
                    date: { gte: startDate, lte: endDate }
                },
                orderBy: { date: 'desc' }
            });

            if (schedules.length === 0) {
                res.json({
                    success: true,
                    message: 'Không tìm thấy lịch để đồng bộ.'
                });
                return;
            }

            // Khởi tạo trạng thái đồng bộ
            ttsService.syncProgress = {
                isSyncing: true,
                current: 0,
                total: schedules.length,
                startTime: new Date(),
                status: 'starting'
            };

            // 3. Xóa và tạo lại (Background)
            const processSync = async () => {
                for (let i = 0; i < schedules.length; i++) {
                    const schedule = schedules[i];
                    try {
                        ttsService.syncProgress.status = `Đang xử lý: ${schedule.content.substring(0, 30)}...`;
                        await ttsService.deleteAudio(schedule.id);
                        await ttsService.generateAllVoices(schedule);

                        ttsService.syncProgress.current = i + 1;
                    } catch (err) {
                        console.error(`[TTS Sync] Lỗi ${schedule.id}:`, err);
                    }
                }

                ttsService.syncProgress.isSyncing = false;
                ttsService.syncProgress.status = 'completed';
                console.log(`[TTS Sync] Hoàn thành ${schedules.length} lịch`);
            };

            processSync().catch(err => {
                ttsService.syncProgress.isSyncing = false;
                ttsService.syncProgress.status = 'error';
                console.error('[TTS Sync] Lỗi nghiêm trọng:', err);
            });

            res.json({
                success: true,
                message: `Bắt đầu đồng bộ ${schedules.length} lịch...`,
                total: schedules.length
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/tts/sync-progress
     * Lấy tiến độ đồng bộ hiện tại
     */
    getSyncProgress: async (_req: Request, res: Response): Promise<void> => {
        res.json({
            success: true,
            data: ttsService.syncProgress
        });
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
        const health = await ttsService.checkHealth() as { available: boolean; modelLoaded: boolean; error?: string };

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
    },

    /**
     * GET /api/tts/abbreviations
     */
    getAbbreviations: async (_req: Request, res: Response): Promise<void> => {
        const abbrs = ttsService.getAbbreviations();
        res.json({ success: true, data: abbrs });
    },

    /**
     * POST /api/tts/abbreviations
     */
    updateAbbreviations: async (req: Request, res: Response): Promise<void> => {
        try {
            const { abbreviations } = req.body;
            if (!Array.isArray(abbreviations)) {
                res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
                return;
            }
            ttsService.saveAbbreviations(abbreviations);
            res.json({ success: true, message: 'Đã cập nhật danh sách viết tắt' });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Lỗi server' });
        }
    }
};

export default ttsController;
