/**
 * Module truy vấn dữ liệu lịch công tác
 * Lọc và tìm kiếm lịch theo các tiêu chí
 * 
 * @author Trường Đại học Thái Bình
 */

import { Schedule } from '@/types';
import {
  startOfWeek,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  startOfDay,
  endOfDay
} from 'date-fns';
import { normalizeText } from './normalizeText';

// ========================
// TYPES & INTERFACES
// ========================

/**
 * Tham số truy vấn lịch
 */
export interface ScheduleQueryParams {
  date?: Date;                                 // Lọc theo ngày cụ thể
  dateRange?: { start: Date; end: Date };      // Lọc theo khoảng ngày
  timePeriod?: 'sáng' | 'chiều' | 'tối';       // Lọc theo buổi
  leader?: string;                             // Lọc theo lãnh đạo
  keyword?: string;                            // Tìm kiếm theo từ khóa
  eventType?: 'cuoc_hop' | 'hoi_nghi' | 'tam_ngung';   // Lọc theo loại sự kiện
  limit?: number;                              // Giới hạn số lượng kết quả
}

/**
 * Kết quả truy vấn
 */
export interface QueryResult {
  schedules: Schedule[];     // Danh sách lịch tìm được
  total: number;             // Tổng số lịch (trước khi limit)
  filtered: boolean;         // Đã áp dụng bộ lọc chưa
  queryInfo: string;         // Thông tin về truy vấn (để debug)
}

// ========================
// FILTER FUNCTIONS
// ========================

/**
 * Lọc lịch theo ngày cụ thể
 */
function filterByDate(schedules: Schedule[], date: Date): Schedule[] {
  return schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.date);
    return isSameDay(scheduleDate, date);
  });
}

/**
 * Lọc lịch theo khoảng ngày
 */
function filterByDateRange(schedules: Schedule[], start: Date, end: Date): Schedule[] {
  return schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.date);
    return isWithinInterval(scheduleDate, {
      start: startOfDay(start),
      end: endOfDay(end)
    });
  });
}

/**
 * Lọc lịch theo tuần hiện tại
 */
export function filterByCurrentWeek(schedules: Schedule[]): Schedule[] {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  return filterByDateRange(schedules, weekStart, weekEnd);
}

/**
 * Lọc lịch theo buổi trong ngày
 */
function filterByTimePeriod(schedules: Schedule[], period: 'sáng' | 'chiều' | 'tối'): Schedule[] {
  return schedules.filter(schedule => {
    const startHour = parseInt(schedule.startTime.split(':')[0], 10);

    switch (period) {
      case 'sáng':
        return startHour >= 6 && startHour < 12;
      case 'chiều':
        return startHour >= 12 && startHour < 18;
      case 'tối':
        return startHour >= 18 && startHour < 24;
      default:
        return true;
    }
  });
}

/**
 * Lọc lịch theo lãnh đạo
 */
function filterByLeader(schedules: Schedule[], leaderKeyword: string): Schedule[] {
  const normalizedKeyword = normalizeText(leaderKeyword);

  return schedules.filter(schedule => {
    const normalizedLeader = normalizeText(schedule.leader);
    return normalizedLeader.includes(normalizedKeyword);
  });
}

/**
 * Lọc lịch theo từ khóa (tìm trong nội dung, địa điểm)
 */
function filterByKeyword(schedules: Schedule[], keyword: string): Schedule[] {
  const normalizedKeyword = normalizeText(keyword);

  return schedules.filter(schedule => {
    const content = normalizeText(schedule.content);
    const location = normalizeText(schedule.location);
    const leader = normalizeText(schedule.leader);

    return content.includes(normalizedKeyword)
      || location.includes(normalizedKeyword)
      || leader.includes(normalizedKeyword);
  });
}

/**
 * Lọc lịch theo loại sự kiện (eventType)
 */
function filterByEventType(schedules: Schedule[], eventType: string): Schedule[] {
  return schedules.filter(schedule => schedule.eventType === eventType);
}

/**
 * Sắp xếp lịch theo ngày và giờ
 */
function sortSchedules(schedules: Schedule[]): Schedule[] {
  return [...schedules].sort((a, b) => {
    // So sánh ngày
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;

    // So sánh giờ bắt đầu
    return a.startTime.localeCompare(b.startTime);
  });
}

// ========================
// MAIN QUERY FUNCTION
// ========================

/**
 * Hàm truy vấn chính - áp dụng tất cả bộ lọc
 * @param schedules - Danh sách lịch gốc
 * @param params - Tham số truy vấn
 * @returns Kết quả truy vấn
 */
export function querySchedules(schedules: Schedule[], params: ScheduleQueryParams): QueryResult {
  let result = [...schedules];
  const queryParts: string[] = [];

  // Mặc định không lọc cứng eventType để tìm kiếm được mọi thứ
  // Nếu cần lọc, sẽ dùng params.eventType

  // Nếu có filter theo eventType, áp dụng filter
  if (params.eventType) {
    result = filterByEventType(result, params.eventType);
    queryParts.push(`eventType=${params.eventType}`);
  }

  // Lọc theo ngày
  if (params.date) {
    result = filterByDate(result, params.date);
    queryParts.push(`date=${params.date.toISOString().split('T')[0]}`);
  }

  // Lọc theo khoảng ngày
  if (params.dateRange) {
    result = filterByDateRange(result, params.dateRange.start, params.dateRange.end);
    queryParts.push(`dateRange=${params.dateRange.start.toISOString().split('T')[0]}~${params.dateRange.end.toISOString().split('T')[0]}`);
  }

  // Lọc theo buổi
  if (params.timePeriod) {
    result = filterByTimePeriod(result, params.timePeriod);
    queryParts.push(`period=${params.timePeriod}`);
  }

  // Lọc theo lãnh đạo
  if (params.leader) {
    result = filterByLeader(result, params.leader);
    queryParts.push(`leader=${params.leader}`);
  }

  // Tìm kiếm theo từ khóa
  if (params.keyword) {
    result = filterByKeyword(result, params.keyword);
    queryParts.push(`keyword=${params.keyword}`);
  }

  // Sắp xếp kết quả
  result = sortSchedules(result);

  const total = result.length;

  // Giới hạn số lượng kết quả
  if (params.limit && params.limit > 0) {
    result = result.slice(0, params.limit);
  }

  return {
    schedules: result,
    total,
    filtered: queryParts.length > 1, // Có lọc gì ngoài status không
    queryInfo: queryParts.join(', '),
  };
}

/**
 * Hàm tiện ích - Lấy lịch hôm nay
 */
export function getTodaySchedules(schedules: Schedule[]): QueryResult {
  return querySchedules(schedules, { date: new Date() });
}

/**
 * Hàm tiện ích - Lấy lịch tuần này
 */
export function getWeekSchedules(schedules: Schedule[]): QueryResult {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  return querySchedules(schedules, {
    dateRange: { start: weekStart, end: weekEnd }
  });
}

/**
 * Hàm tiện ích - Lấy lịch của lãnh đạo
 */
export function getLeaderSchedules(schedules: Schedule[], leader: string, date?: Date): QueryResult {
  const params: ScheduleQueryParams = { leader };
  if (date) {
    params.date = date;
  }
  return querySchedules(schedules, params);
}
