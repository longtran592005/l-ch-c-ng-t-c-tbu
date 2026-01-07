/**
 * Module trích xuất ý định (intent) từ câu hỏi của người dùng
 * Sử dụng regex + từ khóa để phân tích
 * 
 * @author Trường Đại học Thái Bình
 */

import { 
  format, 
  addDays, 
  startOfWeek,
  getDay
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { normalizeText, containsAnyKeyword } from './normalizeText';
import { 
  findCanonicalTerm, 
  TIME_SYNONYMS, 
  PERIOD_SYNONYMS, 
  LEADER_SYNONYMS, 
  DAY_SYNONYMS 
} from './synonymMap';
import { contextManager } from './contextManager';

// ========================
// TYPES & INTERFACES
// ========================

/**
 * Loại ý định của câu hỏi
 */
export type IntentType =
  | 'greeting'         // Lời chào
  | 'help'             // Yêu cầu trợ giúp
  | 'schedule_today'   // Lịch hôm nay
  | 'schedule_tomorrow' // Lịch ngày mai
  | 'schedule_week'    // Lịch tuần
  | 'schedule_date'    // Lịch ngày cụ thể
  | 'schedule_day'     // Lịch theo thứ trong tuần
  | 'schedule_leader'  // Lịch theo lãnh đạo
  | 'schedule_period'  // Lịch theo buổi
  | 'schedule_general' // Hỏi chung về lịch
  | 'followup'         // Câu hỏi tiếp theo (dựa vào context)
  | 'thanks'           // Cảm ơn
  | 'news'             // Tin tức mới nhất
  | 'announcements'     // Thông báo
  | 'contact'          // Thông tin liên hệ
  | 'about'            // Giới thiệu về trường
  | 'location'         // Địa chỉ trường
  | 'programs'         // Các ngành đào tạo
  | 'admission'        // Tuyển sinh
  | 'faq'              // Câu hỏi thường gặp
  | 'unknown';         // Không xác định

/**
 * Kết quả trích xuất intent
 */
export interface ExtractedIntent {
  type: IntentType;
  confidence: number;  // Độ tin cậy (0-1)
  
  // Thông tin thời gian
  date?: Date;
  dayOfWeek?: number;
  timePeriod?: 'sáng' | 'chiều' | 'tối';
  
  // Thông tin lãnh đạo
  leader?: string;
  
  // Thông tin ngữ cảnh
  usedContext: boolean;
  contextInfo?: string;
  
  // Văn bản gốc và đã chuẩn hóa
  originalText: string;
  normalizedText: string;
}

// ========================
// CONSTANTS
// ========================

// Từ khóa cho các loại intent
const GREETING_KEYWORDS = ['xin chào', 'chào', 'hello', 'hi', 'hey', 'chào bạn', 'chào bot'];
const HELP_KEYWORDS = ['giúp', 'trợ giúp', 'help', 'hướng dẫn', 'làm được gì', 'hỗ trợ gì', 'bạn có thể'];
const THANKS_KEYWORDS = ['cảm ơn', 'thank', 'thanks', 'cám ơn', 'tks', 'thankz'];
const SCHEDULE_KEYWORDS = ['lịch', 'công tác', 'làm việc', 'họp', 'sự kiện', 'hoạt động'];
const TOMORROW_KEYWORDS = ['ngày mai', 'mai', 'tomorrow'];

// Từ khóa mới cho các intent khác
const NEWS_KEYWORDS = ['tin tức', 'tin mới', 'news', 'bài viết mới', 'tin mới nhất', 'có tin gì', 'tin'];
const ANNOUNCEMENTS_KEYWORDS = ['thông báo', 'thông báo mới', 'thông tin', 'announce', 'có thông báo gì'];
const CONTACT_KEYWORDS = ['liên hệ', 'địa chỉ', 'contact', 'số điện thoại', 'email', 'thư điện tử', 'địa chỉ trường'];
const ABOUT_KEYWORDS = ['giới thiệu', 'về trường', 'tên trường', 'trường đại học thái bình', 'tbu', 'lịch sử', 'thông tin trường'];
const LOCATION_KEYWORDS = ['địa chỉ', 'ở đâu', 'nằm ở đâu', 'vị trí', 'khu vực'];
const PROGRAMS_KEYWORDS = ['ngành', 'khoa', 'chuyên ngành', 'đào tạo', 'học', 'chương trình', 'có ngành gì'];
const ADMISSION_KEYWORDS = ['tuyển sinh', 'học phí', 'điểm chuẩn', 'tuyển', 'xét tuyển', 'nộp hồ sơ'];
const FAQ_KEYWORDS = ['tôi cần', 'làm sao', 'làm thế nào', 'làm gì để', 'cách', 'làm để'];

// Từ khóa follow-up (câu hỏi tiếp theo)
const FOLLOWUP_KEYWORDS = [
  'còn gì nữa', 'thêm gì', 'còn lịch nào', 'gì khác',
  'vậy', 'thế', 'còn', 'nữa không', 'tiếp', 'gì nữa'
];

// ========================
// EXTRACTION FUNCTIONS
// ========================

/**
 * Parse ngày từ text (dd/mm hoặc dd/mm/yyyy)
 */
function extractDate(text: string): Date | null {
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // dd/mm/yyyy
    /(\d{1,2})[\/\-](\d{1,2})/,               // dd/mm
    /ngày\s*(\d{1,2})[\/\-](\d{1,2})/i,       // ngày dd/mm
    /ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})/i,  // ngày dd tháng mm
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
      
      try {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime()) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
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
 * Trích xuất thứ trong tuần từ text
 */
