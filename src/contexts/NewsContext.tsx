import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { News } from '@/types';
import { mockNews } from '@/data/mockData';

interface NewsContextType {
  newsList: News[];
  addNews: (news: Omit<News, 'id' | 'publishedAt' | 'views'>) => void;
  updateNews: (id: string, news: Partial<News>) => void;
  deleteNews: (id: string) => void;
  getNewsById: (id: string) => News | undefined;
  incrementViews: (id: string) => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

const STORAGE_KEY = 'tbu_news';

export function NewsProvider({ children }: { children: ReactNode }) {
  const [newsList, setNewsList] = useState<News[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((n: News) => ({
          ...n,
          publishedAt: new Date(n.publishedAt)
        }));
      } catch {
        return mockNews;
      }
    }
    return mockNews;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newsList));
  }, [newsList]);

  const addNews = (newsData: Omit<News, 'id' | 'publishedAt' | 'views'>) => {
    const newNews: News = {
      ...newsData,
      id: Date.now().toString(),
      publishedAt: new Date(),
      views: 0,
    };
    setNewsList(prev => [newNews, ...prev]);
  };

  const updateNews = (id: string, newsData: Partial<News>) => {
    setNewsList(prev => prev.map(n => 
      n.id === id ? { ...n, ...newsData } : n
    ));
  };

  const deleteNews = (id: string) => {
    setNewsList(prev => prev.filter(n => n.id !== id));
  };

  const getNewsById = (id: string) => {
    return newsList.find(n => n.id === id);
  };

  const incrementViews = (id: string) => {
    setNewsList(prev => prev.map(n => 
      n.id === id ? { ...n, views: n.views + 1 } : n
    ));
  };

  return (
    <NewsContext.Provider value={{ newsList, addNews, updateNews, deleteNews, getNewsById, incrementViews }}>
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
