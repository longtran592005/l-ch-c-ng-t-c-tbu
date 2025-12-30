/**
 * Chatbot Logic - Xử lý câu hỏi và trả lời về lịch công tác
 * Sử dụng phương pháp Rule-based (dựa trên từ khóa)
 * 
 * @author Trường Đại học Thái Bình
 * @description Chatbot tra cứu lịch công tác tuần
 */

import { Schedule } from '@/types';
import { 
  format, 
  parse, 
  isToday, 
  isThisWeek, 
  startOfWeek, 
  endOfWeek,
  getDay,
  addDays
} from 'date-fns';
import { vi } from 'date-fns/locale';

// ========================
// TYPES & INTERFACES
// ========================

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'bot';
  timestamp: Date;
}

export interface ParsedQuery {
  type: 'today' | 'week' | 'specific_date' | 'leader' | 'day_of_week' | 'time_period' | 'unknown';
  date?: Date;
  leader?: string;
  dayOfWeek?: number; // 0 = Chủ nhật, 1 = Thứ 2, ...
  timePeriod?: 'morning' | 'afternoon' | 'evening';
}

// ========================
// CONSTANTS - Từ khóa nhận diện
// ========================

// Từ khóa thời gian
const TODAY_KEYWORDS = ['hôm nay', 'ngày hôm nay', 'today', 'bây giờ'];
const WEEK_KEYWORDS = ['tuần này', 'tuần', 'cả tuần', 'week'];
const TOMORROW_KEYWORDS = ['ngày mai', 'mai', 'tomorrow'];

// Từ khóa ngày trong tuần
const DAY_OF_WEEK_MAP: Record<string, number> = {
  'thứ 2': 1, 'thứ hai': 1, 't2': 1,
  'thứ 3': 2, 'thứ ba': 2, 't3': 2,
  'thứ 4': 3, 'thứ tư': 3, 't4': 3,
  'thứ 5': 4, 'thứ năm': 4, 't5': 4,
  'thứ 6': 5, 'thứ sáu': 5, 't6': 5,
  'thứ 7': 6, 'thứ bảy': 6, 't7': 6,
  'chủ nhật': 0, 'cn': 0,
};

// Từ khóa buổi trong ngày
const TIME_PERIOD_KEYWORDS = {
  morning: ['sáng', 'buổi sáng', 'morning'],
  afternoon: ['chiều', 'buổi chiều', 'afternoon'],
  evening: ['tối', 'buổi tối', 'evening'],
};

// Danh sách lãnh đạo (có thể mở rộng)
const LEADERS = [
  'hiệu trưởng',
  'phó hiệu trưởng',
  'pgs.ts nguyễn văn a',
  'gs.ts trần văn b',
  'ts. lê văn c',
];

// Câu trả lời mặc định
const GREETING_RESPONSES = [
  'Xin chào! Tôi là trợ lý tra cứu lịch công tác của Trường Đại học Thái Bình. Tôi có thể giúp bạn:\n\n• Xem lịch công tác hôm nay\n• Xem lịch công tác tuần này\n• Tra cứu lịch theo ngày cụ thể (VD: ngày 15/12)\n• Tra cứu lịch theo lãnh đạo\n• Tra cứu lịch theo buổi sáng/chiều\n\nBạn muốn tra cứu thông tin gì?',
];

const UNKNOWN_RESPONSES = [
  'Xin lỗi, tôi chưa hiểu câu hỏi của bạn. Bạn có thể hỏi:\n• "Lịch công tác hôm nay"\n• "Lịch tuần này"\n• "Lịch ngày 15/12"\n• "Hiệu trưởng hôm nay làm gì"',
  'Tôi là chatbot tra cứu lịch công tác. Vui lòng hỏi về lịch làm việc, ví dụ: "Hôm nay có lịch gì?"',
];

