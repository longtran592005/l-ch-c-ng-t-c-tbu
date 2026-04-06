import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '@/services/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  createdAt: Date;
  type: 'announcement' | 'news' | 'schedule' | 'schedule_edit' | 'system';
  linkedId?: string;
}

interface BackendNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: string;
  linkedId?: string | null;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const STORAGE_KEY = 'tbu_notifications';

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${diffDays} ngày trước`;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((n: Notification) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          time: getTimeAgo(new Date(n.createdAt))
        }));
      } catch {
        return [];
      }
    }
    // Default notifications
    return [
      { 
        id: '1', 
        title: 'Hệ thống sẵn sàng', 
        message: 'Chào mừng bạn đến với hệ thống quản lý lịch công tác', 
        time: 'Vừa xong', 
        read: false,
        createdAt: new Date(),
        type: 'system' as const
      }
    ];
  });

  const mergeNotifications = useCallback((incoming: Notification[]) => {
    setNotifications((prev) => {
      const byId = new Map<string, Notification>();
      [...incoming, ...prev].forEach((item) => {
        byId.set(item.id, item);
      });
      return Array.from(byId.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    });
  }, []);

  const fetchBackendNotifications = useCallback(async () => {
    const token = localStorage.getItem('tbu_auth_token');
    if (!token) return;

    try {
      const response = await api.get<{ items: BackendNotification[] }>('/notifications');
      const mapped = (response.items || []).map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        time: getTimeAgo(new Date(item.createdAt)),
        read: item.read,
        createdAt: new Date(item.createdAt),
        type: mapBackendType(item.type),
        linkedId: item.linkedId || undefined,
      }));
      mergeNotifications(mapped);
    } catch (error) {
      console.error('Failed to sync notifications from backend:', error);
    }
  }, [mergeNotifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    fetchBackendNotifications();
    const interval = setInterval(() => {
      fetchBackendNotifications();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBackendNotifications]);

  // Update time ago periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => prev.map(n => ({
        ...n,
        time: getTimeAgo(n.createdAt)
      })));
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));

    void api.patch(`/notifications/${id}/read`, {}).catch((error) => {
      console.error('Failed to mark notification as read:', error);
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    void api.patch('/notifications/read-all', {}).catch((error) => {
      console.error('Failed to mark all notifications as read:', error);
    });
  };

  const addNotification = (notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: Date.now().toString(),
      createdAt: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  return (
    <NotificationsContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead, 
      addNotification 
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

function mapBackendType(type: string): Notification['type'] {
  if (type === 'announcement') return 'announcement';
  if (type === 'news') return 'news';
  if (type === 'schedule' || type === 'schedule_edit' || type === 'schedule_reminder_1h') return 'schedule';
  return 'system';
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
