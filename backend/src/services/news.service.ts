import prisma from '../config/database';
import { News } from '@prisma/client';

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
  return prisma.news.create({
    data: {
      title: data.title,
      summary: data.summary,
      content: data.content || '',
      image: data.image,
      category: data.category || 'news',
      authorName: data.author || data.authorName || 'Admin', // Map frontend 'author' field to backend 'authorName'
      publishedAt: new Date(data.publishedAt || new Date()),
    },
  });
};

/**
 * Update news
 */
export const updateNews = async (id: string, data: Partial<News>): Promise<News> => {
  return prisma.news.update({
    where: { id },
    data,
  });
};

/**
 * Delete news
 */
export const deleteNews = async (id: string): Promise<News> => {
  return prisma.news.delete({
    where: { id },
  });
};
