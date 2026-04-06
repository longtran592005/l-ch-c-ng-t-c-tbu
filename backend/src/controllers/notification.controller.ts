import { Request, Response } from 'express';
import {
  getNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notification.service';

export const handleGetNotifications = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const items = await getNotificationsForUser(userId);
  res.status(200).json({ items });
};

export const handleMarkNotificationRead = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  await markNotificationAsRead(req.params.id, userId);
  res.status(204).send();
};

export const handleMarkAllNotificationsRead = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  await markAllNotificationsAsRead(userId);
  res.status(204).send();
};