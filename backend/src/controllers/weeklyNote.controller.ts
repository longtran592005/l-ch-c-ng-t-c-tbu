
import { Request, Response } from 'express';
import * as weeklyNoteService from '../services/weeklyNote.service';

/**
 * Serialize a WeeklyNote for the API response.
 * Converts @db.Date fields to "YYYY-MM-DD" to prevent timezone date-shifting.
 */
function serializeWeeklyNote(r: any): any {
  if (!r) return r;
  const result = { ...r };
  for (const field of ['startDate', 'endDate']) {
    if (result[field] instanceof Date) {
      const y = result[field].getUTCFullYear();
      const m = String(result[field].getUTCMonth() + 1).padStart(2, '0');
      const d = String(result[field].getUTCDate()).padStart(2, '0');
      result[field] = `${y}-${m}-${d}`;
    }
  }
  return result;
}

export const handleGetAllNotes = async (req: Request, res: Response) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const notes = await weeklyNoteService.getAllWeeklyNotes(year);
    res.status(200).json(notes.map(serializeWeeklyNote));
};

export const handleCreateNote = async (req: Request, res: Response) => {
    const note = await weeklyNoteService.createWeeklyNote(req.body);
    res.status(201).json(serializeWeeklyNote(note));
};

export const handleUpdateNote = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const note = await weeklyNoteService.updateWeeklyNote(id, content);
    res.status(200).json(serializeWeeklyNote(note));
};

export const handleDeleteNote = async (req: Request, res: Response) => {
    const { id } = req.params;
    await weeklyNoteService.deleteWeeklyNote(id);
    res.status(204).send();
};
