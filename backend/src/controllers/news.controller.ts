import { Request, Response } from 'express';
import * as newsService from '../services/news.service';
import { AppError } from '../utils/errors.util';

/**
 * Get all news
 */
export const handleGetAllNews = async (req: Request, res: Response) => {
  const news = await newsService.getAllNews();
  res.status(200).json(news);
};

/**
 * Get news by ID
 */
export const handleGetNewsById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const news = await newsService.getNewsById(id);
  if (!news) {
    throw new AppError('News not found', 404);
  }
  res.status(200).json(news);
};

/**
 * Create news
 */
export const handleCreateNews = async (req: Request, res: Response) => {
  const newNews = await newsService.createNews(req.body);
  res.status(201).json(newNews);
};

/**
 * Update news
 */
export const handleUpdateNews = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatedNews = await newsService.updateNews(id, req.body);
  res.status(200).json(updatedNews);
};

/**
 * Delete news
 */
export const handleDeleteNews = async (req: Request, res: Response) => {
  const { id } = req.params;
  await newsService.deleteNews(id);
  res.status(204).send();
};