function extractDayOfWeek(text: string): number | null {
  const day = findCanonicalTerm(text, DAY_SYNONYMS);
  if (!day) return null;

  const dayMap: Record<string, number> = {
    'thứ 2': 1, 'thứ 3': 2, 'thứ 4': 3, 'thứ 5': 4,
    'thứ 6': 5, 'thứ 7': 6, 'chủ nhật': 0,
  };
  return dayMap[day] ?? null;
}

/**
 * Trích xuất buổi trong ngày từ text
 */
function extractTimePeriod(text: string): 'sáng' | 'chiều' | 'tối' | null {
  const period = findCanonicalTerm(text, PERIOD_SYNONYMS);
  return period as 'sáng' | 'chiều' | 'tối' | null;
}

/**
 * Trích xuất tên lãnh đạo từ text
 */
function extractLeader(text: string): string | null {
  const leader = findCanonicalTerm(text, LEADER_SYNONYMS);
  return leader;
}

/**
 * Tính ngày cụ thể từ thứ trong tuần
 */
function getDateFromDayOfWeek(dayOfWeek: number): Date {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Tuần bắt đầu từ thứ 2
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Chủ nhật = 6, T2 = 0, ...
  return addDays(weekStart, offset);
}

// ========================
// MAIN EXTRACTION FUNCTION
// ========================

/**
 * Hàm chính trích xuất intent từ câu hỏi
 * @param userInput - Câu hỏi của người dùng
 * @returns Kết quả trích xuất
 */
