/**
 * Chatbot Logic v2.0 - NLP nhẹ với bộ nhớ ngữ cảnh
 * 
 * Kiến trúc xử lý:
 * User message → normalizeText → extractIntent → updateContext → querySchedule → formatAnswer
 * 
 * @author Trường Đại học Thái Bình
 * @version 2.0
 */

import { Schedule } from '@/types';
import { startOfWeek, endOfWeek } from 'date-fns';

// Import các module NLP
import { normalizeText, removeVietnameseAccents } from './normalizeText';
import { extractIntent, updateContextFromIntent, ExtractedIntent } from './intentExtractor';
import { contextManager } from './contextManager';
import { querySchedules, ScheduleQueryParams } from './scheduleQuery';
import { formatAnswer, formatErrorResponse } from './answerFormatter';
import { searchFAQ, formatFAQAnswer } from './faqDatabase';

// ========================
// TYPES & INTERFACES
// ========================

/**
 * Interface cho tin nhắn chat
 */
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'bot';
  timestamp: Date;
}

/**
 * Interface cho kết quả phân tích (để debug)
 */
export interface ProcessingResult {
  intent: ExtractedIntent;
  queryParams: ScheduleQueryParams;
  schedulesFound: number;
  response: string;
}

// ========================
// HELPER FUNCTIONS
// ========================

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

// ========================
// QUERY BUILDER
// ========================

/**
 * Xây dựng query params từ intent đã trích xuất
 */
function buildQueryParams(intent: ExtractedIntent): ScheduleQueryParams {
  const params: ScheduleQueryParams = {};

  // Thêm ngày nếu có
  if (intent.date) {
    params.date = intent.date;
  }

  // Thêm buổi nếu có
  if (intent.timePeriod) {
    params.timePeriod = intent.timePeriod;
  }

  // Thêm lãnh đạo nếu có
  if (intent.leader) {
    params.leader = intent.leader;
  }

  // Xử lý đặc biệt cho tuần
  if (intent.type === 'schedule_week') {
    // Nếu có ngày cụ thể → dùng tuần chứa ngày đó, nếu không → tuần hiện tại
    const refDate = intent.date || new Date();
    params.dateRange = {
      start: startOfWeek(refDate, { weekStartsOn: 1 }),
      end: endOfWeek(refDate, { weekStartsOn: 1 }),
    };
    delete params.date; // Xóa date nếu đang query theo tuần
  }

  return params;
}

// ========================
// MAIN PROCESSING FUNCTION
// ========================

/**
 * Hàm xử lý chính - Xử lý tin nhắn của người dùng
 * 
 * Luồng xử lý:
 * 1. Chuẩn hóa văn bản (normalizeText)
 * 2. Trích xuất ý định (extractIntent)
 * 3. Cập nhật ngữ cảnh (updateContext)
 * 4. Truy vấn lịch (querySchedule)
 * 5. Định dạng câu trả lời (formatAnswer)
 * 
 * @param userMessage - Tin nhắn của người dùng
 * @param schedules - Danh sách lịch công tác
 * @returns Câu trả lời của chatbot
 */
