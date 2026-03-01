import prisma from '../config/database';

/**
 * AI Tools Service
 * Cung cấp các công cụ (Function Calling) cho Chatbot (Gemini/Pollinations)
 * để lấy dữ liệu tĩnh từ Database (Lịch công tác, Tin tức, Thông báo) trực tiếp mà không cần RAG/ChromaDB.
 */

// ============================================================
// Vietnamese Date Parser — trích xuất ngày từ câu hỏi tiếng Việt
// ============================================================

const VIET_NUMS: Record<string, number> = {
    'không': 0, 'linh': 0, 'lẻ': 0,
    'một': 1, 'mốt': 1, 'hai': 2, 'ba': 3,
    'bốn': 4, 'tư': 4, 'năm': 5, 'lăm': 5,
    'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9,
    'mười': 10, 'mươi': 10,
};

function viWordToNum(text: string): number | null {
    const t = text.trim().toLowerCase();
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    if (VIET_NUMS[t] !== undefined) return VIET_NUMS[t];
    // "mười X" → 10 + X
    const m1 = t.match(/^mười\s+(.+)$/);
    if (m1 && VIET_NUMS[m1[1].trim()] !== undefined) return 10 + VIET_NUMS[m1[1].trim()];
    // "X mươi Y"
    const m2 = t.match(/^(\S+)\s+mươi(?:\s+(.+))?$/);
    if (m2 && VIET_NUMS[m2[1]] !== undefined) {
        const tens = VIET_NUMS[m2[1]];
        const units = m2[2]?.trim() ? (VIET_NUMS[m2[2].trim()] ?? 0) : 0;
        return tens * 10 + units;
    }
    return null;
}

export interface ParsedDateIntent {
    dates: string[];         // YYYY-MM-DD array
    period?: 'morning' | 'afternoon' | 'all';  // sáng/chiều/cả ngày
    isRange?: boolean;
}

/**
 * Parse Vietnamese text to extract date intent
 * Returns array of YYYY-MM-DD dates + optional period (morning/afternoon)
 */
export function parseDateFromVietnamese(text: string): ParsedDateIntent | null {
    const t = text.toLowerCase().trim();
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    const day = today.getDate();

    // Detect period (morning/afternoon)
    let period: 'morning' | 'afternoon' | 'all' = 'all';
    if (/\bsáng\b/.test(t)) period = 'morning';
    if (/\bchiều\b|\btối\b/.test(t)) period = 'afternoon';

    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // "hôm nay" / "chiều nay" / "sáng nay"
    if (/hôm\s*nay|chiều\s*nay|sáng\s*nay|ngày\s*hôm\s*nay/.test(t)) {
        return { dates: [fmt(today)], period };
    }

    // "ngày mai" / "sáng mai" / "chiều mai"
    if (/ngày\s*mai|sáng\s*mai|chiều\s*mai/.test(t)) {
        const d = new Date(today); d.setDate(day + 1);
        return { dates: [fmt(d)], period };
    }

    // "ngày kia" / "ngày mốt"
    if (/ngày\s*(kia|mốt)/.test(t)) {
        const d = new Date(today); d.setDate(day + 2);
        return { dates: [fmt(d)], period };
    }

    // "hôm qua"
    if (/hôm\s*qua/.test(t)) {
        const d = new Date(today); d.setDate(day - 1);
        return { dates: [fmt(d)], period };
    }

    // "tuần này" / "tuần tới" / "tuần sau"
    const weekMatch = t.match(/tuần\s*(này|tới|sau|trước)/);
    if (weekMatch) {
        const dayOfWeek = today.getDay(); // 0=Sun
        let mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        if (weekMatch[1] === 'tới' || weekMatch[1] === 'sau') mondayOffset += 7;
        if (weekMatch[1] === 'trước') mondayOffset -= 7;
        const monday = new Date(today); monday.setDate(day + mondayOffset);
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday); d.setDate(monday.getDate() + i);
            dates.push(fmt(d));
        }
        return { dates, period, isRange: true };
    }

    // "ngày X tháng Y" / "ngày X/Y" / "X tháng Y" / "X/Y"
    const dateRegex = /(?:ngày\s+)?(\d{1,2})\s*([/-]|tháng)\s*(\d{1,2})/i;
    const dm = t.match(dateRegex);
    if (dm) {
        const d = parseInt(dm[1], 10);
        const m = parseInt(dm[3], 10);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
            return { dates: [`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`], period };
        }
    }

    // Vietnamese word dates: "ngày mười lăm tháng ba"
    const wordDateRegex = /(?:ngày\s+)(.+?)\s+tháng\s+(.+?)(?:\s|$)/i;
    const wm = t.match(wordDateRegex);
    if (wm) {
        const d = viWordToNum(wm[1]);
        const m = viWordToNum(wm[2]);
        if (d && m && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
            return { dates: [`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`], period };
        }
    }

    // "thứ hai" ... "chủ nhật" (this week)
    const dayNames: Record<string, number> = {
        'thứ hai': 1, 'thứ ba': 2, 'thứ tư': 3, 'thứ năm': 4,
        'thứ sáu': 5, 'thứ bảy': 6, 'chủ nhật': 0,
    };
    for (const [name, dow] of Object.entries(dayNames)) {
        if (t.includes(name)) {
            const current = today.getDay();
            let diff = dow - current;
            if (diff < 0) diff += 7; // next occurrence
            const d = new Date(today); d.setDate(day + diff);
            return { dates: [fmt(d)], period };
        }
    }

    return null;
}

