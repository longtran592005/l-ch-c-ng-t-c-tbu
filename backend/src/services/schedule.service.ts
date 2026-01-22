// src/services/schedule.service.ts
import prisma from '../config/database';
import { Schedule } from '@prisma/client';
import { triggerRagUpdate } from './rag.service';

/**
 * Parses a time string (e.g., "HH:MM") into a UTC Date object on the epoch date (1970-01-01).
 * This ensures that when the frontend reads the time in UTC, it matches the original time string,
 * avoiding timezone-related issues.
 * @param timeStr - The time string to parse.
 * @returns A Date object representing the time in UTC. Returns epoch time if the format is invalid.
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
 * Retrieves all schedules from the database, ordered by date.
 * It also includes the creator and approver names for easier display on the frontend.
 * @returns A promise that resolves to an array of Schedule objects.
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
 * Retrieves a single schedule by its unique ID.
 * @param id - The ID of the schedule to retrieve.
 * @returns A promise that resolves to the Schedule object or null if not found.
 */
export const getScheduleById = async (id: string): Promise<Schedule | null> => {
  return prisma.schedule.findUnique({
    where: { id },
  });
};

/**
 * Parses a date string (YYYY-MM-DD) into a Date object preserving the local date.
 * This avoids timezone issues when the date is sent from the frontend.
 * @param dateStr - The date string in YYYY-MM-DD format.
 * @returns A Date object representing the date at midnight UTC.
 */
const parseDateString = (dateStr: any): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) {
    // If it's already a Date, extract YYYY-MM-DD and create UTC date
    const year = dateStr.getFullYear();
    const month = dateStr.getMonth();
    const day = dateStr.getDate();
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  // Parse YYYY-MM-DD string
  const [year, month, day] = String(dateStr).split('T')[0].split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error('Invalid date format:', dateStr);
    return new Date();
  }
  // Create date at midnight UTC to preserve the intended date
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

/**
 * Creates a new schedule record in the database.
 * This function transforms the incoming data to match the Prisma schema,
 * for example, by converting date strings to Date objects and stringifying array fields.
 * @param data - The data for the new schedule.
 * @returns A promise that resolves to the newly created Schedule object.
 */
export const createSchedule = async (data: any): Promise<Schedule> => {
  // Transform data to match Prisma schema
  const transformedData = {
    date: parseDateString(data.date),
    dayOfWeek: data.dayOfWeek,
    startTime: parseTimeString(data.startTime),
    endTime: parseTimeString(data.endTime),
    content: data.content,
    location: data.location,
    leader: data.leader,
    // The database schema expects participants to be a string, so we stringify the array.
    participants: typeof data.participants === 'string' ? data.participants : JSON.stringify(data.participants || []),
    preparingUnit: data.preparingUnit,
    cooperatingUnits: typeof data.cooperatingUnits === 'string' ? data.cooperatingUnits : JSON.stringify(data.cooperatingUnits || []),
    status: data.status || 'draft',
    eventType: data.eventType || null,
    notes: data.notes || null,
    createdBy: data.createdBy,
    approvedBy: data.approvedBy || null,
  };

  const result = await prisma.schedule.create({
    data: transformedData,
  });
  
  // Trigger RAG reindex
  triggerRagUpdate('schedules');
  
  return result;
};

/**
 * Updates an existing schedule by its ID.
 * This function transforms the incoming data to match the Prisma schema before updating.
 * It only updates the fields that are provided in the `data` object.
 * @param id - The ID of the schedule to update.
 * @param data - An object containing the fields to update.
 * @returns A promise that resolves to the updated Schedule object.
 */
export const updateSchedule = async (id: string, data: any): Promise<Schedule> => {
  // Transform data to match Prisma schema
  const transformedData: any = {};
  
  if (data.date) transformedData.date = parseDateString(data.date);
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
  if (data.eventType !== undefined) transformedData.eventType = data.eventType || null;
  if (data.notes !== undefined) transformedData.notes = data.notes;
  if (data.approvedBy !== undefined) transformedData.approvedBy = data.approvedBy;
  
  const result = await prisma.schedule.update({
    where: { id },
    data: transformedData,
  });
  
  // Trigger RAG reindex
  triggerRagUpdate('schedules');
  
  return result;
};

/**
 * Deletes a schedule by its ID.
 * @param id - The ID of the schedule to delete.
 * @returns A promise that resolves to the deleted Schedule object.
 */
export const deleteSchedule = async (id: string): Promise<Schedule> => {
  const result = await prisma.schedule.delete({
    where: { id },
  });
  
  // Trigger RAG reindex
  triggerRagUpdate('schedules');
  
  return result;
};

/**
 * Approves a schedule by updating its status to 'approved'.
 * @param id - The ID of the schedule to approve.
 * @returns A promise that resolves to the updated Schedule object.
 */
export const approveSchedule = async (id:string): Promise<Schedule> => {
    return prisma.schedule.update({
        where: { id },
        data: { status: 'approved' },
    });
};