const NO_SCHEDULE_RESPONSES = [
  'Không có lịch công tác nào trong thời gian này.',
  'Hiện tại chưa có lịch công tác được đăng ký.',
];

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Chuẩn hóa chuỗi text (bỏ dấu, lowercase)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Kiểm tra xem text có chứa từ khóa không
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const normalizedText = normalizeText(text);
  return keywords.some(keyword => normalizedText.includes(keyword));
}

/**
 * Parse ngày từ định dạng dd/mm hoặc dd/mm/yyyy
 */
function parseDateFromText(text: string): Date | null {
  // Regex cho định dạng ngày: dd/mm, dd-mm, dd/mm/yyyy, dd-mm-yyyy
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // dd/mm/yyyy
    /(\d{1,2})[\/\-](\d{1,2})/,               // dd/mm
    /ngày\s*(\d{1,2})[\/\-](\d{1,2})/,        // ngày dd/mm
    /ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})/,   // ngày dd tháng mm
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
      
      try {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Tìm ngày trong tuần từ text
 */
function findDayOfWeek(text: string): number | null {
  const normalizedText = normalizeText(text);
  
  for (const [keyword, dayNum] of Object.entries(DAY_OF_WEEK_MAP)) {
    if (normalizedText.includes(keyword)) {
      return dayNum;
    }
  }
  return null;
}

/**
 * Tìm buổi trong ngày từ text
 */
function findTimePeriod(text: string): 'morning' | 'afternoon' | 'evening' | null {
  const normalizedText = normalizeText(text);
  
  for (const [period, keywords] of Object.entries(TIME_PERIOD_KEYWORDS)) {
    if (keywords.some(k => normalizedText.includes(k))) {
      return period as 'morning' | 'afternoon' | 'evening';
    }
  }
  return null;
}

/**
 * Tìm tên lãnh đạo từ text
 */
function findLeader(text: string): string | null {
  const normalizedText = normalizeText(text);
  
  for (const leader of LEADERS) {
    if (normalizedText.includes(leader)) {
      return leader;
    }
  }
  return null;
}

// ========================
// MAIN LOGIC FUNCTIONS
// ========================

/**
 * Phân tích câu hỏi của người dùng
 * @param query - Câu hỏi của người dùng
 * @returns ParsedQuery - Kết quả phân tích
 */
export function parseUserQuery(query: string): ParsedQuery {
  const normalizedQuery = normalizeText(query);
  
  // Kiểm tra ngày cụ thể trước (ưu tiên cao nhất)
  const specificDate = parseDateFromText(query);
  if (specificDate) {
    return { type: 'specific_date', date: specificDate };
  }
  
  // Kiểm tra ngày trong tuần
  const dayOfWeek = findDayOfWeek(query);
  if (dayOfWeek !== null) {
    // Tính ngày cụ thể từ thứ trong tuần hiện tại
    const today = new Date();
    const currentDay = getDay(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Tuần bắt đầu từ thứ 2
    const targetDate = addDays(weekStart, dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    
    return { 
      type: 'day_of_week', 
      dayOfWeek, 
      date: targetDate,
      timePeriod: findTimePeriod(query) || undefined
    };
  }
  
  // Kiểm tra từ khóa thời gian
  if (containsKeyword(normalizedQuery, TODAY_KEYWORDS)) {
    return { 
      type: 'today', 
      date: new Date(),
      timePeriod: findTimePeriod(query) || undefined
    };
  }
  
  if (containsKeyword(normalizedQuery, TOMORROW_KEYWORDS)) {
    return { 
      type: 'specific_date', 
      date: addDays(new Date(), 1),
      timePeriod: findTimePeriod(query) || undefined
    };
  }
  
  if (containsKeyword(normalizedQuery, WEEK_KEYWORDS)) {
    return { type: 'week' };
  }
  
  // Kiểm tra lãnh đạo
  const leader = findLeader(query);
  if (leader) {
    return { 
      type: 'leader', 
      leader,
      timePeriod: findTimePeriod(query) || undefined
    };
  }
  
  // Kiểm tra buổi trong ngày (mặc định là hôm nay)
  const timePeriod = findTimePeriod(query);
  if (timePeriod) {
    return { type: 'time_period', timePeriod, date: new Date() };
  }
  
  return { type: 'unknown' };
}

/**
 * Lọc lịch theo buổi (sáng/chiều/tối)
 */
function filterByTimePeriod(schedules: Schedule[], period?: 'morning' | 'afternoon' | 'evening'): Schedule[] {
  if (!period) return schedules;
  
  return schedules.filter(schedule => {
    const startHour = parseInt(schedule.startTime.split(':')[0]);
    
    switch (period) {
      case 'morning':
        return startHour >= 6 && startHour < 12;
      case 'afternoon':
        return startHour >= 12 && startHour < 18;
      case 'evening':
        return startHour >= 18;
      default:
        return true;
    }
  });
}

/**
 * Lọc lịch theo ngày
 */
function filterByDate(schedules: Schedule[], date: Date): Schedule[] {
  return schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.date);
    return scheduleDate.toDateString() === date.toDateString();
  });
}

