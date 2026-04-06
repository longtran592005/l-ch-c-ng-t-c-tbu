import prisma from '../config/database';

const notificationModel = (prisma as any).notification;

const getCombinedScheduleDateTime = (schedule: any): Date => {
  const date = schedule.date instanceof Date ? schedule.date : new Date(schedule.date);
  const time = schedule.startTime instanceof Date ? schedule.startTime : new Date(schedule.startTime);

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    time.getUTCHours(),
    time.getUTCMinutes(),
    time.getUTCSeconds(),
    0,
  ));
};

export const getNotificationsForUser = async (userId: string, limit = 50) => {
  const notifications = await notificationModel.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return notifications.map((item: any) => ({
    ...item,
    time: getTimeAgo(item.createdAt),
  }));
};

export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  return notificationModel.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  return notificationModel.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
};

export const runScheduleReminderJob = async () => {
  const now = new Date();

  const schedules = await prisma.schedule.findMany({
    where: {
      status: 'approved',
      reminderSentAt: null,
      date: {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        lte: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      content: true,
      date: true,
      startTime: true,
      location: true,
      createdBy: true,
    },
  });

  const activeUsers = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true },
  });

  let sentCount = 0;

  for (const schedule of schedules) {
    const scheduleDateTime = getCombinedScheduleDateTime(schedule);
    const timeUntilStart = scheduleDateTime.getTime() - now.getTime();
    const reminderLeadMs = 60 * 60 * 1000;
    const reminderWindowMs = 60 * 1000;

    if (timeUntilStart < reminderLeadMs - reminderWindowMs || timeUntilStart >= reminderLeadMs + reminderWindowMs) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const fresh = await tx.schedule.findUnique({ where: { id: schedule.id }, select: { reminderSentAt: true } });
      if (fresh?.reminderSentAt) {
        return;
      }

      await tx.notification.createMany({
        data: activeUsers.map((user) => ({
          userId: user.id,
          title: 'Lịch sắp diễn ra',
          message: `${schedule.content} sẽ diễn ra lúc ${formatTime(scheduleDateTime)} tại ${schedule.location}`,
          type: 'schedule',
          linkedType: 'schedule',
          linkedId: schedule.id,
          read: false,
        })),
      });

      await tx.schedule.update({
        where: { id: schedule.id },
        data: { reminderSentAt: now },
      });

      sentCount += 1;
    });
  }

  return { sentCount };
};

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${diffDays} ngày trước`;
};

const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};