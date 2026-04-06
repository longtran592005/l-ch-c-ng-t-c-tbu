import { Request, Response } from 'express';
import * as roomService from '../services/room.service';
import { ValidationError } from '../utils/errors.util';

export const handleGetAllRooms = async (_req: Request, res: Response) => {
  const rooms = await roomService.getAllRooms();
  res.status(200).json(rooms);
};

export const handleCreateRoom = async (req: Request, res: Response) => {
  if (!req.body?.name || String(req.body.name).trim().length === 0) {
    throw new ValidationError('Tên phòng là bắt buộc');
  }

  const room = await roomService.createRoom(req.body);
  res.status(201).json(room);
};

export const handleUpdateRoom = async (req: Request, res: Response) => {
  const room = await roomService.updateRoom(req.params.id, req.body);
  res.status(200).json(room);
};

export const handleDeleteRoom = async (req: Request, res: Response) => {
  await roomService.deleteRoom(req.params.id);
  res.status(204).send();
};
