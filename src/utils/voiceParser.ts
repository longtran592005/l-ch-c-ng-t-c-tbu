
import { ScheduleEventType } from '@/types';
import { differenceInDays, format, addHours, set } from 'date-fns';

export interface ParsedSchedule {
    date?: Date;
    startTime?: string;
    endTime?: string;
    content?: string;
    location?: string;
    leader?: string;
    eventType?: ScheduleEventType;
}

export const parseVoiceCommand = (text: string): ParsedSchedule => {
    const normalizedText = text.toLowerCase();
    const result: ParsedSchedule = {};
    const currentYear = new Date().getFullYear();

    // 1. Detect Event Type
    if (normalizedText.includes('hội nghị')) {
        result.eventType = 'hoi_nghi';
    } else if (normalizedText.includes('tạm ngưng') || normalizedText.includes('hoãn')) {
        result.eventType = 'tam_ngung';
    } else if (normalizedText.includes('cuộc họp') || normalizedText.includes('họp')) {
        result.eventType = 'cuoc_hop';
    }

    // 2. Detect Date (ngày 7-1, ngày 7/1, ngày 7 tháng 1, hôm nay, ngày mai)
    const dateRegex = /ngày\s+(\d{1,2})([/-]|(\s+tháng\s+))(\d{1,2})/i;
    const dateMatch = normalizedText.match(dateRegex);

    const today = new Date();

    if (normalizedText.includes('hôm nay')) {
        result.date = today;
    } else if (normalizedText.includes('ngày mai')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        result.date = tomorrow;
    } else if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[4]);
        // Create date (month is 0-indexed in JS Date)
        const parsedDate = new Date(currentYear, month - 1, day);

        // Check if valid date
        if (!isNaN(parsedDate.getTime())) {
            // Handle case where user implies next year (e.g. asking in Dec for Jan)
            // Or usually just current year. Let's stick to current year for simplicity unless past.
            if (parsedDate < new Date(currentYear, 0, 1)) {
                parsedDate.setFullYear(currentYear + 1);
            }
            result.date = parsedDate;
        }
    }

    // 3. Detect Time (8 giờ, 8h, 8:30)
    // Matches: "8 giờ", "8h", "08:30"
    const timeRegex = /(\d{1,2})(\s*giờ|\s*h|:)(\s*)(\d{0,2})/;
    const timeMatch = normalizedText.match(timeRegex);

    if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        let minute = 0;

        // If there's a minute part
        if (timeMatch[4]) {
            minute = parseInt(timeMatch[4]);
        }

        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            const startTimeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            result.startTime = startTimeStr;

            // Default end time = start time + 2 hours
            let endDate = new Date();
            endDate.setHours(hour, minute, 0, 0);
            endDate = addHours(endDate, 2);
            result.endTime = format(endDate, 'HH:mm');
        }
    }

    // 4. Detect Leader ("do ... chủ trì")
    // Regex to capture text between "do" and "chủ trì"
    const leaderRegex = /do\s+(.+?)\s+chủ trì/i;
    const leaderMatch = normalizedText.match(leaderRegex);

    if (leaderMatch && leaderMatch[1]) {
        // Capitalize first letters for better look
        const rawLeader = leaderMatch[1].trim();
        // Simple capitalization
        result.leader = rawLeader.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    }

    // 5. Content
    // Use the full text as content initially, maybe capitalize first letter
    result.content = text.charAt(0).toUpperCase() + text.slice(1);

    return result;
};
