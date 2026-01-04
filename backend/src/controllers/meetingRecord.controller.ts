
import { Request, Response } from 'express';
import * as meetingRecordService from '../services/meetingRecord.service';
import { AppError } from '../utils/errors.util';
import { asyncHandler } from '../middleware/error.middleware';
import path from 'path';

export const handleGetAllMeetingRecords = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { scheduleId, status, dateFrom, dateTo } = req.query;
    const filters = {
      scheduleId: scheduleId as string | undefined,
      status: status as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
    };
    const records = await meetingRecordService.getAllMeetingRecords(filters);
    res.status(200).json(records);
  } catch (error: any) {
    console.error('Error in handleGetAllMeetingRecords:', error);
    // Re-throw to be handled by error middleware
    throw error;
  }
});

export const handleUploadAudio = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
        throw new AppError('No audio file was uploaded.', 400);
    }

    // The file has already been validated by the multer fileFilter
    
    // Create a public URL to access the file
    // Assumes that the 'uploads' directory is served statically
    const fileUrl = `/uploads/audio/${file.filename}`;

    // TODO: Implement a way to get the audio duration from the uploaded file.
    // This might require a library like 'music-metadata' or 'fluent-ffmpeg'.
    const duration = 0; // Placeholder

    const audioData = {
        url: fileUrl,
        filename: file.filename,
        duration,
        type: 'uploaded' as 'uploaded' | 'recorded',
    };

    const updatedRecord = await meetingRecordService.addAudioRecording(id, audioData);

    res.status(200).json({
        message: 'File uploaded successfully',
        record: updatedRecord,
        fileUrl: fileUrl,
    });
});

export const handleGetMeetingRecordById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const record = await meetingRecordService.getMeetingRecordById(id);
  if (!record) {
    throw new AppError('MeetingRecord not found', 404);
  }
  res.status(200).json(record);
});

export const handleGetMeetingRecordsByScheduleId = asyncHandler(async (req: Request, res: Response) => {
  const { scheduleId } = req.params;
  const records = await meetingRecordService.getMeetingRecordsByScheduleId(scheduleId);
  res.status(200).json(records);
});

export const handleCreateMeetingRecord = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Add Zod validation
  // Automatically add createdBy from authenticated user if available
  const createData = {
    ...req.body,
    createdBy: (req as any).user?.id || req.body.createdBy || req.body.createdBy,
  };
  
  // If no createdBy is provided and no user is authenticated, throw error
  if (!createData.createdBy) {
    throw new AppError('createdBy is required. Please provide createdBy or ensure you are authenticated.', 400);
  }
  
  const newRecord = await meetingRecordService.createMeetingRecord(createData);
  res.status(201).json(newRecord);
});

export const handleUpdateMeetingRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // TODO: Add Zod validation
  const updatedRecord = await meetingRecordService.updateMeetingRecord(id, req.body);
  res.status(200).json(updatedRecord);
});

export const handleDeleteMeetingRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await meetingRecordService.deleteMeetingRecord(id);
  res.status(204).send();
});

export const handleAddAudioRecording = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { url, filename, duration, type } = req.body;

  if (!url || !filename || !duration || !type) {
      throw new AppError('Missing required audio data fields: url, filename, duration, type', 400);
  }

  const updatedRecord = await meetingRecordService.addAudioRecording(id, { url, filename, duration, type });
  res.status(200).json(updatedRecord);
});

export const handleRemoveAudioRecording = asyncHandler(async (req: Request, res: Response) => {
    const { id, audioIndex } = req.params;

    if (!audioIndex) {
        throw new AppError('audioIndex is required in the URL', 400);
    }
    
    const index = parseInt(audioIndex, 10);
    if (isNaN(index)) {
        throw new AppError('audioIndex must be a number', 400);
    }

    const updatedRecord = await meetingRecordService.removeAudioRecording(id, index);
    res.status(200).json(updatedRecord);
});


export const handleUpdateContent = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;

    if (content === undefined) {
        throw new AppError('Content is required', 400);
    }

    const updatedRecord = await meetingRecordService.updateContent(id, content);
    res.status(200).json(updatedRecord);
});

export const handleGenerateMinutes = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { template } = req.body;

    const updatedRecord = await meetingRecordService.generateMinutes(id, template);
    res.status(200).json(updatedRecord);
});
