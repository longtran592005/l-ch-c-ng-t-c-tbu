import { Request, Response } from 'express';
import * as announcementService from '../services/announcement.service';
import { AppError } from '../utils/errors.util';

/**
 * Get all announcements
 */
export const handleGetAllAnnouncements = async (req: Request, res: Response) => {
  const announcements = await announcementService.getAllAnnouncements();
  res.status(200).json(announcements);
};

/**
 * Get announcement by ID
 */
export const handleGetAnnouncementById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const announcement = await announcementService.getAnnouncementById(id);
  if (!announcement) {
    throw new AppError('Announcement not found', 404);
  }
  res.status(200).json(announcement);
};

/**
 * Create announcement
 */
export const handleCreateAnnouncement = async (req: Request, res: Response) => {
  const newAnnouncement = await announcementService.createAnnouncement(req.body);
  res.status(201).json(newAnnouncement);
};

/**
 * Update announcement
 */
export const handleUpdateAnnouncement = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatedAnnouncement = await announcementService.updateAnnouncement(id, req.body);
  res.status(200).json(updatedAnnouncement);
};

/**
 * Delete announcement
 */
export const handleDeleteAnnouncement = async (req: Request, res: Response) => {
  const { id } = req.params;
  await announcementService.deleteAnnouncement(id);
  res.status(204).send();
};
