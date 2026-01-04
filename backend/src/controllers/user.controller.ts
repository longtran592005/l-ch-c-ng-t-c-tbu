import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { AppError } from '../utils/errors.util';

export const handleListUsers = async (req: Request, res: Response) => {
  try {
    const users = await userService.listUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ message: 'Error listing users' });
  }
};

export const handleDeleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await userService.deleteUser(id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Error deleting user' });
    }
  }
};

export const handleUpdateUserStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // Expecting status to be 'active' or 'inactive'
  try {
    const updatedUser = await userService.updateUserStatus(id, status);
    res.status(200).json(updatedUser);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Error updating user status' });
    }
  }
};

export const handleResetUserPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  try {
    await userService.resetUserPassword(id, newPassword);
    res.status(200).json({ message: 'User password reset successfully' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
    } else {
      console.error('Error resetting user password:', error);
      res.status(500).json({ message: 'Error resetting user password' });
    }
  }
};

export const handleUpdateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await userService.updateUser(id, req.body);
  res.status(200).json(updated);
};
