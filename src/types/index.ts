// Định nghĩa các types cho hệ thống Lịch Công Tác Tuần

// Vai trò người dùng
export type UserRole = 'admin' | 'bgh' | 'staff' | 'viewer';

// Trạng thái lịch công tác
export type ScheduleStatus = 'draft' | 'pending' | 'approved' | 'cancelled';

// Loại sự kiện lịch công tác
export type ScheduleEventType = 'cuoc_hop' | 'hoi_nghi' | 'tam_ngung';

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
  cooperatingUnits?: string[]; // Đơn vị/ cá nhân phối hợp
  status: ScheduleStatus;
  eventType?: ScheduleEventType; // Loại sự kiện: cuộc họp, hội nghị, tạm ngưng
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
  eventType?: ScheduleEventType;
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

// ============================================
// MEETING RECORDS
// ============================================

export interface AudioRecording {
  url: string;
  filename: string;
  duration: number; // seconds
  uploadedAt: Date;
  type: 'recorded' | 'uploaded';
}

export interface MeetingRecord {
  id: string;
  scheduleId: string;
  schedule?: Schedule; // Optional relation
  title: string;
  meetingDate: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  leader?: string;
  participants: string[];
  audioRecordings: AudioRecording[];
  content?: string;
  minutes?: string;
  createdBy: string;
  creator?: User; // Optional relation
  status: 'draft' | 'completed' | 'archived';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateMeetingRecordInput {
  scheduleId: string;
  title: string;
  meetingDate: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  leader?: string;
  participants?: string[];
}

export interface UpdateMeetingRecordInput {
  title?: string;
  meetingDate?: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  leader?: string;
  participants?: string[];
  content?: string;
  minutes?: string;
  status?: 'draft' | 'completed' | 'archived';
  notes?: string;
}
