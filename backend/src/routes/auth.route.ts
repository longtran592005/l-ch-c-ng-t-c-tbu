import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { loginRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', loginRateLimiter, login);

export default router;
