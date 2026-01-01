import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Announcement } from '@/types';
import { api } from '@/services/api'; // Import the API service

interface ExtendedAnnouncement extends Announcement {
  createdBy?: string;
}

interface AnnouncementsContextType {
  announcementsList: ExtendedAnnouncement[];
  isLoading: boolean;
  error: string | null;
  fetchAnnouncements: () => Promise<void>;
  addAnnouncement: (announcement: Omit<ExtendedAnnouncement, 'id' | 'publishedAt'>) => Promise<void>;
  updateAnnouncement: (id: string, announcement: Partial<ExtendedAnnouncement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  getAnnouncementById: (id: string) => ExtendedAnnouncement | undefined;
}

const AnnouncementsContext = createContext<AnnouncementsContextType | undefined>(undefined);

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const [announcementsList, setAnnouncementsList] = useState<ExtendedAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<ExtendedAnnouncement[]>('/announcements');
      setAnnouncementsList(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông báo.');
      console.error('Failed to fetch announcements:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const addAnnouncement = async (announcementData: Omit<ExtendedAnnouncement, 'id' | 'publishedAt'>) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/announcements', announcementData);
      await fetchAnnouncements(); // Refetch announcements to update state
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thêm thông báo.');
      console.error('Failed to add announcement:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAnnouncement = async (id: string, announcementData: Partial<ExtendedAnnouncement>) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.put(`/announcements/${id}`, announcementData);
      await fetchAnnouncements(); // Refetch announcements to update state
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật thông báo.');
      console.error('Failed to update announcement:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.delete(`/announcements/${id}`);
      await fetchAnnouncements(); // Refetch announcements to update state
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa thông báo.');
      console.error('Failed to delete announcement:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getAnnouncementById = (id: string) => {
    return announcementsList.find(a => a.id === id);
  };

  return (
    <AnnouncementsContext.Provider value={{ 
      announcementsList,
      isLoading,
      error,
      fetchAnnouncements,
      addAnnouncement, 
      updateAnnouncement, 
      deleteAnnouncement, 
      getAnnouncementById 
    }}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements() {
  const context = useContext(AnnouncementsContext);
  if (!context) {
    throw new Error('useAnnouncements must be used within AnnouncementsProvider');
  }
  return context;
}
