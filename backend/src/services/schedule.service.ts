// src/services/schedule.service.ts
import prisma from '../config/database';
import { Schedule } from '@prisma/client';
import { ConflictError, ValidationError } from '../utils/errors.util';
import { createAuditLog } from './auditLog.service';

import { ttsService } from './tts.service';

type LocationType = 'INTERNAL_ROOM' | 'EXTERNAL_LOCATION';

/**
 * Parses a time string (e.g., "HH:MM") into a UTC Date object on the epoch date (1970-01-01).
 * This ensures that when the frontend reads the time in UTC, it matches the original time string,
 * avoiding timezone-related issues.
 * @param timeStr - The time string to parse.
 * @returns A Date object representing the time in UTC. Returns epoch time if the format is invalid.
 */
export const parseTimeString = (timeStr: any): Date => {
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
export const parseDateString = (dateStr: any): Date => {
  if (!dateStr) return new Date();
  // Luôn chuyển thành string trước, rồi tách phần YYYY-MM-DD
  // Tránh dùng getFullYear/getMonth/getDate vì chúng dùng local timezone và gây lệch ngày
  const str = dateStr instanceof Date ? dateStr.toISOString() : String(dateStr);
  const [datePart] = str.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error('Invalid date format:', dateStr);
    return new Date();
  }
  // Dùng noon UTC (12:00) thay vì midnight (00:00) để khi frontend chuyển về local time
  // thì ngày vẫn đúng ở mọi timezone (UTC-12 đến UTC+14)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

const normalizeLocationText = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const addTenMinutes = (time: Date): Date => new Date(time.getTime() + 10 * 60 * 1000);

const resolveEndTime = (startTime: Date, endTime?: string | null): Date => {
  if (!endTime) {
    return addTenMinutes(startTime);
  }
  return parseTimeString(endTime);
};

const resolveLocationType = (data: any): LocationType => {
  if (data.locationType === 'INTERNAL_ROOM' || data.locationType === 'EXTERNAL_LOCATION') {
    return data.locationType;
  }
  if (data.roomId) {
    return 'INTERNAL_ROOM';
  }
  return 'EXTERNAL_LOCATION';
};

const findMatchedRoomByLocation = async (locationText?: string | null) => {
  if (!locationText || String(locationText).trim().length === 0) {
    return null;
  }

  const key = normalizeLocationText(String(locationText));
  const activeRooms = await (prisma as any).room.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  return (
    activeRooms.find((room: any) => normalizeLocationText(room.name) === key) || null
  );
};

const resolveExternalLocation = (data: any): string | null => {
  const value = data.externalLocation ?? data.location;
  if (!value || String(value).trim().length === 0) {
    return null;
  }
  return String(value).trim();
};

const buildLocationForStorage = async (
  locationType: LocationType,
  roomId: string | null,
  externalLocation: string | null,
  fallbackLocation: string | null,
): Promise<string> => {
  if (locationType === 'INTERNAL_ROOM' && roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || !room.isActive) {
      throw new ValidationError('Phòng không tồn tại hoặc đã bị vô hiệu hóa');
    }
    return room.name;
  }
  if (locationType === 'EXTERNAL_LOCATION') {
    const external = externalLocation || fallbackLocation;
    if (!external) {
      throw new ValidationError('Vui lòng nhập địa điểm ngoài trường');
    }
    return external;
  }

  return fallbackLocation || '';
};

const overlaps = (existingStart: Date, existingEnd: Date | null, newStart: Date, newEnd: Date): boolean => {
  const normalizedExistingEnd = existingEnd ? existingEnd : addTenMinutes(existingStart);
  return existingStart < newEnd && normalizedExistingEnd > newStart;
};

