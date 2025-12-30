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
import { normalizeText } from './normalizeText';
import { extractIntent, updateContextFromIntent, ExtractedIntent } from './intentExtractor';
import { contextManager } from './contextManager';
import { querySchedules, ScheduleQueryParams } from './scheduleQuery';
import { formatAnswer, formatErrorResponse } from './answerFormatter';

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
    const today = new Date();
    params.dateRange = {
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(today, { weekStartsOn: 1 }),
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
    console.log('[Chatbot] Normalized:', normalized);

    // Bước 2: Trích xuất ý định
    const intent = extractIntent(userMessage);
    console.log('[Chatbot] Intent:', intent.type, 'Confidence:', intent.confidence);

    // Bước 3: Cập nhật ngữ cảnh
    updateContextFromIntent(intent);

    // Bước 4: Xây dựng query và truy vấn lịch
    const queryParams = buildQueryParams(intent);
    const queryResult = querySchedules(schedules, queryParams);
    console.log('[Chatbot] Query result:', queryResult.total, 'schedules found');

    // Bước 5: Định dạng câu trả lời
    const response = formatAnswer(intent, queryResult);

    return response;

  } catch (error) {
    console.error('[Chatbot] Error processing message:', error);
    return formatErrorResponse();
  }
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
