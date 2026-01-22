import prisma from '../config/database';
import { News } from '@prisma/client';
import { triggerRagUpdate } from './rag.service';

/**
 * Get all news
 */
export const getAllNews = async (): Promise<News[]> => {
  return prisma.news.findMany({
    orderBy: {
      publishedAt: 'desc',
    },
  });
};

/**
 * Get news by ID
 */
export const getNewsById = async (id: string): Promise<News | null> => {
  return prisma.news.findUnique({
    where: { id },
  });
};

/**
 * Create news
 */
export const createNews = async (data: any): Promise<News> => {
  const result = await prisma.news.create({
    data: {
      title: data.title,
      summary: data.summary,
      content: data.content || '',
      image: data.image,
      category: data.category || 'news',
      authorName: data.author || data.authorName || 'Admin',
      publishedAt: new Date(data.publishedAt || new Date()),
    },
  });
  
  triggerRagUpdate('news');
  return result;
};

/**
 * Update news
 */
export const updateNews = async (id: string, data: Partial<News>): Promise<News> => {
  const result = await prisma.news.update({
    where: { id },
    data,
  });
  
  triggerRagUpdate('news');
  return result;
};

/**
 * Delete news
 */
export const deleteNews = async (id: string): Promise<News> => {
  const result = await prisma.news.delete({
    where: { id },
  });
  
  triggerRagUpdate('news');
  return result;
};