/**
 * Lọc lịch theo tuần hiện tại
 */
function filterByCurrentWeek(schedules: Schedule[]): Schedule[] {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  return schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.date);
    return scheduleDate >= weekStart && scheduleDate <= weekEnd;
  });
}

/**
 * Lọc lịch theo lãnh đạo
 */
function filterByLeader(schedules: Schedule[], leaderKeyword: string): Schedule[] {
  return schedules.filter(schedule => 
    normalizeText(schedule.leader).includes(leaderKeyword)
  );
}

/**
 * Format lịch công tác thành text đọc được
 */
function formatScheduleResponse(schedules: Schedule[], contextText: string): string {
  if (schedules.length === 0) {
    return NO_SCHEDULE_RESPONSES[Math.floor(Math.random() * NO_SCHEDULE_RESPONSES.length)];
  }
  
  // Chỉ hiển thị lịch đã được duyệt
  const approvedSchedules = schedules.filter(s => s.status === 'approved');
  
  if (approvedSchedules.length === 0) {
    return 'Chưa có lịch công tác nào được duyệt trong thời gian này.';
  }
  
  // Sắp xếp theo ngày và giờ
  const sortedSchedules = [...approvedSchedules].sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });
  
  let response = `📅 **${contextText}** (${sortedSchedules.length} sự kiện)\n\n`;
  
  // Nhóm theo ngày
  const groupedByDate = new Map<string, Schedule[]>();
  sortedSchedules.forEach(schedule => {
    const dateKey = new Date(schedule.date).toDateString();
    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, []);
    }
    groupedByDate.get(dateKey)!.push(schedule);
  });
  
  groupedByDate.forEach((daySchedules, dateKey) => {
    const date = new Date(dateKey);
    const dateStr = format(date, "EEEE, 'ngày' dd/MM/yyyy", { locale: vi });
    
    response += `📌 **${dateStr}**\n`;
    
    daySchedules.forEach(schedule => {
      response += `\n⏰ ${schedule.startTime} - ${schedule.endTime}\n`;
      response += `📝 ${schedule.content}\n`;
      response += `📍 Địa điểm: ${schedule.location}\n`;
      response += `👤 Chủ trì: ${schedule.leader}\n`;
      if (schedule.participants.length > 0) {
        response += `👥 Thành phần: ${schedule.participants.join(', ')}\n`;
      }
      response += `\n---\n`;
    });
  });
  
  return response;
}

// ========================
// MAIN CHATBOT FUNCTION
// ========================

/**
 * Xử lý tin nhắn của người dùng và trả về câu trả lời
 * @param userMessage - Tin nhắn của người dùng
 * @param schedules - Danh sách lịch công tác
 * @returns Câu trả lời của chatbot
 */
