import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { AppError } from '../utils/errors.util';
import fs from 'fs';
import path from 'path';
import { convertAudioToTextAutomation } from '../services/audioToTextAutomation.service';

/**
 * Controller để chuyển đổi audio sang text
 * Sử dụng Puppeteer để tự động hóa việc upload file và lấy kết quả từ trang web daotao.abaii.vn
 */
export const handleConvertAudioToText = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    throw new AppError('No audio file was uploaded.', 400);
  }

  try {
    // Lấy đường dẫn file
    let filePath: string;
    
    if (file.buffer) {
      // Nếu file được lưu trong buffer, cần lưu tạm vào disk
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      filePath = path.join(tempDir, `temp_${Date.now()}_${file.originalname}`);
      fs.writeFileSync(filePath, file.buffer);
    } else {
      // File đã được lưu vào disk bởi multer
      filePath = path.join(file.destination || 'uploads/audio', file.filename);
      
      if (!fs.existsSync(filePath)) {
        throw new AppError('Audio file not found on server.', 500);
      }
    }

    console.log(`[AudioToText] Starting conversion for file: ${file.originalname}`);

    // Sử dụng automation service để chuyển đổi
    const result = await convertAudioToTextAutomation(filePath, file.originalname);

    // Xóa file tạm nếu đã tạo
    if (file.buffer && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn(`[AudioToText] Failed to delete temp file: ${filePath}`, error);
      }
    }

    if (!result.success) {
      throw new AppError(
        result.error || 'Không thể chuyển đổi audio sang text.',
        500
      );
    }

    // Trả về kết quả
    res.status(200).json({
      success: true,
      text: result.text || '',
      processingTime: result.processingTime || null,
    });

  } catch (error: any) {
    console.error('[AudioToText] Error converting audio to text:', error);
    
    throw new AppError(
      error.message || 'Không thể chuyển đổi audio sang text. Vui lòng thử lại sau.',
      error.statusCode || 500
    );
  }
});

