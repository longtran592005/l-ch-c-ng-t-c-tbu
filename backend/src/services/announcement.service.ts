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
  return prisma.announcement.create({
    data: {
      ...data,
      publishedAt: new Date(data.publishedAt || new Date()),
    },
  });
};

/**
 * Update announcement
 */
export const updateAnnouncement = async (id: string, data: Partial<Announcement>): Promise<Announcement> => {
  return prisma.announcement.update({
    where: { id },
    data,
  });
};

/**
 * Delete announcement
 */
export const deleteAnnouncement = async (id: string): Promise<Announcement> => {
  return prisma.announcement.delete({
    where: { id },
  });
};
