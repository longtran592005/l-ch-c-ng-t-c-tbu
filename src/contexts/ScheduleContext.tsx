import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Schedule, ScheduleStatus } from '@/types';
import { api } from '@/services/api'; // Import the API service

// Interface cho context
interface ScheduleContextType {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  fetchSchedules: () => Promise<void>; // Add fetchSchedules to context
  addSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSchedule: (id: string, data: Partial<Schedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  approveSchedule: (id: string, approvedBy: string) => Promise<void>;
  getScheduleById: (id: string) => Schedule | undefined;
  getApprovedSchedules: () => Schedule[];
}

// Tạo context
const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

// Provider component
interface ScheduleProviderProps {
  children: ReactNode;
}

export function ScheduleProvider({ children }: ScheduleProviderProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch schedules from API
  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching schedules from API...');
      // Assuming API returns an array of schedules directly
      const data = await api.get<any[]>('/schedules');
      console.log('Received schedules data:', data);

      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error('API did not return an array:', data);
        setError('Dữ liệu lịch công tác không hợp lệ.');
        setSchedules([]);
        return;
      }

      // Normalize incoming schedule objects to match frontend `Schedule` type
      const toTimeString = (val: any) => {
        if (!val && val !== 0) return '';
        if (typeof val === 'string') {
          // Already in HH:mm format?
          if (/^\d{1,2}:\d{2}$/.test(val)) return val.padStart(5, '0');
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            const hh = String(d.getUTCHours()).padStart(2, '0');
            const mm = String(d.getUTCMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
          }
          return val;
        }
        if (val instanceof Date) {
          if (!isNaN(val.getTime())) {
            const hh = String(val.getUTCHours()).padStart(2, '0');
            const mm = String(val.getUTCMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
          }
          return '';
        }
        return String(val);
      };

      const normalized = data.map((s) => {
        // participants and cooperatingUnits may be stored as JSON strings in the API
        const participants = typeof s.participants === 'string'
          ? (() => { try { return JSON.parse(s.participants); } catch { return []; } })()
          : (s.participants || []);

        const cooperatingUnits = typeof s.cooperatingUnits === 'string'
          ? (() => { try { return JSON.parse(s.cooperatingUnits); } catch { return []; } })()
          : (s.cooperatingUnits || []);

        return {
          ...s,
          // Ensure `date` is a Date object (Weekly/Monthly views call new Date() anyway)
          date: s.date ? new Date(s.date) : new Date(),
          participants,
          cooperatingUnits,
          // Normalize startTime/endTime to HH:mm strings for display
          startTime: toTimeString(s.startTime),
          endTime: toTimeString(s.endTime),
        } as Schedule;
      });

      console.log('Normalized schedules:', normalized);
      setSchedules(normalized);
    } catch (err: any) {
      const errorMessage = err.message || 'Lỗi khi tải lịch công tác.';
      setError(errorMessage);
      console.error('Failed to fetch schedules:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response,
      });
      // Set empty array on error so UI doesn't break
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load schedules on component mount
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Thêm lịch mới
  const addSchedule = async (scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/schedules', scheduleData);
      await fetchSchedules(); // Refetch schedules to update state
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thêm lịch công tác.');
      console.error('Failed to add schedule:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật lịch
  const updateSchedule = async (id: string, data: Partial<Schedule>) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.put(`/schedules/${id}`, data);
      await fetchSchedules(); // Refetch schedules to update state
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật lịch công tác.');
      console.error('Failed to update schedule:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Xóa lịch
  const deleteSchedule = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.delete(`/schedules/${id}`);
      await fetchSchedules(); // Refetch schedules to update state
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa lịch công tác.');
      console.error('Failed to delete schedule:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Duyệt lịch
  const approveSchedule = async (id: string, approvedBy: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post(`/schedules/${id}/approve`, { approvedBy });
      await fetchSchedules(); // Refetch schedules to update state
    } catch (err: any) {
      setError(err.message || 'Lỗi khi duyệt lịch công tác.');
      console.error('Failed to approve schedule:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
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
    isLoading,
    error,
    fetchSchedules,
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
    // If the provider is missing, log an error and return a safe fallback so
    // the UI doesn't crash to a blank page. This helps surface the issue
    // while keeping the app usable (pages will show empty state).
    console.error('useSchedules must be used within ScheduleProvider');
    const noop = async () => {};
    return {
      schedules: [],
      isLoading: false,
      error: 'Schedule service unavailable',
      fetchSchedules: noop,
      addSchedule: async () => { throw new Error('ScheduleProvider missing'); },
      updateSchedule: async () => { throw new Error('ScheduleProvider missing'); },
      deleteSchedule: async () => { throw new Error('ScheduleProvider missing'); },
      approveSchedule: async () => { throw new Error('ScheduleProvider missing'); },
      getScheduleById: () => undefined,
      getApprovedSchedules: () => [],
    } as ScheduleContextType;
  }

  return context;
}

