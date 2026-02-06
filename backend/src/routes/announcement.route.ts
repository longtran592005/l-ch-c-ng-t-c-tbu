import { Router } from 'express';
import * as announcementController from '../controllers/announcement.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const announcementRouter = Router();

// Public routes
announcementRouter.get('/announcements', asyncHandler(announcementController.handleGetAllAnnouncements));
announcementRouter.get('/announcements/:id', asyncHandler(announcementController.handleGetAnnouncementById));

// Protected routes
announcementRouter.post('/announcements', authenticate, requireRole('admin', 'staff'), asyncHandler(announcementController.handleCreateAnnouncement));
announcementRouter.put('/announcements/:id', authenticate, requireRole('admin', 'staff'), asyncHandler(announcementController.handleUpdateAnnouncement));
announcementRouter.delete('/announcements/:id', authenticate, requireRole('admin', 'staff'), asyncHandler(announcementController.handleDeleteAnnouncement));

export default announcementRouter;
