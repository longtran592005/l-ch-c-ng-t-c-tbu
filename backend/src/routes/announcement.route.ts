import { Router } from 'express';
import * as announcementController from '../controllers/announcement.controller';
import { asyncHandler } from '../middleware/error.middleware';

const announcementRouter = Router();

announcementRouter.get('/announcements', asyncHandler(announcementController.handleGetAllAnnouncements));
announcementRouter.post('/announcements', asyncHandler(announcementController.handleCreateAnnouncement));
announcementRouter.get('/announcements/:id', asyncHandler(announcementController.handleGetAnnouncementById));
announcementRouter.put('/announcements/:id', asyncHandler(announcementController.handleUpdateAnnouncement));
announcementRouter.delete('/announcements/:id', asyncHandler(announcementController.handleDeleteAnnouncement));

export default announcementRouter;
