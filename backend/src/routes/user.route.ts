import { Router } from 'express';
import * as userController from '../controllers/user.controller';

const router = Router();

router.get('/users', userController.handleListUsers);
router.put('/users/:id', userController.handleUpdateUser);
router.put('/users/:id/status', userController.handleUpdateUserStatus);
router.put('/users/:id/reset-password', userController.handleResetUserPassword);
router.delete('/users/:id', userController.handleDeleteUser);

export default router;
