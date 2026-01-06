
import prisma from '../config/database';
import { MeetingRecord, Prisma } from '@prisma/client';
import { deleteAudioFile } from '../utils/fileUpload.util';
import { AppError } from '../utils/errors.util';
import path from 'path';

// Define input types based on the user request and Prisma schema
export interface CreateMeetingRecordInput {
  scheduleId: string;
  title: string;
  meetingDate: Date | string;
  startTime?: Date | string;
  endTime?: Date | string;
  location?: string;
  leader?: string;
  participants?: string | any[];
  audioRecordings?: string | any[];
  content?: string;
  minutes?: string;
  createdBy: string;
  status?: string;
  notes?: string;
}

export interface UpdateMeetingRecordInput {
  title?: string;
  meetingDate?: Date | string;
  startTime?: Date | string;
  endTime?: Date | string;
  location?: string;
  leader?: string;
  participants?: string | any[];
  content?: string;
  minutes?: string;
  status?: string;
  notes?: string;
}

export interface AudioRecording {
  url: string;
  filename: string;
  duration: number;
  type: 'recorded' | 'uploaded';
  uploadedAt: string;
}

/**
 * Safely parse JSON strings, returning a default value if parsing fails.
 */
const safeJsonParse = (jsonString: string | null | undefined, defaultValue: any = []) => {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse JSON string:', error);
    return defaultValue;
  }
};

/**
 * Get all meeting records with optional filtering.
 * @param filters - Optional filters for scheduleId, status, dateFrom, dateTo.
 */
