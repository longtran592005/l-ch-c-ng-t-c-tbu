import { Request, Response } from 'express';
import * as userService from '../services/user.service';

export const handleUpdateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await userService.updateUser(id, req.body);
  res.status(200).json(updated);
};
