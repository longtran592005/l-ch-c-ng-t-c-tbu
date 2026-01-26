import express from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Proxy AI request (cần auth hoặc không tùy logic, ở đây mình để open hoặc auth tùy bạn, 
// nhưng tốt nhất là nên có auth nếu public internet. Tuy nhiên voiceAI hiện tại ở frontend có thể chưa gửi token header.
// Tạm thời mình để open cho dễ test, sau này thêm authenticate vào middleware)
router.post('/process', aiController.processVoiceData);

export default router;
