import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';

const notificationRouter = Router();

notificationRouter.get('/notifications', authenticate, asyncHandler(notificationController.handleGetNotifications));
notificationRouter.patch('/notifications/:id/read', authenticate, asyncHandler(notificationController.handleMarkNotificationRead));
notificationRouter.patch('/notifications/read-all', authenticate, asyncHandler(notificationController.handleMarkAllNotificationsRead));

export default notificationRouter;