export function extractIntent(userInput: string): ExtractedIntent {
  const normalized = normalizeText(userInput);
  
  // Kết quả mặc định
  let result: ExtractedIntent = {
    type: 'unknown',
    confidence: 0,
    usedContext: false,
    originalText: userInput,
    normalizedText: normalized,
  };

  // 1. Kiểm tra lời chào
  if (containsAnyKeyword(normalized, GREETING_KEYWORDS) && normalized.length < 30) {
    return { ...result, type: 'greeting', confidence: 0.95 };
  }

  // 2. Kiểm tra yêu cầu trợ giúp
  if (containsAnyKeyword(normalized, HELP_KEYWORDS)) {
    return { ...result, type: 'help', confidence: 0.9 };
  }

  // 3. Kiểm tra cảm ơn
  if (containsAnyKeyword(normalized, THANKS_KEYWORDS) && normalized.length < 30) {
    return { ...result, type: 'thanks', confidence: 0.9 };
  }

  // 4. Kiểm tra tin tức
  if (containsAnyKeyword(normalized, NEWS_KEYWORDS)) {
    return { ...result, type: 'news', confidence: 0.9 };
  }

  // 5. Kiểm tra thông báo
  if (containsAnyKeyword(normalized, ANNOUNCEMENTS_KEYWORDS)) {
    return { ...result, type: 'announcements', confidence: 0.9 };
  }

  // 6. Kiểm tra liên hệ
  if (containsAnyKeyword(normalized, CONTACT_KEYWORDS) && containsAnyKeyword(normalized, LOCATION_KEYWORDS)) {
    return { ...result, type: 'contact', confidence: 0.9 };
  }

  // 7. Kiểm tra giới thiệu
  if (containsAnyKeyword(normalized, ABOUT_KEYWORDS) || containsAnyKeyword(normalized, LOCATION_KEYWORDS)) {
    return { ...result, type: 'about', confidence: 0.9 };
  }

  // 8. Kiểm tra chương trình đào tạo
  if (containsAnyKeyword(normalized, PROGRAMS_KEYWORDS)) {
    return { ...result, type: 'programs', confidence: 0.85 };
  }

  // 9. Kiểm tra tuyển sinh
  if (containsAnyKeyword(normalized, ADMISSION_KEYWORDS)) {
    return { ...result, type: 'admission', confidence: 0.85 };
  }

  // 4. Trích xuất các thành phần
  const date = extractDate(userInput);
  const dayOfWeek = extractDayOfWeek(normalized);
  const timePeriod = extractTimePeriod(normalized);
  const leader = extractLeader(normalized);
  const timeRef = findCanonicalTerm(normalized, TIME_SYNONYMS);

  // Gán các thành phần đã tìm được
  if (date) result.date = date;
  if (dayOfWeek !== null) result.dayOfWeek = dayOfWeek;
  if (timePeriod) result.timePeriod = timePeriod;
  if (leader) result.leader = leader;

  // 5. Xác định loại intent dựa trên thông tin đã trích xuất

  // 5.1. Ngày cụ thể (dd/mm)
  if (date) {
    result.type = 'schedule_date';
    result.confidence = 0.95;
    return result;
  }

  // 5.2. Hôm nay
  if (timeRef === 'hôm nay') {
    result.type = 'schedule_today';
    result.date = new Date();
    result.confidence = 0.95;
    return result;
  }

  // 5.3. Ngày mai
  if (containsAnyKeyword(normalized, TOMORROW_KEYWORDS)) {
    result.type = 'schedule_tomorrow';
    result.date = addDays(new Date(), 1);
    result.confidence = 0.95;
    return result;
  }

  // 5.4. Tuần này
  if (timeRef === 'tuần này') {
    result.type = 'schedule_week';
    result.confidence = 0.95;
    return result;
  }

  // 5.5. Theo thứ trong tuần
  if (dayOfWeek !== null) {
    result.type = 'schedule_day';
    result.date = getDateFromDayOfWeek(dayOfWeek);
    result.confidence = 0.9;
    return result;
  }

  // 5.6. Theo lãnh đạo
  if (leader) {
    result.type = 'schedule_leader';
    result.confidence = 0.9;
    // Nếu chỉ hỏi về lãnh đạo mà không có ngày → mặc định hôm nay
    if (!result.date) {
      result.date = new Date();
    }
    return result;
  }

  // 5.7. Theo buổi (sáng/chiều/tối) - mặc định hôm nay
  if (timePeriod) {
    result.type = 'schedule_period';
    result.date = new Date();
    result.confidence = 0.85;
    return result;
  }

  // 5.8. Câu hỏi follow-up (tiếp theo)
  if (containsAnyKeyword(normalized, FOLLOWUP_KEYWORDS)) {
    result.type = 'followup';
    result.usedContext = true;
    result.confidence = 0.7;
    
    // Lấy thông tin từ context
    const ctx = contextManager.getContext();
    if (ctx.lastDate) result.date = ctx.lastDate;
    if (ctx.lastDayOfWeek !== undefined) result.dayOfWeek = ctx.lastDayOfWeek;
    if (ctx.lastTimePeriod) result.timePeriod = ctx.lastTimePeriod;
    if (ctx.lastLeader) result.leader = ctx.lastLeader;
    
    return result;
  }

  // 5.9. Hỏi chung về lịch
  if (containsAnyKeyword(normalized, SCHEDULE_KEYWORDS)) {
    result.type = 'schedule_general';
    result.confidence = 0.6;
    
    // Thử điền thông tin từ context
    const filled = contextManager.fillFromContext({
      date: result.date,
      timePeriod: result.timePeriod,
      leader: result.leader,
    });
    
    if (filled.usedContext) {
      result.usedContext = true;
      result.date = filled.date;
      result.timePeriod = filled.timePeriod;
      result.leader = filled.leader;
      result.confidence = 0.75;
    }
    
    return result;
  }

  // 6. Không xác định được intent
  return result;
}

/**
 * Cập nhật context sau khi trích xuất
 * @param intent - Kết quả trích xuất
 */
export function updateContextFromIntent(intent: ExtractedIntent): void {
  contextManager.updateFromExtracted({
    date: intent.date,
    dayOfWeek: intent.dayOfWeek,
    timePeriod: intent.timePeriod,
    leader: intent.leader,
    queryType: intent.type === 'schedule_today' ? 'today' 
      : intent.type === 'schedule_week' ? 'week'
      : intent.type === 'schedule_date' ? 'specific_date'
      : intent.type === 'schedule_day' ? 'day_of_week'
      : intent.type === 'schedule_leader' ? 'leader'
      : undefined,
    query: intent.originalText,
  });
}
