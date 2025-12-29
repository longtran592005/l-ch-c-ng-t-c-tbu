import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Announcement } from '@/types';
import { mockAnnouncements } from '@/data/mockData';

interface ExtendedAnnouncement extends Announcement {
  createdBy?: string;
}

interface AnnouncementsContextType {
  announcementsList: ExtendedAnnouncement[];
  addAnnouncement: (announcement: Omit<ExtendedAnnouncement, 'id' | 'publishedAt'>) => void;
  updateAnnouncement: (id: string, announcement: Partial<ExtendedAnnouncement>) => void;
  deleteAnnouncement: (id: string) => void;
  getAnnouncementById: (id: string) => ExtendedAnnouncement | undefined;
}

const AnnouncementsContext = createContext<AnnouncementsContextType | undefined>(undefined);

const STORAGE_KEY = 'tbu_announcements';

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const [announcementsList, setAnnouncementsList] = useState<ExtendedAnnouncement[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((a: ExtendedAnnouncement) => ({
          ...a,
          publishedAt: new Date(a.publishedAt)
        }));
      } catch {
        return mockAnnouncements;
      }
    }
    return mockAnnouncements;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(announcementsList));
  }, [announcementsList]);

  const addAnnouncement = (announcementData: Omit<ExtendedAnnouncement, 'id' | 'publishedAt'>) => {
    const newAnnouncement: ExtendedAnnouncement = {
      ...announcementData,
      id: Date.now().toString(),
      publishedAt: new Date(),
    };
    setAnnouncementsList(prev => [newAnnouncement, ...prev]);
  };

  const updateAnnouncement = (id: string, announcementData: Partial<ExtendedAnnouncement>) => {
    setAnnouncementsList(prev => prev.map(a => 
      a.id === id ? { ...a, ...announcementData } : a
    ));
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncementsList(prev => prev.filter(a => a.id !== id));
  };

  const getAnnouncementById = (id: string) => {
    return announcementsList.find(a => a.id === id);
  };

  return (
    <AnnouncementsContext.Provider value={{ 
      announcementsList, 
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
