import prisma from '../config/database';
import { Announcement } from '@prisma/client';


/**
 * Get all announcements
 */
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
  return prisma.announcement.findMany({
    orderBy: {
      publishedAt: 'desc',
    },
  });
};

/**
 * Get announcement by ID
 */
export const getAnnouncementById = async (id: string): Promise<Announcement | null> => {
  return prisma.announcement.findUnique({
    where: { id },
  });
};

/**
 * Create announcement
 */
export const createAnnouncement = async (data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Announcement> => {
  const result = await prisma.announcement.create({
    data: {
      ...data,
      publishedAt: new Date(data.publishedAt || new Date()),
    },
  });


  return result;
};

/**
 * Update announcement
 */
export const updateAnnouncement = async (id: string, data: Partial<Announcement>): Promise<Announcement> => {
  const result = await prisma.announcement.update({
    where: { id },
    data,
  });


  return result;
};

/**
 * Delete announcement
 */
export const deleteAnnouncement = async (id: string): Promise<Announcement> => {
  const result = await prisma.announcement.delete({
    where: { id },
  });


  return result;
};
