import { Router } from 'express';
import * as roomController from '../controllers/room.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate, requireManageSchedule } from '../middleware/auth.middleware';

const roomRouter = Router();

roomRouter.get('/rooms', authenticate, asyncHandler(roomController.handleGetAllRooms));
roomRouter.post('/rooms', authenticate, requireManageSchedule, asyncHandler(roomController.handleCreateRoom));
roomRouter.put('/rooms/:id', authenticate, requireManageSchedule, asyncHandler(roomController.handleUpdateRoom));
roomRouter.delete('/rooms/:id', authenticate, requireManageSchedule, asyncHandler(roomController.handleDeleteRoom));

export default roomRouter;
