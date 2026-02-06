/**
 * STT (Speech-to-Text) Configuration Controller
 * API endpoints để quản lý cấu hình STT providers
 * 
 * @author TBU AI Team
 */

import { Request, Response, NextFunction } from 'express';
import * as sttConfigService from '../services/sttConfig.service';
import * as geminiSTTService from '../services/geminiSTT.service';

/**
 * GET /api/stt/config
 * Lấy cấu hình STT hiện tại
 */
export const getConfig = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = sttConfigService.getSTTConfig();
    const geminiAvailable = sttConfigService.checkGeminiAvailable();
    
    res.json({
      success: true,
      data: {
        ...config,
        geminiAvailable
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stt/providers
 * Lấy danh sách providers với thông tin chi tiết
 */
export const getProviders = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const providersInfo = sttConfigService.getSTTProvidersInfo();
    const geminiAvailable = sttConfigService.checkGeminiAvailable();
    
    res.json({
      success: true,
      data: {
        ...providersInfo,
        geminiAvailable
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stt/voice-form/provider
 * Đổi provider cho Voice Form (Bài 1)
 */
export const setVoiceFormProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { provider } = req.body;
    
    if (!provider || !['webspeech', 'gemini'].includes(provider)) {
      res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be "webspeech" or "gemini"'
      });
      return;
    }
    
    // Check Gemini availability if trying to switch to it
    if (provider === 'gemini' && !sttConfigService.checkGeminiAvailable()) {
      res.status(400).json({
        success: false,
        message: 'Gemini API Key chưa được cấu hình trong backend/.env'
      });
      return;
    }
    
    const newConfig = sttConfigService.setVoiceFormProvider(provider);
    
    res.json({
      success: true,
      message: `Voice Form provider đã chuyển sang ${provider === 'webspeech' ? 'Web Speech API' : 'Gemini 2.5 Flash'}`,
      data: newConfig
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stt/meeting/provider
 * Đổi provider cho Meeting Transcription (Bài 2)
 */
export const setMeetingProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { provider } = req.body;
    
    if (!provider || !['whisper', 'gemini'].includes(provider)) {
      res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be "whisper" or "gemini"'
      });
      return;
    }
    
    // Check Gemini availability if trying to switch to it
    if (provider === 'gemini' && !sttConfigService.checkGeminiAvailable()) {
      res.status(400).json({
        success: false,
        message: 'Gemini API Key chưa được cấu hình trong backend/.env'
      });
      return;
    }
    
    const newConfig = sttConfigService.setMeetingTranscriptionProvider(provider);
    
    res.json({
      success: true,
      message: `Meeting Transcription provider đã chuyển sang ${provider === 'whisper' ? 'Whisper VinAI' : 'Gemini 2.5 Flash'}`,
      data: newConfig
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stt/transcribe/short
 * Transcribe audio ngắn (Voice Form) bằng Gemini
 */
export const transcribeShort = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    
    console.log('[STT Controller] Received short audio transcription request');
    console.log('[STT Controller] MimeType:', mimeType);
    console.log('[STT Controller] Audio data length:', audioBase64?.length || 0);
    
    if (!audioBase64) {
      res.status(400).json({
        success: false,
        message: 'audioBase64 is required'
      });
      return;
    }
    
    // Kiểm tra kích thước tối thiểu (base64 string)
    if (audioBase64.length < 1000) {
      res.status(400).json({
        success: false,
        message: 'Audio data too small. Please speak longer.',
        data: {
          success: false,
          text: '',
          error: 'Audio quá ngắn',
          provider: 'gemini',
          model: ''
        }
      });
      return;
    }
    
    const result = await geminiSTTService.transcribeShortAudio(audioBase64, mimeType);
    
    console.log('[STT Controller] Transcription result:', {
      success: result.success,
      textLength: result.text?.length || 0,
      model: result.model,
      error: result.error
    });
    
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('[STT Controller] Error:', error);
    next(error);
  }
};

/**
 * POST /api/stt/transcribe/long
 * Transcribe audio dài (Meeting) bằng Gemini
 * Expects file upload or base64
 */
export const transcribeLong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if file was uploaded
    const file = (req as any).file;
    
    if (file) {
      // File upload mode
      const result = await geminiSTTService.transcribeLongAudio(file.path);
      
      res.json({
        success: result.success,
        data: result
      });
      return;
    }
    
    // Base64 mode
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    
    if (!audioBase64) {
      res.status(400).json({
        success: false,
        message: 'Either file upload or audioBase64 is required'
      });
      return;
    }
    
    const result = await geminiSTTService.transcribeFromBase64(audioBase64, mimeType, true);
    
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stt/health
 * Health check cho STT services
 */
export const healthCheck = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const geminiHealth = await geminiSTTService.checkGeminiSTTHealth();
    const config = sttConfigService.getSTTConfig();
    
    res.json({
      success: true,
      data: {
        config,
        gemini: geminiHealth,
        whisper: {
          available: true, // Whisper is local, always "available" if setup correctly
          note: 'Check whisper/status endpoint for detailed status'
        },
        webSpeech: {
          available: true,
          note: 'Web Speech API availability depends on browser'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
