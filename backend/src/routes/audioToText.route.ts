import { Router } from 'express';
import * as audioToTextController from '../controllers/audioToText.controller';
import { uploadAudio } from '../utils/fileUpload.util';
import { audioToTextRateLimiter } from '../middleware/rateLimiter.middleware';
// import { authenticate } from '../middleware/auth.middleware'; // Should be enabled in production

const audioToTextRouter = Router();

// Route để chuyển đổi audio sang text
// Lưu ý: Route này nên được bảo vệ bằng authentication trong production
// Sử dụng rate limiter riêng vì mỗi request mất nhiều thời gian
audioToTextRouter.post(
  '/audio-to-text/convert',
  audioToTextRateLimiter, // Rate limiter riêng cho audio conversion
  // authenticate, // Uncomment in production
  uploadAudio.single('audioFile'), // Sử dụng cùng multer config với audio upload
  audioToTextController.handleConvertAudioToText
);

export default audioToTextRouter;

