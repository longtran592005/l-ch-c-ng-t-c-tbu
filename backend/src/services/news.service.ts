import prisma from '../config/database';
import { News } from '@prisma/client';
import { createAuditLog } from './auditLog.service';


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
export const createNews = async (data: any, actor?: { id?: string; email?: string; role?: string }): Promise<News> => {
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

  await createAuditLog({
    userId: actor?.id || null,
    username: actor?.email || null,
    account: actor?.email || null,
    role: actor?.role || null,
    action: 'NEWS_CREATED',
    resourceType: 'news',
    resourceId: result.id,
  });


  return result;
};

/**
 * Update news
 */
export const updateNews = async (id: string, data: Partial<News>, actor?: { id?: string; email?: string; role?: string }): Promise<News> => {
  const result = await prisma.news.update({
    where: { id },
    data,
  });

  await createAuditLog({
    userId: actor?.id || null,
    username: actor?.email || null,
    account: actor?.email || null,
    role: actor?.role || null,
    action: 'NEWS_UPDATED',
    resourceType: 'news',
    resourceId: result.id,
  });


  return result;
};

/**
 * Delete news
 */
export const deleteNews = async (id: string, actor?: { id?: string; email?: string; role?: string }): Promise<News> => {
  const result = await prisma.news.delete({
    where: { id },
  });

  await createAuditLog({
    userId: actor?.id || null,
    username: actor?.email || null,
    account: actor?.email || null,
    role: actor?.role || null,
    action: 'NEWS_DELETED',
    resourceType: 'news',
    resourceId: id,
  });


  return result;
};