export function processMessage(userMessage: string, schedules: Schedule[]): string {
  try {
    // Bước 1: Chuẩn hóa văn bản
    const normalized = normalizeText(userMessage);

    // DEBUG MODE
    if (normalized === '/debug' || normalized === 'debug') {
      const total = schedules.length;
      const validDates = schedules.filter(s => s.date instanceof Date && !isNaN(s.date.getTime())).length;
      const sample = total > 0 ? JSON.stringify(schedules[0]).slice(0, 100) + '...' : 'N/A';
      return `🛠 **SYSTEM DIAGNOSTIC**\n\n- Total Schedules: ${total}\n- Valid Dates: ${validDates}\n- Sample: ${sample}\n- Context: ${JSON.stringify(contextManager.getContext())}`;
    }

    console.log('[Chatbot] Normalized:', normalized);

    // Bước 2: Trích xuất ý định
    const intent = extractIntent(userMessage);
    console.log('[Chatbot] Intent:', intent.type, 'Confidence:', intent.confidence);

    // Bước 3: Cập nhật ngữ cảnh
    updateContextFromIntent(intent);

    // Bước 4: Xây dựng query và truy vấn lịch
    const queryParams = buildQueryParams(intent);

    // THÔNG MINH HƠN: Nếu là câu hỏi chung (schedule_general) mà không có ngày/lãnh đạo cụ thể
    // -> Coi như là tìm kiếm theo từ khóa (keyword search)
    if (intent.type === 'schedule_general' && !queryParams.date && !queryParams.dateRange && !queryParams.leader && !queryParams.timePeriod) {
      // Loại bỏ các từ khóa chung chung ("lịch", "xem", "họp"...) để lấy nội dung chính
      // Ví dụ: "Lịch họp giao ban" -> keyword: "giao ban"
      const stopWords = ['lịch', 'công tác', 'xem', 'tra cứu', 'kiểm tra', 'hỏi', 'cho', 'biết', 'về', 'họp'];
      let keyword = intent.normalizedText;

      // Xóa từng stop word
      stopWords.forEach(w => {
        keyword = keyword.replace(new RegExp(`\\b${w}\\b`, 'gi'), '');
      });
      keyword = keyword.trim().replace(/\s+/g, ' ');

      if (keyword.length > 1) {
        queryParams.keyword = keyword;
        console.log('[Chatbot] Smart inference: Treating generic query as keyword search:', keyword);
      } else {
        // Nếu sau khi xóa hết mà rỗng (VD user chỉ chat "Lịch công tác")
        // -> Mặc định là xem Lịch Hôm Nay
        queryParams.date = new Date();
        intent.type = 'schedule_today'; // Cập nhật lại intent để formatter trả lời đúng kiểu "Hôm nay"
        console.log('[Chatbot] Smart inference: Defaulting to Today');
      }
    }

    let queryResult = querySchedules(schedules, queryParams);
    console.log('[Chatbot] Query result:', queryResult.total, 'schedules found');

    // FALLBACK SEARCH: Nếu không tìm thấy intent hoặc không có kết quả, thử search full-text
    if (intent.type === 'unknown' || (queryResult.total === 0 && !intent.date && !intent.leader)) {
      console.log('[Chatbot] Intent unknown or empty result, trying fallback search...');

      // Thử FAQ trước
      const faqResults = searchFAQ(normalized);
      if (faqResults.length > 0) {
        console.log('[Chatbot] Found FAQ results:', faqResults.length);
        return formatFAQAnswer(faqResults);
      }

      // Nếu không có FAQ, thử search trong lịch
      const searchResults = fallbackSearch(normalized, schedules);
      if (searchResults.length > 0) {
        // Giả lập intent 'schedule_general' cho kết quả search
        intent.type = 'schedule_general';
        queryResult = {
          total: searchResults.length,
          schedules: searchResults,
          filtered: true,
          queryInfo: `fallback_search: ${normalized}`
        };
        return formatAnswer(intent, queryResult); // Format list kết quả
      } else if (intent.type === 'unknown') {
        // Nếu vẫn không tìm thấy gì và là unknown -> Trả về trợ giúp hoặc câu chat ngẫu nhiên
        return formatAnswer(intent, queryResult);
      }
    }

    // Bước 5: Định dạng câu trả lời
    const response = formatAnswer(intent, queryResult);

    return response;

  } catch (error) {
    console.error('[Chatbot] Error processing message:', error);
    return formatErrorResponse();
  }
}

/**
 * Tìm kiếm heuristic/full-text trong danh sách lịch
 */
function fallbackSearch(normalizedText: string, schedules: Schedule[]): Schedule[] {
  // Loại bỏ các từ stop words phổ biến để search tốt hơn
  const stopWords = ['cho', 'tôi', 'hỏi', 'về', 'cái', 'là', 'gì', 'ở', 'đâu', 'lịch', 'ngày', 'tháng', 'năm', 'có', 'không'];

  // Tạo 2 phiên bản search terms: có dấu (từ input) và không dấu
  const rawSearchTerms = normalizedText.split(' ').filter(w => !stopWords.includes(w) && w.length > 2);
  const noAccentSearchTerms = rawSearchTerms.map(t => removeVietnameseAccents(t));

  if (rawSearchTerms.length === 0) return [];

  return schedules.filter(s => {
    // Chuẩn bị dữ liệu để search: nối hết các trường lại
    const content = (s.content || '').toLowerCase();
    const location = (s.location || '').toLowerCase();
    const leader = (s.leader || '').toLowerCase();
    const participants = (s.participants || []).join(' ').toLowerCase();
    const units = (s.cooperatingUnits || []).join(' ').toLowerCase();

    const fullText = `${content} ${location} ${leader} ${participants} ${units}`;
    const fullTextNoAccent = removeVietnameseAccents(fullText);

    // Kiểm tra xem có chứa từ khóa nào không (check cả có dấu và không dấu)
    // Logic: Match ít nhất 1 term
    return rawSearchTerms.some((term, index) =>
      fullText.includes(term) || fullTextNoAccent.includes(noAccentSearchTerms[index])
    );
  }).slice(0, 5); // Giới hạn 5 kết quả tốt nhất
}

/**
 * Hàm xử lý chi tiết - Trả về cả kết quả phân tích (để debug)
 */
export function processMessageWithDetails(userMessage: string, schedules: Schedule[]): ProcessingResult {
  const normalized = normalizeText(userMessage);
  const intent = extractIntent(userMessage);
  updateContextFromIntent(intent);

  const queryParams = buildQueryParams(intent);
  const queryResult = querySchedules(schedules, queryParams);
  const response = formatAnswer(intent, queryResult);

  return {
    intent,
    queryParams,
    schedulesFound: queryResult.total,
    response,
  };
}

/**
 * Xóa ngữ cảnh hội thoại (reset)
 */
export function clearConversationContext(): void {
  contextManager.clear();
}

/**
 * Lấy thông tin ngữ cảnh hiện tại (để debug)
 */
export function getConversationContext() {
  return contextManager.getContext();
}

// ========================
// RE-EXPORT CHO BACKWARD COMPATIBILITY
// ========================

export type { ExtractedIntent } from './intentExtractor';
export { contextManager } from './contextManager';
