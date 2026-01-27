import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/users', userController.handleListUsers);
router.post('/users/change-password', authenticate, userController.handleChangePassword);
router.put('/users/:id', userController.handleUpdateUser);
router.put('/users/:id/status', userController.handleUpdateUserStatus);
router.put('/users/:id/reset-password', userController.handleResetUserPassword);
router.delete('/users/:id', userController.handleDeleteUser);

export default router;
