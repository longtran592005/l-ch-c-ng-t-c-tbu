import { Router } from 'express';
import * as userController from '../controllers/user.controller';

const router = Router();

router.put('/users/:id', userController.handleUpdateUser);

export default router;
