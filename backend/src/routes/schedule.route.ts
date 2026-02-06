import { Router } from 'express';
import * as scheduleController from '../controllers/schedule.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate, requireManageSchedule } from '../middleware/auth.middleware';

const scheduleRouter = Router();

// Public routes
scheduleRouter.get('/schedules', asyncHandler(scheduleController.handleGetAllSchedules));
scheduleRouter.get('/schedules/:id', asyncHandler(asyncHandler(scheduleController.handleGetScheduleById)));

// Protected routes (require login and manage permission)
scheduleRouter.post('/schedules', authenticate, requireManageSchedule, asyncHandler(scheduleController.handleCreateSchedule));
scheduleRouter.put('/schedules/:id', authenticate, requireManageSchedule, asyncHandler(scheduleController.handleUpdateSchedule));
scheduleRouter.delete('/schedules/:id', authenticate, requireManageSchedule, asyncHandler(scheduleController.handleDeleteSchedule));
scheduleRouter.post('/schedules/:id/approve', authenticate, requireManageSchedule, asyncHandler(scheduleController.handleApproveSchedule));

export default scheduleRouter;
