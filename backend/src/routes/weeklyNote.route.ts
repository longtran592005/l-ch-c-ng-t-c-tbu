
import { Router } from 'express';
import * as weeklyNoteController from '../controllers/weeklyNote.controller';
import { asyncHandler } from '../middleware/error.middleware';

const weeklyNoteRouter = Router();

weeklyNoteRouter.get('/weekly-notes', asyncHandler(weeklyNoteController.handleGetAllNotes));
weeklyNoteRouter.post('/weekly-notes', asyncHandler(weeklyNoteController.handleCreateNote));
weeklyNoteRouter.put('/weekly-notes/:id', asyncHandler(weeklyNoteController.handleUpdateNote));
weeklyNoteRouter.delete('/weekly-notes/:id', asyncHandler(weeklyNoteController.handleDeleteNote));

export default weeklyNoteRouter;
