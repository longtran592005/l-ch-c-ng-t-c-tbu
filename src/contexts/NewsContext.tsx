import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { News } from '@/types';
import { api } from '@/services/api'; // Import the API service

interface NewsContextType {
  newsList: News[];
  isLoading: boolean;
  error: string | null;
  fetchNews: () => Promise<void>;
  addNews: (news: Omit<News, 'id' | 'publishedAt' | 'views'>) => Promise<void>;
  updateNews: (id: string, news: Partial<News>) => Promise<void>;
  deleteNews: (id: string) => Promise<void>;
  getNewsById: (id: string) => News | undefined;
  incrementViews: (id: string) => Promise<void>;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({ children }: { children: ReactNode }) {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<News[]>('/news');
      setNewsList(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải tin tức.');
      console.error('Failed to fetch news:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const addNews = async (newsData: Omit<News, 'id' | 'publishedAt' | 'views'>) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/news', newsData);
      await fetchNews(); // Refetch news to update state
    } catch (err: any) {
      setError(err.message || 'Lỗi khi thêm tin tức.');
      console.error('Failed to add news:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateNews = async (id: string, newsData: Partial<News>) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.put(`/news/${id}`, newsData);
      await fetchNews(); // Refetch news to update state
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật tin tức.');
      console.error('Failed to update news:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNews = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.delete(`/news/${id}`);
      // Cập nhật state ngay lập tức thay vì refetch
      setNewsList(prevNews => prevNews.filter(n => n.id !== id));
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa tin tức.');
      console.error('Failed to delete news:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getNewsById = (id: string) => {
    return newsList.find(n => n.id === id);
  };

  const incrementViews = async (id: string) => {
    // Optimistic update: increment views immediately in local state
    setNewsList(prevNews => prevNews.map(n =>
      n.id === id ? { ...n, views: (n.views || 0) + 1 } : n
    ));
    try {
      await api.post(`/news/${id}/increment-views`, {});
      // Silently refetch to sync with server (don't block UI)
      fetchNews().catch(() => {});
    } catch (err: any) {
      // Keep the optimistic update even if API fails
      console.error('Failed to increment views:', err);
    }
  };

  return (
    <NewsContext.Provider value={{ newsList, isLoading, error, fetchNews, addNews, updateNews, deleteNews, getNewsById, incrementViews }}>
      {children}
    </NewsContext.Provider>
  );
}

export function useNews() {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNews must be used within NewsProvider');
  }
  return context;
}
