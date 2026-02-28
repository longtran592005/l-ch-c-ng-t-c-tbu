import prisma from '../config/database';

/**
 * AI Tools Service
 * Cung cấp các công cụ (Function Calling) cho Chatbot (Gemini/Pollinations)
 * để lấy dữ liệu tĩnh từ Database (Lịch công tác, Tin tức, Thông báo) trực tiếp mà không cần RAG/ChromaDB.
 */

export const aiToolsService = {
    /**
     * Lấy lịch công tác theo một ngày cụ thể
     * @param date Chuỗi ngày định dạng YYYY-MM-DD
     */
    async getSchedulesByDate(date: string) {
        try {
            const targetDate = new Date(date);
            // Lấy đầu ngày và cuối ngày
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

            const schedules = await prisma.schedule.findMany({
                where: {
                    date: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                    status: 'approved',
                },
                select: {
                    date: true,
                    startTime: true,
                    endTime: true,
                    content: true,
                    location: true,
                    leader: true,
                    participants: true,
                    preparingUnit: true,
                },
                orderBy: { startTime: 'asc' },
            });

            if (schedules.length === 0) {
                return `Không có lịch công tác nào được lên kế hoạch trong ngày ${date}.`;
            }

            return JSON.stringify(schedules);
        } catch (error: any) {
            console.error(`[AITools] Error in getSchedulesByDate(${date}):`, error.message);
            return `Đã xảy ra lỗi khi tra cứu lịch công tác ngày ${date}.`;
        }
    },

    /**
     * Lấy lịch công tác trong một khoảng thời gian (theo tuần/tháng)
     * @param startDate Chuỗi ngày bắt đầu YYYY-MM-DD
     * @param endDate Chuỗi ngày kết thúc YYYY-MM-DD
     */
    async getSchedulesByRange(startDate: string, endDate: string) {
        try {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const schedules = await prisma.schedule.findMany({
                where: {
                    date: {
                        gte: start,
                        lte: end,
                    },
                    status: 'approved',
                },
                select: {
                    date: true,
                    startTime: true,
                    endTime: true,
                    content: true,
                    location: true,
                    leader: true,
                },
                orderBy: [
                    { date: 'asc' },
                    { startTime: 'asc' }
                ],
            });

            if (schedules.length === 0) {
                return `Không có lịch công tác nào từ ngày ${startDate} đến ${endDate}.`;
            }

            return JSON.stringify(schedules);
        } catch (error: any) {
            console.error(`[AITools] Error in getSchedulesByRange(${startDate}, ${endDate}):`, error.message);
            return `Đã xảy ra lỗi khi tra cứu lịch công tác từ ${startDate} đến ${endDate}.`;
        }
    },

    /**
     * Lấy tin tức mới nhất
     * @param limit Số lượng tin tức cần lấy (mặc định 5, tối đa 10)
     */
    async getLatestNews(limit: number = 5) {
        try {
            const actualLimit = Math.min(Math.max(limit, 1), 10);

            const news = await prisma.news.findMany({
                take: actualLimit,
                orderBy: { publishedAt: 'desc' },
                select: {
                    title: true,
                    summary: true,
                    category: true,
                    publishedAt: true,
                }
            });

            if (news.length === 0) {
                return `Hiện tại không có tin tức nào mới.`;
            }

            return JSON.stringify(news);
        } catch (error: any) {
            console.error(`[AITools] Error in getLatestNews:`, error.message);
            return `Đã xảy ra lỗi khi lấy tin tức.`;
        }
    },

    /**
     * Lấy các thông báo đang hoạt động
     */
    async getActiveAnnouncements() {
        try {
            const announcements = await prisma.announcement.findMany({
                where: {
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                },
                orderBy: { priority: 'desc' },
                select: {
                    title: true,
                    content: true,
                    priority: true,
                    publishedAt: true,
                },
                take: 5
            });

            if (announcements.length === 0) {
                return `Không có thông báo nào đang hoạt động.`;
            }

            return JSON.stringify(announcements);
        } catch (error: any) {
            console.error(`[AITools] Error in getActiveAnnouncements:`, error.message);
            return `Đã xảy ra lỗi khi lấy thông báo.`;
        }
    }
};
