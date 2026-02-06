import { Router } from 'express';
import * as newsController from '../controllers/news.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const newsRouter = Router();

// Public routes
newsRouter.get('/news', asyncHandler(newsController.handleGetAllNews));
newsRouter.get('/news/:id', asyncHandler(newsController.handleGetNewsById));

// Protected routes
newsRouter.post('/news', authenticate, requireRole('admin', 'staff'), asyncHandler(newsController.handleCreateNews));
newsRouter.put('/news/:id', authenticate, requireRole('admin', 'staff'), asyncHandler(newsController.handleUpdateNews));
newsRouter.delete('/news/:id', authenticate, requireRole('admin', 'staff'), asyncHandler(newsController.handleDeleteNews));

export default newsRouter;
