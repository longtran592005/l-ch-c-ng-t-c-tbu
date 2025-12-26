import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Schedule, ScheduleStatus } from '@/types';
import { mockSchedules } from '@/data/mockData';

// Key lưu trữ trong localStorage
const STORAGE_KEY = 'tbu_schedules';

// Interface cho context
interface ScheduleContextType {
  schedules: Schedule[];
  addSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSchedule: (id: string, data: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  approveSchedule: (id: string, approvedBy: string) => void;
  getScheduleById: (id: string) => Schedule | undefined;
  getApprovedSchedules: () => Schedule[];
}

// Tạo context
const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

// Hàm đọc dữ liệu từ localStorage
const loadSchedulesFromStorage = (): Schedule[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Chuyển đổi string date thành Date object
      return parsed.map((s: any) => ({
        ...s,
        date: new Date(s.date),
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        approvedAt: s.approvedAt ? new Date(s.approvedAt) : undefined,
      }));
    }
  } catch (error) {
    console.error('Lỗi khi đọc dữ liệu từ localStorage:', error);
  }
  // Trả về mock data nếu chưa có dữ liệu
  return mockSchedules;
};

// Hàm lưu dữ liệu vào localStorage
const saveSchedulesToStorage = (schedules: Schedule[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu vào localStorage:', error);
  }
};

// Provider component
interface ScheduleProviderProps {
  children: ReactNode;
}

export function ScheduleProvider({ children }: ScheduleProviderProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // Load dữ liệu khi component mount
  useEffect(() => {
    const loaded = loadSchedulesFromStorage();
    setSchedules(loaded);
  }, []);

  // Lưu dữ liệu khi schedules thay đổi
  useEffect(() => {
    if (schedules.length > 0) {
      saveSchedulesToStorage(schedules);
    }
  }, [schedules]);

  // Thêm lịch mới
  const addSchedule = (scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSchedule: Schedule = {
      ...scheduleData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSchedules(prev => [newSchedule, ...prev]);
  };

  // Cập nhật lịch
  const updateSchedule = (id: string, data: Partial<Schedule>) => {
    setSchedules(prev =>
      prev.map(s =>
        s.id === id ? { ...s, ...data, updatedAt: new Date() } : s
      )
    );
  };

  // Xóa lịch
  const deleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  // Duyệt lịch
  const approveSchedule = (id: string, approvedBy: string) => {
    setSchedules(prev =>
      prev.map(s =>
        s.id === id
          ? {
              ...s,
              status: 'approved' as ScheduleStatus,
              approvedBy,
              approvedAt: new Date(),
              updatedAt: new Date(),
            }
          : s
      )
    );
  };

  // Lấy lịch theo ID
  const getScheduleById = (id: string) => {
    return schedules.find(s => s.id === id);
  };

  // Lấy danh sách lịch đã duyệt (cho public view)
  const getApprovedSchedules = () => {
    return schedules.filter(s => s.status === 'approved');
  };

  const value: ScheduleContextType = {
    schedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    approveSchedule,
    getScheduleById,
    getApprovedSchedules,
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

// Custom hook để sử dụng context
export function useSchedules() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedules phải được sử dụng trong ScheduleProvider');
  }
  return context;
}