export const getAllMeetingRecords = async (filters: {
  scheduleId?: string;
  status?: string;
  dateFrom?: string | Date;
  dateTo?: string | Date;
} = {}): Promise<MeetingRecord[]> => {
  try {
    const where: Prisma.MeetingRecordWhereInput = {};

    if (filters.scheduleId) {
      where.scheduleId = filters.scheduleId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.dateFrom) {
      where.meetingDate = { ...where.meetingDate, gte: new Date(filters.dateFrom) };
    }
    if (filters.dateTo) {
      where.meetingDate = { ...where.meetingDate, lte: new Date(filters.dateTo) };
    }

    let records;
    try {
      records = await prisma.meetingRecord.findMany({
        where,
        include: {
          schedule: {
            select: {
              id: true,
              date: true,
              content: true,
              location: true,
              leader: true,
              eventType: true,
            },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: {
          meetingDate: 'desc',
        },
      });
    } catch (dbError: any) {
      // If table doesn't exist or other DB error, return empty array
      if (dbError.code === 'P2021' || dbError.code === 'P2001' || dbError.message?.includes('does not exist')) {
        console.warn('MeetingRecord table may not exist yet. Run migrations first.');
        return [];
      }
      throw dbError;
    }

    return records.map(record => {
      try {
        const parsedRecord: any = {
          ...record,
          meetingDate: record.meetingDate,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          completedAt: record.completedAt || null,
          participants: safeJsonParse(record.participants, []),
          audioRecordings: safeJsonParse(record.audioRecordings, []).map((audio: any) => ({
            ...audio,
            uploadedAt: audio.uploadedAt ? new Date(audio.uploadedAt) : new Date(),
          })),
        };

        // Ensure schedule is properly formatted
        if (record.schedule) {
          parsedRecord.schedule = {
            ...record.schedule,
            date: record.schedule.date,
          };
        }

        return parsedRecord;
      } catch (parseError: any) {
        console.error('Error parsing record:', record.id, parseError);
        return {
          ...record,
          participants: [],
          audioRecordings: [],
        };
      }
    });
  } catch (error) {
    console.error('Error in getAllMeetingRecords:', error);
    throw error;
  }
};

/**
 * Get a single meeting record by its ID.
 * @param id - The ID of the meeting record.
 */
export const getMeetingRecordById = async (id: string): Promise<MeetingRecord | null> => {
  const record = await prisma.meetingRecord.findUnique({
    where: { id },
    include: {
      schedule: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (record) {
    return {
      ...record,
      participants: safeJsonParse(record.participants),
      audioRecordings: safeJsonParse(record.audioRecordings),
    };
  }
  return null;
};

/**
 * Get all meeting records associated with a specific schedule.
 * @param scheduleId - The ID of the schedule.
 */
export const getMeetingRecordsByScheduleId = async (scheduleId: string): Promise<MeetingRecord[]> => {
  const records = await prisma.meetingRecord.findMany({
    where: { scheduleId },
    orderBy: {
      meetingDate: 'desc',
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    }
  });

  return records.map(record => ({
    ...record,
    participants: safeJsonParse(record.participants),
    audioRecordings: safeJsonParse(record.audioRecordings),
  }));
};

/**
 * Create a new meeting record.
 * @param data - The data for the new meeting record.
 */
export const createMeetingRecord = async (data: CreateMeetingRecordInput): Promise<MeetingRecord> => {
  const newRecord = await prisma.meetingRecord.create({
    data: {
      ...data,
      meetingDate: new Date(data.meetingDate),
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      participants: typeof data.participants === 'string' ? data.participants : JSON.stringify(data.participants || []),
      audioRecordings: typeof data.audioRecordings === 'string' ? data.audioRecordings : JSON.stringify(data.audioRecordings || []),
    },
  });
  return newRecord;
};

/**
 * Update an existing meeting record.
 * @param id - The ID of the meeting record to update.
 * @param data - The data to update.
 */
export const updateMeetingRecord = async (id: string, data: UpdateMeetingRecordInput): Promise<MeetingRecord> => {
  const updateData: any = { ...data };

  if (data.meetingDate) {
    updateData.meetingDate = new Date(data.meetingDate);
  }
  if (data.startTime) {
    updateData.startTime = new Date(data.startTime);
  }
  if (data.endTime) {
    updateData.endTime = new Date(data.endTime);
  }
  if (data.participants && Array.isArray(data.participants)) {
    updateData.participants = JSON.stringify(data.participants);
  }

  return prisma.meetingRecord.update({
    where: { id },
    data: updateData,
  });
};

/**
 * Delete a meeting record by its ID.
 * @param id - The ID of the meeting record to delete.
 */
export const deleteMeetingRecord = async (id: string): Promise<MeetingRecord> => {
  return prisma.meetingRecord.delete({
    where: { id },
  });
};

/**
 * Add an audio recording to a meeting record.
 * @param id - The ID of the meeting record.
 * @param audioData - The new audio recording data.
 */
export const addAudioRecording = async (
  id: string,
  audioData: Omit<AudioRecording, 'uploadedAt'>
): Promise<MeetingRecord> => {
  try {
    const record = await getMeetingRecordById(id);
    if (!record) {
      throw new AppError('Meeting record not found', 404);
    }

    // Parse existing audio recordings safely
    let audioRecordings: AudioRecording[] = [];
    try {
      if (record.audioRecordings) {
        if (typeof record.audioRecordings === 'string') {
          audioRecordings = JSON.parse(record.audioRecordings);
        } else if (Array.isArray(record.audioRecordings)) {
          audioRecordings = record.audioRecordings;
        }
      }
    } catch (parseError) {
      console.error('Error parsing audioRecordings:', parseError);
      // If parsing fails, start with empty array
      audioRecordings = [];
    }

    // Ensure audioRecordings is an array
    if (!Array.isArray(audioRecordings)) {
      audioRecordings = [];
    }

    const newAudio: AudioRecording = {
      ...audioData,
      uploadedAt: new Date().toISOString()
    };
    audioRecordings.push(newAudio);

    return await prisma.meetingRecord.update({
      where: { id },
      data: {
        audioRecordings: JSON.stringify(audioRecordings),
      },
    });
  } catch (error: any) {
    console.error('Error in addAudioRecording:', error);
    // Re-throw AppError as-is, wrap other errors
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error.message || 'Failed to add audio recording',
      error.statusCode || 500
    );
  }
};

/**
 * Remove an audio recording from a meeting record.
 * @param id - The ID of the meeting record.
 * @param audioIndex - The index of the audio recording to remove.
 */
export const removeAudioRecording = async (id: string, audioIndex: number): Promise<MeetingRecord> => {
  const record = await getMeetingRecordById(id);
  if (!record) {
    throw new Error('Meeting record not found');
  }

  const audioRecordings = (record.audioRecordings as AudioRecording[] || []);
  if (audioIndex < 0 || audioIndex >= audioRecordings.length) {
    throw new Error('Invalid audio recording index');
  }

  // Get the audio recording to be deleted
  const audioToDelete = audioRecordings[audioIndex];

  // Delete the file from filesystem
  if (audioToDelete.filename) {
    try {
      // Extract filename from URL if needed (format: /uploads/audio/filename)
      const filename = audioToDelete.filename || audioToDelete.url.split('/').pop();
      if (filename) {
        await deleteAudioFile(filename);
        console.log(`Deleted audio file: ${filename}`);
      }
    } catch (error) {
      console.error(`Failed to delete audio file ${audioToDelete.filename}:`, error);
      // Continue with database update even if file deletion fails
    }
  }

  // Remove from array
  audioRecordings.splice(audioIndex, 1);

  return prisma.meetingRecord.update({
    where: { id },
    data: {
      audioRecordings: JSON.stringify(audioRecordings),
    },
  });
};

/**
 * Update the content of a meeting record.
 * @param id - The ID of the meeting record.
 * @param content - The new content.
 */
export const updateContent = async (id: string, content: string): Promise<MeetingRecord> => {
  return prisma.meetingRecord.update({
    where: { id },
    data: { content },
  });
};

import * as aiIntegration from './aiIntegration.service';
// ... imports

// ... existing code ...

/**
 * Transcribe a specific audio recording from a meeting record.
 */
export const transcribeAudio = async (id: string, audioIndex: number): Promise<MeetingRecord> => {
  const record = await getMeetingRecordById(id);
  if (!record) throw new AppError(404, 'NOT_FOUND', 'Meeting record not found');

  const audioRecordings = (record.audioRecordings as unknown as AudioRecording[] || []);
  if (audioIndex < 0 || audioIndex >= audioRecordings.length) {
    throw new AppError(400, 'INVALID_INDEX', 'Invalid audio recording index');
  }

  const audio = audioRecordings[audioIndex];
  // extract filename relative path
  // audio.url is like "/uploads/audio/filename.mp3"
  // We need absolute path. UPLOAD_DIR is usually backend/uploads/audio/
  // Assume "uploads/audio" is in root of backend or src...
  // In `fileUpload.util.ts`, it says `UPLOAD_DIR = 'uploads/audio'`.
  // So path is process.cwd() + /uploads/audio/ + filename

  const filename = audio.filename || audio.url.split('/').pop();
  if (!filename) throw new AppError(400, 'INVALID_FILENAME', 'Invalid audio filename');

  const filePath = path.join(process.cwd(), 'uploads', 'audio', filename);

  // Call AI Service
  const result = await aiIntegration.transcribeAudio(filePath);

  if (!result.text) {
    throw new AppError(500, 'TRANSCRIPTION_EMPTY', 'Transcription returned empty text');
  }

  // Update record content (append)
  const newContent = (record.content ? record.content + '\n\n' : '') +
    `[Transcription - ${filename}]:\n${result.text}`;

  return prisma.meetingRecord.update({
    where: { id },
    data: { content: newContent }
  });
};

/**
 * Generate meeting minutes from its content.
 * @param id - The ID of the meeting record.
 * @param template - Optional template for formatting the minutes.
 * @param useAI - Whether to use AI generation.
 */
export const generateMinutes = async (id: string, template?: string, useAI: boolean = false): Promise<MeetingRecord> => {
  const record = await getMeetingRecordById(id);
  if (!record) {
    throw new Error('Meeting record not found');
  }

  let generatedMinutes = '';

  if (useAI && record.content) {
    // Call AI Service
    generatedMinutes = await aiIntegration.generateMinutesAI(record.content, template || 'administrative');
  } else {
    // Basic implementation
    generatedMinutes = template ?
      template.replace('{{content}}', record.content || '') :
      `Biên bản cuộc họp:\n\n${record.content || 'Nội dung không có.'}`;
  }

  return prisma.meetingRecord.update({
    where: { id },
    data: {
      minutes: generatedMinutes,
      status: record.status !== 'completed' ? 'completed' : record.status,
      completedAt: record.completedAt || new Date(),
    },
  });
};