/**
 * Check if a message is asking about schedules
 */
export function isScheduleQuery(message: string): boolean {
    const t = message.toLowerCase();
    // Từ khóa trực tiếp về lịch
    if (/lịch|công tác|họp|hội nghị|sự kiện|cuộc họp|kế hoạch|buổi|schedule/.test(t)) return true;
    // Nếu chứa pattern ngày tháng thì cũng coi là hỏi lịch
    if (/ngày\s+\d|tháng\s+\d|hôm nay|hôm qua|ngày mai|ngày kia|tuần này|tuần tới|tuần sau|tuần trước|thứ hai|thứ ba|thứ tư|thứ năm|thứ sáu|thứ bảy|chủ nhật/.test(t)) return true;
    return false;
}

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
                    id: true,
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
                    id: true,
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
     * Tìm kiếm lịch từ câu hỏi tiếng Việt của người dùng — trả về structured data cho chatbot sources
     * @param message Câu hỏi của người dùng
     * @returns { schedules: Schedule[], contextText: string } hoặc null nếu không phải câu hỏi về lịch
     */
    async searchSchedulesFromMessage(message: string): Promise<{
        schedules: Array<{
            id: string;
            date: Date;
            startTime: Date;
            endTime: Date | null;
            content: string;
            location: string;
            leader: string;
        }>;
        contextText: string;
        dates: string[];
        period?: string;
    } | null> {
        if (!isScheduleQuery(message)) return null;

        const dateIntent = parseDateFromVietnamese(message);
        if (!dateIntent) return null;

        try {
            const { dates, period } = dateIntent;
            const allDates = dates;
            const firstDate = allDates[0];
            const lastDate = allDates[allDates.length - 1];

            // Build time filter for morning/afternoon
            let startTimeFilter: any = undefined;
            if (period === 'morning') {
                startTimeFilter = { lt: new Date('1970-01-01T12:00:00.000Z') };
            } else if (period === 'afternoon') {
                startTimeFilter = { gte: new Date('1970-01-01T12:00:00.000Z') };
            }

            const startOfFirst = new Date(firstDate);
            startOfFirst.setHours(0, 0, 0, 0);
            const endOfLast = new Date(lastDate);
            endOfLast.setHours(23, 59, 59, 999);

            const where: any = {
                date: {
                    gte: startOfFirst,
                    lte: endOfLast,
                },
                status: 'approved',
            };
            if (startTimeFilter) {
                where.startTime = startTimeFilter;
            }

            const schedules = await prisma.schedule.findMany({
                where,
                select: {
                    id: true,
                    date: true,
                    startTime: true,
                    endTime: true,
                    content: true,
                    location: true,
                    leader: true,
                    participants: true,
                    preparingUnit: true,
                },
                orderBy: [
                    { date: 'asc' },
                    { startTime: 'asc' }
                ],
            });

            // Build context text for LLM
            let contextText: string;
            const periodLabel = period === 'morning' ? ' buổi sáng' : period === 'afternoon' ? ' buổi chiều' : '';
            const dateLabel = dates.length > 1
                ? `từ ${firstDate} đến ${lastDate}`
                : `ngày ${firstDate}`;

            if (schedules.length === 0) {
                contextText = `Không có lịch công tác nào${periodLabel} ${dateLabel}.`;
            } else {
                contextText = `Tìm thấy ${schedules.length} lịch công tác${periodLabel} ${dateLabel}:\n${JSON.stringify(schedules)}`;
            }

            console.log(`[AITools] searchSchedulesFromMessage: found ${schedules.length} schedules for ${dateLabel}${periodLabel}`);
            return { schedules, contextText, dates, period };

        } catch (error: any) {
            console.error('[AITools] searchSchedulesFromMessage error:', error.message);
            return null;
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
