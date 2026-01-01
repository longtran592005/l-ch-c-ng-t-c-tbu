// src/services/schedule.service.ts
import prisma from '../config/database';
import { Schedule } from '@prisma/client';

/**
 * Helper function to parse time string (HH:MM) to valid DateTime
 */
const parseTimeString = (timeStr: any): Date => {
  if (!timeStr || typeof timeStr !== 'string') {
    return new Date(0);
  }
  // timeStr format: "HH:MM"
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    console.error('Invalid time format:', timeStr);
    return new Date(0);
  }
  // Create a Date that represents the time in UTC on epoch date so
  // when the frontend reads UTC hours it will match the original HH:MM.
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
};

/**
 * Lấy tất cả lịch công tác
 */
export const getAllSchedules = async (): Promise<Schedule[]> => {
  // Include creator relation so frontend can display creator name instead of raw id
  const results = await prisma.schedule.findMany({
    orderBy: { date: 'asc' },
    include: {
      creator: {
        select: { id: true, name: true },
      },
      approver: {
        select: { id: true, name: true },
      },
    },
  });

  // Map to plain objects and add `createdByName` and `approvedByName` fields
  return results.map((r) => ({
    ...r,
    createdByName: (r as any).creator?.name || null,
    approvedByName: (r as any).approver?.name || null,
  }) as any);
};

/**
 * Lấy lịch công tác theo ID
 * @param id - ID của lịch công tác
 */
export const getScheduleById = async (id: string): Promise<Schedule | null> => {
  return prisma.schedule.findUnique({
    where: { id },
  });
};

/**
 * Tạo lịch công tác mới
 * @param data - Dữ liệu của lịch công tác mới
 */
export const createSchedule = async (data: any): Promise<Schedule> => {
  // Transform data to match Prisma schema
  const transformedData = {
    date: new Date(data.date),
    dayOfWeek: data.dayOfWeek,
    startTime: parseTimeString(data.startTime),
    endTime: parseTimeString(data.endTime),
    content: data.content,
    location: data.location,
    leader: data.leader,
    // Stringify array if needed, handle both array and string inputs
    participants: typeof data.participants === 'string' ? data.participants : JSON.stringify(data.participants || []),
    preparingUnit: data.preparingUnit,
    cooperatingUnits: typeof data.cooperatingUnits === 'string' ? data.cooperatingUnits : JSON.stringify(data.cooperatingUnits || []),
    status: data.status || 'draft',
    notes: data.notes || null,
    createdBy: data.createdBy,
    approvedBy: data.approvedBy || null,
  };

  return prisma.schedule.create({
    data: transformedData,
  });
};

/**
 * Cập nhật lịch công tác
 * @param id - ID của lịch công tác cần cập nhật
 * @param data - Dữ liệu cần cập nhật
 */
export const updateSchedule = async (id: string, data: any): Promise<Schedule> => {
  // Transform data to match Prisma schema
  const transformedData: any = {};
  
  if (data.date) transformedData.date = new Date(data.date);
  if (data.dayOfWeek !== undefined) transformedData.dayOfWeek = data.dayOfWeek;
  if (data.startTime) transformedData.startTime = parseTimeString(data.startTime);
  if (data.endTime) transformedData.endTime = parseTimeString(data.endTime);
  if (data.content !== undefined) transformedData.content = data.content;
  if (data.location !== undefined) transformedData.location = data.location;
  if (data.leader !== undefined) transformedData.leader = data.leader;
  if (data.participants !== undefined) {
    transformedData.participants = typeof data.participants === 'string' ? data.participants : JSON.stringify(data.participants || []);
  }
  if (data.preparingUnit !== undefined) transformedData.preparingUnit = data.preparingUnit;
  if (data.cooperatingUnits !== undefined) {
    transformedData.cooperatingUnits = typeof data.cooperatingUnits === 'string' ? data.cooperatingUnits : JSON.stringify(data.cooperatingUnits || []);
  }
  if (data.status !== undefined) transformedData.status = data.status;
  if (data.notes !== undefined) transformedData.notes = data.notes;
  if (data.approvedBy !== undefined) transformedData.approvedBy = data.approvedBy;
  
  return prisma.schedule.update({
    where: { id },
    data: transformedData,
  });
};

/**
 * Xóa lịch công tác
 * @param id - ID của lịch công tác cần xóa
 */
export const deleteSchedule = async (id: string): Promise<Schedule> => {
  return prisma.schedule.delete({
    where: { id },
  });
};

/**
 * Duyệt lịch công tác
 * @param id - ID của lịch công tác cần duyệt
 */
export const approveSchedule = async (id: string): Promise<Schedule> => {
    return prisma.schedule.update({
        where: { id },
        data: { status: 'approved' },
    });
};
