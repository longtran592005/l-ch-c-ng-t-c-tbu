import prisma from '../config/database';
import { Announcement } from '@prisma/client';
import { createAuditLog } from './auditLog.service';


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
export const createAnnouncement = async (
  data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>,
  actor?: { id?: string; email?: string; role?: string },
): Promise<Announcement> => {
  const result = await prisma.announcement.create({
    data: {
      ...data,
      publishedAt: new Date(data.publishedAt || new Date()),
    },
  });

  await createAuditLog({
    userId: actor?.id || null,
    username: actor?.email || null,
    account: actor?.email || null,
    role: actor?.role || null,
    action: 'ANNOUNCEMENT_CREATED',
    resourceType: 'announcement',
    resourceId: result.id,
  });


  return result;
};

/**
 * Update announcement
 */
export const updateAnnouncement = async (
  id: string,
  data: Partial<Announcement>,
  actor?: { id?: string; email?: string; role?: string },
): Promise<Announcement> => {
  const result = await prisma.announcement.update({
    where: { id },
    data,
  });

  await createAuditLog({
    userId: actor?.id || null,
    username: actor?.email || null,
    account: actor?.email || null,
    role: actor?.role || null,
    action: 'ANNOUNCEMENT_UPDATED',
    resourceType: 'announcement',
    resourceId: result.id,
  });


  return result;
};

/**
 * Delete announcement
 */
export const deleteAnnouncement = async (
  id: string,
  actor?: { id?: string; email?: string; role?: string },
): Promise<Announcement> => {
  const result = await prisma.announcement.delete({
    where: { id },
  });

  await createAuditLog({
    userId: actor?.id || null,
    username: actor?.email || null,
    account: actor?.email || null,
    role: actor?.role || null,
    action: 'ANNOUNCEMENT_DELETED',
    resourceType: 'announcement',
    resourceId: id,
  });


  return result;
};