export const checkScheduleConflict = async (data: any, excludeScheduleId?: string) => {
  const date = parseDateString(data.date);
  const startTime = parseTimeString(data.startTime);
  const endTime = resolveEndTime(startTime, data.endTime);
  let locationType = resolveLocationType(data);
  let roomId = data.roomId || null;
  const externalLocation = resolveExternalLocation(data);

  if (!roomId && data.location) {
    const matchedRoom = await findMatchedRoomByLocation(data.location);
    if (matchedRoom) {
      roomId = matchedRoom.id;
      locationType = 'INTERNAL_ROOM';
    }
  }

  if (locationType === 'INTERNAL_ROOM') {
    if (!roomId) {
      throw new ValidationError('Vui lòng chọn phòng để kiểm tra trùng lịch');
    }

    const conflicts = await prisma.schedule.findMany({
      where: {
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        date,
        locationType: 'INTERNAL_ROOM',
        roomId,
      },
      orderBy: { startTime: 'asc' },
    });

    const overlapConflicts = conflicts.filter((item) =>
      overlaps(item.startTime, item.endTime, startTime, endTime),
    );

    return {
      hasConflict: overlapConflicts.length > 0,
      conflictType: 'INTERNAL_ROOM',
      conflicts: overlapConflicts,
    };
  }

  if (!externalLocation) {
    return {
      hasConflict: false,
      conflictType: 'EXTERNAL_LOCATION',
      conflicts: [],
    };
  }

  const locationKey = normalizeLocationText(externalLocation);
  const candidates = await prisma.schedule.findMany({
    where: {
      id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
      date,
      locationType: 'EXTERNAL_LOCATION',
      externalLocation: { not: null },
    },
    orderBy: { startTime: 'asc' },
  });

  const overlapConflicts = candidates.filter((item) => {
    const itemLocationKey = normalizeLocationText(item.externalLocation || item.location || '');
    return itemLocationKey === locationKey && overlaps(item.startTime, item.endTime, startTime, endTime);
  });

  return {
    hasConflict: overlapConflicts.length > 0,
    conflictType: 'EXTERNAL_LOCATION',
    conflicts: overlapConflicts,
  };
};

/**
 * Creates a new schedule record in the database.
 * This function transforms the incoming data to match the Prisma schema,
 * for example, by converting date strings to Date objects and stringifying array fields.
 * @param data - The data for the new schedule.
 * @returns A promise that resolves to the newly created Schedule object.
 */
