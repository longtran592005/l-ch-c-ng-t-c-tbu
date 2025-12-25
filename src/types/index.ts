// Định nghĩa các types cho hệ thống Lịch Công Tác Tuần

// Vai trò người dùng
export type UserRole = 'admin' | 'bgh' | 'staff' | 'viewer';

// Trạng thái lịch công tác
export type ScheduleStatus = 'draft' | 'pending' | 'approved' | 'cancelled';

// Người dùng
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  createdAt: Date;
}

// Lịch công tác
export interface Schedule {
  id: string;
  date: Date;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  content: string;
  location: string;
  leader: string; // Lãnh đạo chủ trì
  participants: string[]; // Thành phần tham dự
  preparingUnit: string; // Đơn vị chuẩn bị
  cooperatingUnits?: string[]; // Đơn vị phối hợp
  status: ScheduleStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
}

// Tuần làm việc
export interface WorkWeek {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  schedules: Schedule[];
}

// Tin tức
export interface News {
  id: string;
  title: string;
  summary: string;
  content: string;
  image?: string;
  category: 'news' | 'announcement' | 'event';
  publishedAt: Date;
  author: string;
  views: number;
}

// Thông báo
export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  publishedAt: Date;
  expiresAt?: Date;
  attachments?: string[];
}

// Phòng ban
export interface Department {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  leader?: string;
  phone?: string;
  email?: string;
}

// Nhật ký hệ thống
export interface SystemLog {
  id: string;
  action: string;
  targetType: 'schedule' | 'user' | 'news' | 'announcement';
  targetId: string;
  userId: string;
  userName: string;
  details: string;
  timestamp: Date;
  ipAddress?: string;
}

// Form tạo/sửa lịch công tác
export interface ScheduleFormData {
  date: Date;
  startTime: string;
  endTime: string;
  content: string;
  location: string;
  leader: string;
  participants: string[];
  preparingUnit: string;
  cooperatingUnits?: string[];
  notes?: string;
}

// Bộ lọc lịch công tác
export interface ScheduleFilter {
  weekNumber?: number;
  month?: number;
  year?: number;
  leader?: string;
  status?: ScheduleStatus;
  department?: string;
  searchTerm?: string;
}

// Thống kê
export interface DashboardStats {
  totalSchedules: number;
  pendingSchedules: number;
  approvedSchedules: number;
  todaySchedules: number;
  weekSchedules: number;
}
