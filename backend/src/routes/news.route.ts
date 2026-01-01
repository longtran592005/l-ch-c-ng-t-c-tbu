import { Router } from 'express';
import * as newsController from '../controllers/news.controller';
import { asyncHandler } from '../middleware/error.middleware';

const newsRouter = Router();

newsRouter.get('/news', asyncHandler(newsController.handleGetAllNews));
newsRouter.post('/news', asyncHandler(newsController.handleCreateNews));
newsRouter.get('/news/:id', asyncHandler(newsController.handleGetNewsById));
newsRouter.put('/news/:id', asyncHandler(newsController.handleUpdateNews));
newsRouter.delete('/news/:id', asyncHandler(newsController.handleDeleteNews));

export default newsRouter;
