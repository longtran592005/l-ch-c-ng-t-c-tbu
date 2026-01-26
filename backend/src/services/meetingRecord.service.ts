
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
      where.meetingDate = { ...(where.meetingDate as Prisma.DateTimeFilter), gte: new Date(filters.dateFrom) };
    }
    if (filters.dateTo) {
      where.meetingDate = { ...(where.meetingDate as Prisma.DateTimeFilter), lte: new Date(filters.dateTo) };
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
  const meetingDate = new Date(data.meetingDate);

  // Helper function to parse time string (HH:mm) combined with meetingDate
  const parseTime = (timeStr: string | Date | undefined): Date | undefined => {
    if (!timeStr) return undefined;

    // If it's already a valid Date object
    if (timeStr instanceof Date && !isNaN(timeStr.getTime())) {
      return timeStr;
    }

    // If it's a string
    if (typeof timeStr === 'string') {
      // Check if it's already a full ISO date string
      const fullDate = new Date(timeStr);
      if (!isNaN(fullDate.getTime()) && timeStr.includes('T')) {
        return fullDate;
      }

      // Parse HH:mm format
      const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const combined = new Date(meetingDate);
        combined.setHours(hours, minutes, 0, 0);
        return combined;
      }
    }

    // Return undefined if can't parse
    return undefined;
  };

  const newRecord = await prisma.meetingRecord.create({
    data: {
      ...data,
      meetingDate: meetingDate,
      startTime: parseTime(data.startTime),
      endTime: parseTime(data.endTime),
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
      throw new AppError(404, 'NOT_FOUND', 'Meeting record not found');
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
      error.statusCode || 500,
      'FAILED_ADD_AUDIO',
      error.message || 'Failed to add audio recording'
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

  const audioRecordings = (record.audioRecordings as unknown as AudioRecording[] || []);
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

import * as whisperSimple from './whisperSimple.service';

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
  const filename = audio.filename || audio.url.split('/').pop();
  if (!filename) throw new AppError(400, 'INVALID_FILENAME', 'Invalid audio filename');

  const filePath = path.join(process.cwd(), 'uploads', 'audio', filename);

  // Use the simple whisper integration directly
  // Note: we're passing the file path to the simple service which runs the python script
  const resultText = await whisperSimple.transcribeToText(filePath);

  const result = { text: resultText };

  if (!result.text) {
    throw new AppError(500, 'TRANSCRIPTION_EMPTY', 'Transcription returned empty text');
  }

  const newContent = (record.content ? record.content + '\n\n' : '') +
    `[Transcription - ${filename}]:\n${result.text}`;

  return prisma.meetingRecord.update({
    where: { id },
    data: { content: newContent }
  });
};

import { llmService } from './llm.service';

/**
 * Refine content using AI (Ollama).
 */
export const refineContent = async (id: string): Promise<MeetingRecord> => {
  const record = await getMeetingRecordById(id);
  if (!record) throw new AppError(404, 'NOT_FOUND', 'Meeting record not found');
  if (!record.content) throw new AppError(400, 'NO_CONTENT', 'No content to refine');

  const refinedText = await llmService.refineText(record.content);

  if (!refinedText) {
    throw new AppError(500, 'AI_FAILED', 'AI returned empty response');
  }

  // Update with refined content
  return prisma.meetingRecord.update({
    where: { id },
    data: { content: refinedText }
  });
};

/**
 * Generate meeting summary using AI.
 */
export const generateSummary = async (id: string, maxTokens?: number): Promise<{ summary: string }> => {
  // AI features disabled
  throw new AppError(501, 'NOT_IMPLEMENTED', 'AI Summary is currently disabled in local whisper mode.');
};

/**
 * Generate meeting minutes using AI (Qwen 2.5).
 */
export const generateMinutes = async (
  id: string,
  template?: string,
  useAI: boolean = false
): Promise<MeetingRecord> => {
  const record = await getMeetingRecordById(id);
  if (!record) {
    throw new Error('Meeting record not found');
  }

  let generatedMinutes = '';

  if (useAI && record.content) {
    // Generate minutes using Local AI (Ollama/Qwen)
    generatedMinutes = await llmService.generateMinutes(record.content);
  } else {
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

/**
 * Extract action items using AI.
 */
export const extractActionItems = async (id: string): Promise<any> => {
  const record = await getMeetingRecordById(id);
  if (!record) throw new AppError(404, 'NOT_FOUND', 'Meeting record not found');
  if (!record.content) throw new AppError(400, 'NO_CONTENT', 'No content to analyze');

  // AI features disabled
  // const result = await aiIntegration.extractActionItems({ content: record.content });
  // return result;
  throw new AppError(501, 'NOT_IMPLEMENTED', 'AI Action Items is currently disabled in local whisper mode.');
};

/**
 * Perform deep analysis using AI.
 */
export const deepAnalysis = async (id: string, maxTokens?: number): Promise<{ analysis: string }> => {
  const record = await getMeetingRecordById(id);
  if (!record) throw new AppError(404, 'NOT_FOUND', 'Meeting record not found');
  if (!record.content) throw new AppError(400, 'NO_CONTENT', 'No content to analyze');

  // const result = await aiIntegration.deepAnalysis({
  //   content: record.content,
  //   maxTokens,
  // });

  // return result;
  throw new AppError(501, 'NOT_IMPLEMENTED', 'AI Deep Analysis is currently disabled in local whisper mode.');
};

/**
 * Generate meeting insights using AI.
 */
export const meetingInsights = async (id: string, maxTokens?: number): Promise<{ insights: string }> => {
  const record = await getMeetingRecordById(id);
  if (!record) throw new AppError(404, 'NOT_FOUND', 'Meeting record not found');
  if (!record.content) throw new AppError(400, 'NO_CONTENT', 'No content to analyze');

  // const result = await aiIntegration.meetingInsights({
  //   content: record.content,
  //   maxTokens,
  // });

  // return result;
  throw new AppError(501, 'NOT_IMPLEMENTED', 'AI Insights is currently disabled in local whisper mode.');
};
