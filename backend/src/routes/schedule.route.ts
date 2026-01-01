import { Router } from 'express';
import * as scheduleController from '../controllers/schedule.controller';
import { asyncHandler } from '../middleware/error.middleware';

const scheduleRouter = Router();

// Define schedule routes using the asyncHandler for error handling
scheduleRouter.get('/schedules', asyncHandler(scheduleController.handleGetAllSchedules));
scheduleRouter.post('/schedules', asyncHandler(scheduleController.handleCreateSchedule));
scheduleRouter.get('/schedules/:id', asyncHandler(scheduleController.handleGetScheduleById));
scheduleRouter.put('/schedules/:id', asyncHandler(scheduleController.handleUpdateSchedule));
scheduleRouter.delete('/schedules/:id', asyncHandler(scheduleController.handleDeleteSchedule));
scheduleRouter.post('/schedules/:id/approve', asyncHandler(scheduleController.handleApproveSchedule));

export default scheduleRouter;
