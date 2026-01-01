// src/controllers/schedule.controller.ts
import { Request, Response } from 'express';
import * as scheduleService from '../services/schedule.service';
import { AppError } from '../utils/errors.util';

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
