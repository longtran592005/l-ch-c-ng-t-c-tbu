// src/controllers/schedule.controller.ts
import { Request, Response } from 'express';
import * as scheduleService from '../services/schedule.service';
import { excelService } from '../services/excel.service';
import { AppError } from '../utils/errors.util';
import path from 'path';
import fs from 'fs';

/**
 * Lấy tất cả lịch công tác
 */
export const handleGetAllSchedules = async (req: Request, res: Response) => {
  const schedules = await scheduleService.getAllSchedules();
  res.status(200).json(schedules);
};

/**
 * Lấy một lịch công tác theo ID
 */
export const handleGetScheduleById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const schedule = await scheduleService.getScheduleById(id);
  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }
  res.status(200).json(schedule);
};

/**
 * Tạo lịch công tác mới
 */
export const handleCreateSchedule = async (req: Request, res: Response) => {
  // TODO: Add validation for req.body
  const newSchedule = await scheduleService.createSchedule(req.body);
  res.status(201).json(newSchedule);
};

/**
 * Cập nhật lịch công tác
 */
export const handleUpdateSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  // TODO: Add validation for req.body
  const updatedSchedule = await scheduleService.updateSchedule(id, req.body);
  res.status(200).json(updatedSchedule);
};

/**
 * Xóa lịch công tác
 */
export const handleDeleteSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  await scheduleService.deleteSchedule(id);
  res.status(204).send(); // No content
};

/**
 * Duyệt lịch công tác
 */
export const handleApproveSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  const approvedSchedule = await scheduleService.approveSchedule(id);
  res.status(200).json(approvedSchedule);
};

/**
 * Xuất lịch công tác ra file Excel
 */
export const handleExportSchedule = async (req: Request, res: Response) => {
  const { date } = req.query;
  const targetDate = date ? new Date(String(date)) : new Date();

  // 1. Sync data to Excel
  await excelService.syncWeekToExcel(targetDate);

  // 2. Send file
  const filePath = path.join(__dirname, '../../public/lichmau.xlsx');

  if (fs.existsSync(filePath)) {
    res.download(filePath, 'LichCongTac.xlsx');
  } else {
    res.status(404).json({ message: 'File not found' });
  }
};
