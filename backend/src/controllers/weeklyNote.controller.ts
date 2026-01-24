
import { Request, Response } from 'express';
import * as weeklyNoteService from '../services/weeklyNote.service';

export const handleGetAllNotes = async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const notes = await weeklyNoteService.getAllWeeklyNotes(year);
    res.status(200).json(notes);
};

export const handleCreateNote = async (req: Request, res: Response) => {
    const note = await weeklyNoteService.createWeeklyNote(req.body);
    res.status(201).json(note);
};

export const handleUpdateNote = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const note = await weeklyNoteService.updateWeeklyNote(id, content);
    res.status(200).json(note);
};

export const handleDeleteNote = async (req: Request, res: Response) => {
    const { id } = req.params;
    await weeklyNoteService.deleteWeeklyNote(id);
    res.status(204).send();
};