export function processMessage(userMessage: string, schedules: Schedule[]): string {
  const normalizedMessage = normalizeText(userMessage);
  
  // Kiểm tra lời chào
  const greetings = ['xin chào', 'chào', 'hello', 'hi', 'hey', 'bắt đầu', 'start'];
  if (greetings.some(g => normalizedMessage.includes(g)) && normalizedMessage.length < 20) {
    return GREETING_RESPONSES[0];
  }
  
  // Kiểm tra câu hỏi về khả năng của bot
  const helpKeywords = ['bạn làm được gì', 'giúp gì', 'hỗ trợ gì', 'help', 'hướng dẫn'];
  if (helpKeywords.some(k => normalizedMessage.includes(k))) {
    return GREETING_RESPONSES[0];
  }
  
  // Phân tích câu hỏi
  const parsedQuery = parseUserQuery(userMessage);
  
  // Xử lý theo loại câu hỏi
  let filteredSchedules: Schedule[] = [];
  let contextText = '';
  
  switch (parsedQuery.type) {
    case 'today':
      filteredSchedules = filterByDate(schedules, new Date());
      filteredSchedules = filterByTimePeriod(filteredSchedules, parsedQuery.timePeriod);
      contextText = parsedQuery.timePeriod 
        ? `Lịch công tác buổi ${parsedQuery.timePeriod === 'morning' ? 'sáng' : parsedQuery.timePeriod === 'afternoon' ? 'chiều' : 'tối'} hôm nay`
        : 'Lịch công tác hôm nay';
      break;
      
    case 'week':
      filteredSchedules = filterByCurrentWeek(schedules);
      contextText = 'Lịch công tác tuần này';
      break;
      
    case 'specific_date':
      if (parsedQuery.date) {
        filteredSchedules = filterByDate(schedules, parsedQuery.date);
        filteredSchedules = filterByTimePeriod(filteredSchedules, parsedQuery.timePeriod);
        const dateStr = format(parsedQuery.date, 'dd/MM/yyyy', { locale: vi });
        contextText = `Lịch công tác ngày ${dateStr}`;
      }
      break;
      
    case 'day_of_week':
      if (parsedQuery.date) {
        filteredSchedules = filterByDate(schedules, parsedQuery.date);
        filteredSchedules = filterByTimePeriod(filteredSchedules, parsedQuery.timePeriod);
        const dayStr = format(parsedQuery.date, 'EEEE', { locale: vi });
        contextText = parsedQuery.timePeriod
          ? `Lịch công tác buổi ${parsedQuery.timePeriod === 'morning' ? 'sáng' : 'chiều'} ${dayStr}`
          : `Lịch công tác ${dayStr}`;
      }
      break;
      
    case 'leader':
      if (parsedQuery.leader) {
        filteredSchedules = filterByLeader(schedules, parsedQuery.leader);
        // Nếu có thêm thời gian, lọc thêm
        if (parsedQuery.timePeriod) {
          filteredSchedules = filterByTimePeriod(filteredSchedules, parsedQuery.timePeriod);
        }
        contextText = `Lịch công tác của ${parsedQuery.leader}`;
      }
      break;
      
    case 'time_period':
      if (parsedQuery.date) {
        filteredSchedules = filterByDate(schedules, parsedQuery.date);
        filteredSchedules = filterByTimePeriod(filteredSchedules, parsedQuery.timePeriod);
        contextText = `Lịch công tác buổi ${parsedQuery.timePeriod === 'morning' ? 'sáng' : parsedQuery.timePeriod === 'afternoon' ? 'chiều' : 'tối'} hôm nay`;
      }
      break;
      
    case 'unknown':
    default:
      return UNKNOWN_RESPONSES[Math.floor(Math.random() * UNKNOWN_RESPONSES.length)];
  }
  
  return formatScheduleResponse(filteredSchedules, contextText);
}

/**
 * Tạo ID duy nhất cho tin nhắn
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Tạo tin nhắn mới
 */
export function createMessage(content: string, role: 'user' | 'bot'): ChatMessage {
  return {
    id: generateMessageId(),
    content,
    role,
    timestamp: new Date(),
  };
}
