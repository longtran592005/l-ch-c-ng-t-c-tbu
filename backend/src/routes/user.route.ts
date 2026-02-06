import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/users', authenticate, requireRole('admin'), userController.handleListUsers);
router.post('/users/change-password', authenticate, userController.handleChangePassword);
router.put('/users/:id', authenticate, requireRole('admin'), userController.handleUpdateUser);
router.put('/users/:id/status', authenticate, requireRole('admin'), userController.handleUpdateUserStatus);
router.put('/users/:id/reset-password', authenticate, requireRole('admin'), userController.handleResetUserPassword);
router.delete('/users/:id', authenticate, requireRole('admin'), userController.handleDeleteUser);

export default router;
