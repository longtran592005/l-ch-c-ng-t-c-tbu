/**
 * Quản lý ngữ cảnh hội thoại cho chatbot
 * Ghi nhớ thông tin từ các câu hỏi trước để hiểu câu hỏi tiếp theo
 * 
 * @author Trường Đại học Thái Bình
 */

// ========================
// TYPES & INTERFACES
// ========================

/**
 * Ngữ cảnh hội thoại
 */
export interface ConversationContext {
  // Thông tin thời gian đã hỏi
  lastDate?: Date;              // Ngày cuối cùng được đề cập
  lastDayOfWeek?: number;       // Thứ trong tuần (0 = CN, 1 = T2, ...)
  lastTimePeriod?: 'sáng' | 'chiều' | 'tối';  // Buổi trong ngày
  
  // Thông tin lãnh đạo đã hỏi
  lastLeader?: string;          // Tên lãnh đạo cuối cùng
  
  // Thông tin về loại truy vấn
  lastQueryType?: 'today' | 'week' | 'specific_date' | 'leader' | 'day_of_week';
  
  // Lịch sử các câu hỏi gần đây (tối đa 5 câu)
  recentQueries: string[];
  
  // Thời điểm tương tác cuối cùng
  lastInteraction: Date;
  
  // Số lượng tin nhắn trong phiên
  messageCount: number;
}

// ========================
// CONSTANTS
// ========================

/**
 * Thời gian hết hạn context (5 phút)
 */
const CONTEXT_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Số lượng câu hỏi gần đây được lưu
 */
const MAX_RECENT_QUERIES = 5;

// ========================
// CONTEXT MANAGER CLASS
// ========================

/**
 * Class quản lý ngữ cảnh hội thoại
 */
export class ContextManager {
  private context: ConversationContext;

  constructor() {
    this.context = this.createEmptyContext();
  }

  /**
   * Tạo context rỗng
   */
  private createEmptyContext(): ConversationContext {
    return {
      recentQueries: [],
      lastInteraction: new Date(),
      messageCount: 0,
    };
  }

  /**
   * Kiểm tra context có còn hợp lệ không (chưa hết hạn)
   */
  private isContextValid(): boolean {
    const now = new Date();
    const timeSinceLastInteraction = now.getTime() - this.context.lastInteraction.getTime();
    return timeSinceLastInteraction < CONTEXT_EXPIRY_MS;
  }

  /**
   * Lấy context hiện tại
   * Nếu context đã hết hạn, trả về context mới
   */
  getContext(): ConversationContext {
    if (!this.isContextValid()) {
      this.context = this.createEmptyContext();
    }
    return { ...this.context };
  }

  /**
   * Cập nhật ngày đã hỏi
   * @param date - Ngày được đề cập
   */
  updateDate(date: Date): void {
    this.context.lastDate = date;
    this.context.lastInteraction = new Date();
  }

  /**
   * Cập nhật thứ trong tuần đã hỏi
   * @param dayOfWeek - Thứ trong tuần (0-6)
   */
  updateDayOfWeek(dayOfWeek: number): void {
    this.context.lastDayOfWeek = dayOfWeek;
    this.context.lastInteraction = new Date();
  }

  /**
   * Cập nhật buổi trong ngày đã hỏi
   * @param period - Buổi (sáng/chiều/tối)
   */
  updateTimePeriod(period: 'sáng' | 'chiều' | 'tối'): void {
    this.context.lastTimePeriod = period;
    this.context.lastInteraction = new Date();
  }

  /**
   * Cập nhật lãnh đạo đã hỏi
   * @param leader - Tên lãnh đạo
   */
  updateLeader(leader: string): void {
    this.context.lastLeader = leader;
    this.context.lastInteraction = new Date();
  }

  /**
   * Cập nhật loại truy vấn
   * @param queryType - Loại truy vấn
   */
  updateQueryType(queryType: ConversationContext['lastQueryType']): void {
    this.context.lastQueryType = queryType;
    this.context.lastInteraction = new Date();
  }

  /**
   * Thêm câu hỏi vào lịch sử
   * @param query - Câu hỏi của người dùng
   */
  addQuery(query: string): void {
    this.context.recentQueries.unshift(query);
    if (this.context.recentQueries.length > MAX_RECENT_QUERIES) {
      this.context.recentQueries.pop();
    }
    this.context.messageCount++;
    this.context.lastInteraction = new Date();
  }

  /**
   * Cập nhật toàn bộ context từ kết quả phân tích
   * @param extracted - Thông tin đã trích xuất từ câu hỏi
   */
  updateFromExtracted(extracted: {
    date?: Date;
    dayOfWeek?: number;
    timePeriod?: 'sáng' | 'chiều' | 'tối';
    leader?: string;
    queryType?: ConversationContext['lastQueryType'];
    query: string;
  }): void {
    if (extracted.date) {
      this.updateDate(extracted.date);
    }
    if (extracted.dayOfWeek !== undefined) {
      this.updateDayOfWeek(extracted.dayOfWeek);
    }
    if (extracted.timePeriod) {
      this.updateTimePeriod(extracted.timePeriod);
    }
    if (extracted.leader) {
      this.updateLeader(extracted.leader);
    }
    if (extracted.queryType) {
      this.updateQueryType(extracted.queryType);
    }
    this.addQuery(extracted.query);
  }

  /**
   * Điền thông tin thiếu từ context
   * Được sử dụng khi câu hỏi mới thiếu thông tin
   * @param partial - Thông tin đã có từ câu hỏi mới
   * @returns Thông tin đã được bổ sung từ context
   */
  fillFromContext(partial: {
    date?: Date;
    dayOfWeek?: number;
    timePeriod?: 'sáng' | 'chiều' | 'tối';
    leader?: string;
  }): {
    date?: Date;
    dayOfWeek?: number;
    timePeriod?: 'sáng' | 'chiều' | 'tối';
    leader?: string;
    usedContext: boolean;
  } {
    const ctx = this.getContext();
    let usedContext = false;

    const result = { ...partial, usedContext };

    // Nếu thiếu ngày và context có ngày → dùng ngày từ context
    if (!result.date && ctx.lastDate) {
      result.date = ctx.lastDate;
      usedContext = true;
    }

    // Nếu thiếu thứ và context có thứ → dùng thứ từ context
    if (result.dayOfWeek === undefined && ctx.lastDayOfWeek !== undefined) {
      result.dayOfWeek = ctx.lastDayOfWeek;
      usedContext = true;
    }

    // Nếu thiếu buổi và context có buổi → dùng buổi từ context
    if (!result.timePeriod && ctx.lastTimePeriod) {
      result.timePeriod = ctx.lastTimePeriod;
      usedContext = true;
    }

    // Nếu thiếu lãnh đạo và context có lãnh đạo → dùng lãnh đạo từ context
    if (!result.leader && ctx.lastLeader) {
      result.leader = ctx.lastLeader;
      usedContext = true;
    }

    result.usedContext = usedContext;
    return result;
  }

  /**
   * Xóa toàn bộ context (reset)
   */
  clear(): void {
    this.context = this.createEmptyContext();
  }

  /**
   * Lấy số lượng tin nhắn trong phiên
   */
  getMessageCount(): number {
    return this.context.messageCount;
  }

  /**
   * Kiểm tra đây có phải tin nhắn đầu tiên không
   */
  isFirstMessage(): boolean {
    return this.context.messageCount === 0;
  }
}

// ========================
// SINGLETON INSTANCE
// ========================

/**
 * Instance singleton của ContextManager
 * Được sử dụng trong toàn bộ ứng dụng
 */
export const contextManager = new ContextManager();