export const createSchedule = async (data: any): Promise<Schedule> => {
  let locationType = resolveLocationType(data);
  let roomId = data.roomId || null;
  const startTime = parseTimeString(data.startTime);
  const endTime = resolveEndTime(startTime, data.endTime);
  const externalLocation = resolveExternalLocation(data);

  if (!roomId && data.location) {
    const matchedRoom = await findMatchedRoomByLocation(data.location);
    if (matchedRoom) {
      roomId = matchedRoom.id;
      locationType = 'INTERNAL_ROOM';
    }
  }

  const location = await buildLocationForStorage(locationType, roomId, externalLocation, data.location || null);

  const conflictCheck = await checkScheduleConflict(
    {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      locationType,
      roomId,
      externalLocation,
      location,
    },
    undefined,
  );
  if (conflictCheck.hasConflict) {
    throw new ConflictError('Địa điểm đã có lịch trùng trong cùng khoảng thời gian. Vui lòng đổi phòng hoặc đổi giờ.');
  }

  // Transform data to match Prisma schema
  const transformedData = {
    date: parseDateString(data.date),
    dayOfWeek: data.dayOfWeek,
    startTime,
    endTime,
    content: data.content,
    location,
    locationType,
    externalLocation,
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
    isSupplementary: data.isSupplementary || false,
    roomId,
  };

  const result = await prisma.schedule.create({
    data: transformedData,
  });

  // Trigger RAG reindex


  // Auto-generate TTS for approved schedules (async with 5-minute delay like RAG)
  if (result.status === 'approved') {
    setTimeout(() => {
      ttsService.generateAllVoices(result).catch(err => {
        console.error('[Schedule] TTS generation failed:', err);
      });
    }, 5 * 60 * 1000); // 5 minutes delay
  }

  await createAuditLog({
    userId: data.actor?.id || data.createdBy,
    username: data.actor?.email || null,
    account: data.actor?.email || null,
    role: data.actor?.role || null,
    action: 'SCHEDULE_CREATED',
    resourceType: 'schedule',
    resourceId: result.id,
    metadata: {
      date: data.date,
      locationType,
      roomId,
      externalLocation,
    },
  });

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
  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) {
    throw new ValidationError('Lịch công tác không tồn tại');
  }

  let nextLocationType = data.locationType
    ? resolveLocationType(data)
    : (existing.locationType as LocationType);
  let nextRoomId = data.roomId !== undefined ? data.roomId : existing.roomId;
  const nextStart = data.startTime ? parseTimeString(data.startTime) : existing.startTime;
  const nextEnd = data.endTime !== undefined ? resolveEndTime(nextStart, data.endTime) : (existing.endTime || addTenMinutes(nextStart));
  const nextExternalLocation = data.externalLocation !== undefined
    ? resolveExternalLocation(data)
    : (existing.externalLocation || null);

  if (!nextRoomId && data.location) {
    const matchedRoom = await findMatchedRoomByLocation(data.location);
    if (matchedRoom) {
      nextRoomId = matchedRoom.id;
      nextLocationType = 'INTERNAL_ROOM';
    }
  }
  const nextLocation = await buildLocationForStorage(
    nextLocationType,
    nextRoomId,
    nextExternalLocation,
    data.location !== undefined ? data.location : existing.location,
  );

  const conflictCheck = await checkScheduleConflict(
    {
      date: data.date || existing.date,
      startTime: data.startTime || `${String(existing.startTime.getUTCHours()).padStart(2, '0')}:${String(existing.startTime.getUTCMinutes()).padStart(2, '0')}`,
      endTime: data.endTime !== undefined
        ? data.endTime
        : `${String(nextEnd.getUTCHours()).padStart(2, '0')}:${String(nextEnd.getUTCMinutes()).padStart(2, '0')}`,
      locationType: nextLocationType,
      roomId: nextRoomId,
      externalLocation: nextExternalLocation,
      location: nextLocation,
    },
    id,
  );
  if (conflictCheck.hasConflict) {
    throw new ConflictError('Địa điểm đã có lịch trùng trong cùng khoảng thời gian. Vui lòng đổi phòng hoặc đổi giờ.');
  }

  // Transform data to match Prisma schema
  const transformedData: any = {};

  if (data.date) transformedData.date = parseDateString(data.date);
  if (data.dayOfWeek !== undefined) transformedData.dayOfWeek = data.dayOfWeek;
  if (data.startTime) transformedData.startTime = nextStart;
  if (data.endTime !== undefined || data.startTime !== undefined) transformedData.endTime = nextEnd;
  if (data.content !== undefined) transformedData.content = data.content;
  transformedData.location = nextLocation;
  transformedData.locationType = nextLocationType;
  transformedData.externalLocation = nextLocationType === 'EXTERNAL_LOCATION' ? nextExternalLocation : null;
  transformedData.roomId = nextLocationType === 'INTERNAL_ROOM' ? nextRoomId : null;
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
  if (data.isSupplementary !== undefined) transformedData.isSupplementary = data.isSupplementary;

  const result = await prisma.schedule.update({
    where: { id },
    data: transformedData,
  });

  // Trigger RAG reindex


  // Regenerate TTS if status is approved (with 5-minute delay like RAG)
  if (result.status === 'approved') {
    setTimeout(() => {
      ttsService.generateAllVoices(result).catch(err => {
        console.error('[Schedule] TTS regeneration failed:', err);
      });
    }, 5 * 60 * 1000); // 5 minutes delay
  }

  await createAuditLog({
    userId: data.actor?.id || null,
    username: data.actor?.email || null,
    account: data.actor?.email || null,
    role: data.actor?.role || null,
    action: 'SCHEDULE_UPDATED',
    resourceType: 'schedule',
    resourceId: result.id,
    metadata: {
      locationType: nextLocationType,
      roomId: nextRoomId,
      externalLocation: nextExternalLocation,
    },
  });

  return result;
};

/**
 * Deletes a schedule by its ID.
 * @param id - The ID of the schedule to delete.
 * @returns A promise that resolves to the deleted Schedule object.
 */
export const deleteSchedule = async (id: string, actor?: { id?: string; email?: string; role?: string }): Promise<Schedule> => {
  const result = await prisma.schedule.delete({
    where: { id },
  });

  // Trigger RAG reindex


  // Delete associated audio files
  ttsService.deleteAudio(id).catch(err => {
    console.error(`[Schedule] Failed to delete audio for ${id}:`, err);
  });

  await createAuditLog({
    userId: actor?.id || null,
    username: actor?.email || null,
    account: actor?.email || null,
    role: actor?.role || null,
    action: 'SCHEDULE_DELETED',
    resourceType: 'schedule',
    resourceId: id,
  });

  return result;
};

/**
 * Approves a schedule by updating its status to 'approved'.
 * @param id - The ID of the schedule to approve.
 * @returns A promise that resolves to the updated Schedule object.
 */
export const approveSchedule = async (id: string): Promise<Schedule> => {
  return prisma.schedule.update({
    where: { id },
    data: { status: 'approved' },
  });
};
