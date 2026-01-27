# Kế hoạch tích hợp Coqui XTTS v2 vào Hệ thống Lịch Công Tác TBU

## 📋 Thông tin dự án

| Thuộc tính | Giá trị |
|------------|---------|
| **Model TTS** | Coqui XTTS v2 |
| **Hardware** | RTX 3050 6GB VRAM |
| **Ngôn ngữ** | Tiếng Việt (Vietnamese) |
| **Giọng đọc** | 2 giọng: Nam miền Bắc, Nữ miền Bắc |
| **Chiến lược** | Pre-generate (tạo trước) + Cache + On-demand regenerate |

---

## 🎯 Mục tiêu

1. Khi lịch công tác được tạo/sửa → Tự động chuyển thành file audio
2. Lưu trữ 2 phiên bản audio (nam/nữ) cho mỗi lịch
3. Khi user bấm nút loa → Hiển thị popup chọn giọng → Phát audio tương ứng
4. Tối ưu VRAM (6GB) và thời gian xử lý

---

## 🏗️ Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  WeeklyScheduleTable                                                │   │
│  │  ┌──────────┐                                                       │   │
│  │  │ TTSButton│ → Click → VoiceSelectorPopup → Play Audio URL         │   │
│  │  └──────────┘                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ GET /api/schedules/:id/audio/:voice
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js/Express)                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  tts.controller.ts                                                  │   │
│  │  • GET /audio/:scheduleId/:voiceType → Trả về audio file            │   │
│  │  • POST /generate/:scheduleId → Trigger regenerate cho 1 lịch       │   │
│  │  • POST /generate-all → Generate audio cho tất cả lịch              │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│  ┌──────────────────────────────────▼──────────────────────────────────┐   │
│  │  tts.service.ts                                                     │   │
│  │  • formatScheduleText() → Chuyển schedule thành văn bản đọc         │   │
│  │  • requestTTSGeneration() → Gọi Python XTTS Service                 │   │
│  │  • getAudioPath() → Lấy đường dẫn audio file                        │   │
│  │  • cleanupOldAudio() → Xóa audio cũ khi lịch bị xóa                 │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│  ┌──────────────────────────────────▼──────────────────────────────────┐   │
│  │  schedule.service.ts (SỬA ĐỔI)                                      │   │
│  │  • createSchedule() → Gọi TTS generate sau khi tạo                  │   │
│  │  • updateSchedule() → Gọi TTS regenerate khi sửa nội dung           │   │
│  │  • deleteSchedule() → Gọi TTS cleanup xóa audio                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTP POST to localhost:8003
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PYTHON XTTS SERVICE (FastAPI) - Port 8003               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Endpoints:                                                         │   │
│  │  • POST /synthesize - Tạo audio từ text                             │   │
│  │    Body: { text, voice_type, schedule_id }                          │   │
│  │    Response: { success, audio_path, duration }                      │   │
│  │                                                                     │   │
│  │  • GET /voices - Danh sách voices available                         │   │
│  │  • GET /health - Health check                                       │   │
│  │  • POST /warmup - Load model vào VRAM                               │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│  ┌──────────────────────────────────▼──────────────────────────────────┐   │
│  │  Coqui XTTS v2 Model                                                │   │
│  │  • Model: tts_models/multilingual/multi-dataset/xtts_v2             │   │
│  │  • Voice Cloning: Dùng reference audio samples                      │   │
│  │  • Output: WAV/MP3 files                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FILE STORAGE                                      │
│  uploads/                                                                   │
│  └── tts/                                                                   │
│      ├── male/                          # Giọng nam miền Bắc                │
│      │   ├── schedule_abc123.mp3                                            │
│      │   ├── schedule_def456.mp3                                            │
│      │   └── ...                                                            │
│      ├── female/                        # Giọng nữ miền Bắc                 │
│      │   ├── schedule_abc123.mp3                                            │
│      │   ├── schedule_def456.mp3                                            │
│      │   └── ...                                                            │
│      └── reference/                     # Voice samples gốc                 │
│          ├── male_north.wav             # 10-15 giây giọng nam              │
│          └── female_north.wav           # 10-15 giây giọng nữ               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Cấu trúc file mới

```
l-ch-c-ng-t-c-tbu/
├── backend/
│   └── src/
│       ├── controllers/
│       │   └── tts.controller.ts         # [MỚI] Controller cho TTS
│       ├── services/
│       │   └── tts.service.ts            # [MỚI] Service gọi Python XTTS
│       ├── routes/
│       │   └── tts.route.ts              # [MỚI] Route definitions
│       └── utils/
│           └── ttsHelper.ts              # [MỚI] Helper format text
│
├── python_tts_service/                   # [MỚI] Thư mục Python service
│   ├── main.py                           # FastAPI server
│   ├── tts_engine.py                     # XTTS wrapper
│   ├── config.py                         # Cấu hình
│   ├── requirements.txt                  # Dependencies
│   └── voices/                           # Voice reference samples
│       ├── male_north.wav
│       └── female_north.wav
│
├── uploads/
│   └── tts/                              # [MỚI] Lưu trữ audio
│       ├── male/
│       └── female/
│
└── src/
    ├── components/
    │   └── ui/
    │       ├── tts-button.tsx            # [SỬA] Thêm voice selector
    │       └── voice-selector-popup.tsx  # [MỚI] Popup chọn giọng
    └── hooks/
        └── useTTS.ts                     # [SỬA] Hỗ trợ play cached audio
```

---

## 📋 Chi tiết từng Phase

---

## Phase 1: Setup Python XTTS Service (2-3 ngày)

### 1.1. Chuẩn bị môi trường Python

```bash
# Tạo thư mục
mkdir python_tts_service
cd python_tts_service

# Tạo virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Cài đặt dependencies
pip install TTS torch torchaudio fastapi uvicorn pydub python-multipart
```

### 1.2. File `requirements.txt`

```
TTS>=0.22.0
torch>=2.0.0
torchaudio>=2.0.0
fastapi>=0.109.0
uvicorn>=0.27.0
pydub>=0.25.1
python-multipart>=0.0.6
```

### 1.3. File `config.py`

```python
"""
Cấu hình cho XTTS Service
"""
import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VOICES_DIR = os.path.join(BASE_DIR, "voices")
OUTPUT_DIR = os.path.join(BASE_DIR, "..", "uploads", "tts")

# Voice reference files
VOICE_SAMPLES = {
    "male": os.path.join(VOICES_DIR, "male_north.wav"),
    "female": os.path.join(VOICES_DIR, "female_north.wav"),
}

# Model config
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
LANGUAGE = "vi"  # Vietnamese

# Audio config
SAMPLE_RATE = 24000
OUTPUT_FORMAT = "mp3"  # mp3 hoặc wav

# Performance (tối ưu cho RTX 3050 6GB)
USE_GPU = True
GPU_DEVICE = "cuda:0"
# Batch processing: Xử lý 1 request tại 1 thời điểm để tránh OOM
MAX_CONCURRENT = 1
```

### 1.4. File `tts_engine.py`

```python
"""
XTTS v2 Engine Wrapper
"""
import os
import torch
from TTS.api import TTS
from config import *

class XTTSEngine:
    def __init__(self):
        self.model = None
        self.is_loaded = False
        
    def load_model(self):
        """Load XTTS model vào GPU"""
        if self.is_loaded:
            return
            
        print("[XTTS] Loading model to GPU...")
        
        # Kiểm tra GPU
        if USE_GPU and torch.cuda.is_available():
            device = GPU_DEVICE
            print(f"[XTTS] Using GPU: {torch.cuda.get_device_name(0)}")
            print(f"[XTTS] VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
        else:
            device = "cpu"
            print("[XTTS] Using CPU (slower)")
        
        self.model = TTS(MODEL_NAME).to(device)
        self.is_loaded = True
        print("[XTTS] Model loaded successfully!")
        
    def unload_model(self):
        """Giải phóng VRAM"""
        if self.model:
            del self.model
            torch.cuda.empty_cache()
            self.is_loaded = False
            print("[XTTS] Model unloaded, VRAM freed")
            
    def synthesize(self, text: str, voice_type: str, output_path: str) -> dict:
        """
        Tổng hợp giọng nói từ text
        
        Args:
            text: Văn bản cần đọc
            voice_type: 'male' hoặc 'female'
            output_path: Đường dẫn lưu file audio
            
        Returns:
            dict: { success, audio_path, duration_seconds }
        """
        if not self.is_loaded:
            self.load_model()
            
        # Lấy reference audio
        speaker_wav = VOICE_SAMPLES.get(voice_type)
        if not speaker_wav or not os.path.exists(speaker_wav):
            raise ValueError(f"Voice sample not found: {voice_type}")
            
        # Tạo thư mục output nếu chưa có
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        try:
            # Generate audio
            self.model.tts_to_file(
                text=text,
                speaker_wav=speaker_wav,
                language=LANGUAGE,
                file_path=output_path
            )
            
            # Lấy duration
            from pydub import AudioSegment
            audio = AudioSegment.from_file(output_path)
            duration_seconds = len(audio) / 1000.0
            
            return {
                "success": True,
                "audio_path": output_path,
                "duration_seconds": duration_seconds
            }
            
        except Exception as e:
            print(f"[XTTS] Error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Singleton instance
xtts_engine = XTTSEngine()
```

### 1.5. File `main.py` (FastAPI Server)

```python
"""
FastAPI Server cho XTTS v2
Port: 8003
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import asyncio
from typing import Optional

from tts_engine import xtts_engine
from config import OUTPUT_DIR, VOICE_SAMPLES

app = FastAPI(title="TBU XTTS Service", version="1.0")

# Request queue để xử lý tuần tự (tránh OOM)
request_queue = asyncio.Queue()
is_processing = False

class SynthesizeRequest(BaseModel):
    text: str
    voice_type: str  # 'male' hoặc 'female'
    schedule_id: str
    
class SynthesizeResponse(BaseModel):
    success: bool
    audio_path: Optional[str] = None
    audio_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    error: Optional[str] = None

@app.on_event("startup")
async def startup():
    """Load model khi server khởi động"""
    print("[Server] Starting XTTS Service...")
    # Warmup model (optional - có thể lazy load khi có request đầu tiên)
    # xtts_engine.load_model()

@app.get("/")
async def root():
    return {
        "service": "TBU XTTS v2",
        "status": "running",
        "model_loaded": xtts_engine.is_loaded
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": xtts_engine.is_loaded,
        "gpu_available": torch.cuda.is_available() if 'torch' in dir() else False
    }

@app.get("/voices")
async def list_voices():
    """Danh sách voices có sẵn"""
    return {
        "voices": [
            {
                "id": "male",
                "name": "Giọng nam miền Bắc",
                "sample_exists": os.path.exists(VOICE_SAMPLES.get("male", ""))
            },
            {
                "id": "female", 
                "name": "Giọng nữ miền Bắc",
                "sample_exists": os.path.exists(VOICE_SAMPLES.get("female", ""))
            }
        ]
    }

@app.post("/warmup")
async def warmup():
    """Load model vào VRAM trước"""
    try:
        xtts_engine.load_model()
        return {"success": True, "message": "Model loaded to GPU"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize(request: SynthesizeRequest):
    """
    Tổng hợp giọng nói từ text
    
    Request body:
    - text: Văn bản cần đọc
    - voice_type: 'male' hoặc 'female'
    - schedule_id: ID của lịch công tác
    """
    # Validate voice type
    if request.voice_type not in ["male", "female"]:
        raise HTTPException(status_code=400, detail="voice_type must be 'male' or 'female'")
    
    # Validate text
    if not request.text or len(request.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Text too short")
    
    # Xác định output path
    output_dir = os.path.join(OUTPUT_DIR, request.voice_type)
    output_filename = f"schedule_{request.schedule_id}.mp3"
    output_path = os.path.join(output_dir, output_filename)
    
    try:
        # Generate audio
        result = xtts_engine.synthesize(
            text=request.text,
            voice_type=request.voice_type,
            output_path=output_path
        )
        
        if result["success"]:
            # Tạo URL relative
            audio_url = f"/uploads/tts/{request.voice_type}/{output_filename}"
            
            return SynthesizeResponse(
                success=True,
                audio_path=output_path,
                audio_url=audio_url,
                duration_seconds=result["duration_seconds"]
            )
        else:
            return SynthesizeResponse(
                success=False,
                error=result.get("error", "Unknown error")
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch-synthesize")
async def batch_synthesize(schedules: list[dict], background_tasks: BackgroundTasks):
    """
    Tạo audio cho nhiều lịch (chạy background)
    Dùng cho việc generate lần đầu hoặc regenerate all
    """
    async def process_batch():
        for schedule in schedules:
            for voice in ["male", "female"]:
                await synthesize(SynthesizeRequest(
                    text=schedule["text"],
                    voice_type=voice,
                    schedule_id=schedule["id"]
                ))
    
    background_tasks.add_task(process_batch)
    return {"message": f"Processing {len(schedules)} schedules in background"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
```

### 1.6. Chuẩn bị Voice Samples

**YÊU CẦU QUAN TRỌNG:**

| Thuộc tính | Yêu cầu |
|------------|---------|
| **Định dạng** | WAV (16-bit, mono) |
| **Độ dài** | 10-30 giây |
| **Nội dung** | Đọc văn bản tiếng Việt rõ ràng, tự nhiên |
| **Chất lượng** | Không tiếng ồn, không echo |
| **Sample rate** | 22050 Hz hoặc 24000 Hz |

**Nguồn voice samples:**
1. **Thu âm mới**: Nhờ người có giọng miền Bắc chuẩn đọc 1 đoạn văn
2. **Dùng dataset có sẵn**: 
   - VIVOS dataset (Vietnamese speech corpus)
   - VLSP dataset
3. **Tự thu**: Sử dụng microphone chất lượng, phòng yên tĩnh

**Script mẫu để đọc (10-15 giây):**
```
"Trường Đại học Thái Bình được thành lập năm 2011, là cơ sở đào tạo đại học công lập 
đầu tiên của tỉnh Thái Bình. Nhà trường đào tạo đa ngành, đa lĩnh vực với sứ mệnh 
đào tạo nguồn nhân lực chất lượng cao, phục vụ sự nghiệp công nghiệp hóa, hiện đại hóa 
đất nước và hội nhập quốc tế."
```

---

## Phase 2: Backend Integration (2 ngày)

### 2.1. File `backend/src/services/tts.service.ts`

```typescript
/**
 * TTS Service - Giao tiếp với Python XTTS Service
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Schedule } from '@prisma/client';

const XTTS_SERVICE_URL = process.env.XTTS_SERVICE_URL || 'http://localhost:8003';
const TTS_OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'tts');

export type VoiceType = 'male' | 'female';

export interface TTSResult {
  success: boolean;
  audioUrl?: string;
  duration?: number;
  error?: string;
}

export const ttsService = {
  /**
   * Format lịch công tác thành văn bản để đọc
   */
  formatScheduleText(schedule: Schedule): string {
    const parts: string[] = [];
    
    // Thời gian
    if (schedule.startTime) {
      const timeStr = schedule.endTime 
        ? `Từ ${schedule.startTime} đến ${schedule.endTime}`
        : `Lúc ${schedule.startTime}`;
      parts.push(timeStr);
    }
    
    // Nội dung
    if (schedule.content) {
      parts.push(schedule.content);
    }
    
    // Địa điểm
    if (schedule.location) {
      parts.push(`tại ${schedule.location}`);
    }
    
    // Lãnh đạo
    if (schedule.leader) {
      parts.push(`do ${schedule.leader} chủ trì`);
    }
    
    // Thành phần tham dự
    const participants = JSON.parse(schedule.participants || '[]');
    if (participants.length > 0) {
      parts.push(`với sự tham gia của ${participants.join(', ')}`);
    }
    
    return parts.join('. ') + '.';
  },
  
  /**
   * Gọi Python XTTS Service để tạo audio
   */
  async generateAudio(schedule: Schedule, voiceType: VoiceType): Promise<TTSResult> {
    try {
      const text = this.formatScheduleText(schedule);
      
      console.log(`[TTS] Generating ${voiceType} audio for schedule ${schedule.id}...`);
      
      const response = await axios.post(`${XTTS_SERVICE_URL}/synthesize`, {
        text,
        voice_type: voiceType,
        schedule_id: schedule.id
      }, {
        timeout: 120000 // 2 phút timeout cho mỗi request
      });
      
      if (response.data.success) {
        return {
          success: true,
          audioUrl: response.data.audio_url,
          duration: response.data.duration_seconds
        };
      } else {
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error: any) {
      console.error(`[TTS] Error:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Generate audio cho cả 2 giọng
   */
  async generateAllVoices(schedule: Schedule): Promise<void> {
    await Promise.all([
      this.generateAudio(schedule, 'male'),
      this.generateAudio(schedule, 'female')
    ]);
  },
  
  /**
   * Lấy đường dẫn audio file
   */
  getAudioPath(scheduleId: string, voiceType: VoiceType): string | null {
    const filePath = path.join(TTS_OUTPUT_DIR, voiceType, `schedule_${scheduleId}.mp3`);
    
    if (fs.existsSync(filePath)) {
      return `/uploads/tts/${voiceType}/schedule_${scheduleId}.mp3`;
    }
    
    return null;
  },
  
  /**
   * Kiểm tra audio đã có chưa
   */
  hasAudio(scheduleId: string, voiceType: VoiceType): boolean {
    const filePath = path.join(TTS_OUTPUT_DIR, voiceType, `schedule_${scheduleId}.mp3`);
    return fs.existsSync(filePath);
  },
  
  /**
   * Xóa audio khi lịch bị xóa
   */
  async deleteAudio(scheduleId: string): Promise<void> {
    for (const voice of ['male', 'female']) {
      const filePath = path.join(TTS_OUTPUT_DIR, voice, `schedule_${scheduleId}.mp3`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[TTS] Deleted audio: ${filePath}`);
      }
    }
  },
  
  /**
   * Health check cho XTTS Service
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${XTTS_SERVICE_URL}/health`, { timeout: 5000 });
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
};
```

### 2.2. File `backend/src/controllers/tts.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ttsService } from '../services/tts.service';
import prisma from '../config/database';

export const ttsController = {
  /**
   * GET /api/tts/audio/:scheduleId/:voiceType
   * Lấy audio URL cho 1 lịch
   */
  async getAudio(req: Request, res: Response, next: NextFunction) {
    try {
      const { scheduleId, voiceType } = req.params;
      
      if (!['male', 'female'].includes(voiceType)) {
        return res.status(400).json({ error: 'Invalid voice type' });
      }
      
      const audioUrl = ttsService.getAudioPath(scheduleId, voiceType as 'male' | 'female');
      
      if (!audioUrl) {
        return res.status(404).json({ error: 'Audio not found' });
      }
      
      res.json({ audioUrl });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * POST /api/tts/generate/:scheduleId
   * Generate/Regenerate audio cho 1 lịch cụ thể
   */
  async generateForSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { scheduleId } = req.params;
      
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId }
      });
      
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      // Generate cả 2 giọng
      await ttsService.generateAllVoices(schedule);
      
      res.json({
        success: true,
        message: 'Audio generated for both voices',
        audioUrls: {
          male: ttsService.getAudioPath(scheduleId, 'male'),
          female: ttsService.getAudioPath(scheduleId, 'female')
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * POST /api/tts/generate-all
   * Generate audio cho tất cả lịch (Admin only)
   */
  async generateAll(req: Request, res: Response, next: NextFunction) {
    try {
      const schedules = await prisma.schedule.findMany({
        where: { status: 'approved' }
      });
      
      // Chạy background (không chờ)
      (async () => {
        for (const schedule of schedules) {
          await ttsService.generateAllVoices(schedule);
        }
        console.log(`[TTS] Generated audio for ${schedules.length} schedules`);
      })();
      
      res.json({
        success: true,
        message: `Processing ${schedules.length} schedules in background`
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * GET /api/tts/health
   * Kiểm tra XTTS Service
   */
  async healthCheck(req: Request, res: Response) {
    const isHealthy = await ttsService.checkHealth();
    res.json({
      status: isHealthy ? 'healthy' : 'unavailable',
      service: 'XTTS v2'
    });
  }
};
```

### 2.3. File `backend/src/routes/tts.route.ts`

```typescript
import { Router } from 'express';
import { ttsController } from '../controllers/tts.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/audio/:scheduleId/:voiceType', ttsController.getAudio);
router.get('/health', ttsController.healthCheck);

// Admin routes
router.post('/generate/:scheduleId', authenticate, requireRole('admin'), ttsController.generateForSchedule);
router.post('/generate-all', authenticate, requireRole('admin'), ttsController.generateAll);

export default router;
```

### 2.4. Sửa `schedule.service.ts` - Auto-generate khi thay đổi

```typescript
// Thêm import
import { ttsService } from './tts.service';

// Sửa hàm createSchedule
export const createSchedule = async (data: CreateScheduleInput): Promise<Schedule> => {
  const schedule = await prisma.schedule.create({ data });
  
  // Auto-generate TTS cho lịch mới (chạy background)
  if (schedule.status === 'approved') {
    ttsService.generateAllVoices(schedule).catch(err => {
      console.error('[Schedule] TTS generation failed:', err);
    });
  }
  
  return schedule;
};

// Sửa hàm updateSchedule
export const updateSchedule = async (id: string, data: UpdateScheduleInput): Promise<Schedule> => {
  const oldSchedule = await prisma.schedule.findUnique({ where: { id } });
  const schedule = await prisma.schedule.update({ where: { id }, data });
  
  // Regenerate TTS nếu nội dung thay đổi
  const contentChanged = 
    oldSchedule?.content !== schedule.content ||
    oldSchedule?.startTime !== schedule.startTime ||
    oldSchedule?.endTime !== schedule.endTime ||
    oldSchedule?.location !== schedule.location ||
    oldSchedule?.leader !== schedule.leader;
    
  if (contentChanged && schedule.status === 'approved') {
    ttsService.generateAllVoices(schedule).catch(err => {
      console.error('[Schedule] TTS regeneration failed:', err);
    });
  }
  
  return schedule;
};

// Sửa hàm deleteSchedule
export const deleteSchedule = async (id: string): Promise<void> => {
  await prisma.schedule.delete({ where: { id } });
  
  // Xóa audio files
  await ttsService.deleteAudio(id);
};
```

---

## Phase 3: Frontend Integration (1-2 ngày)

### 3.1. Component `VoiceSelectorPopup.tsx`

```tsx
/**
 * Popup chọn giọng đọc
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, UserRound, Volume2, Loader2 } from 'lucide-react';

interface VoiceSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVoice: (voiceType: 'male' | 'female') => void;
  isLoading?: boolean;
}

export function VoiceSelectorPopup({ isOpen, onClose, onSelectVoice, isLoading }: VoiceSelectorPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            Chọn giọng đọc
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Giọng nam */}
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 hover:bg-blue-50 hover:border-blue-300"
            onClick={() => onSelectVoice('male')}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <User className="h-8 w-8 text-blue-600" />
            )}
            <span className="font-medium">Giọng Nam</span>
            <span className="text-xs text-muted-foreground">Miền Bắc</span>
          </Button>
          
          {/* Giọng nữ */}
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 hover:bg-pink-50 hover:border-pink-300"
            onClick={() => onSelectVoice('female')}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <UserRound className="h-8 w-8 text-pink-600" />
            )}
            <span className="font-medium">Giọng Nữ</span>
            <span className="text-xs text-muted-foreground">Miền Bắc</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3.2. Sửa `TTSButton.tsx`

```tsx
// Thay đổi logic để mở popup chọn giọng và play audio từ server

import { useState, useRef } from 'react';
import { Volume1, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceSelectorPopup } from './voice-selector-popup';
import { api } from '@/services/api';
import { Schedule } from '@/types';
import { getBackendRootUrl } from '@/lib/utils';

interface TTSButtonProps {
  schedule: Schedule;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

export function TTSButton({ schedule, size = 'sm', className }: TTSButtonProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const handleSelectVoice = async (voiceType: 'male' | 'female') => {
    setIsLoading(true);
    setShowPopup(false);
    
    try {
      // Lấy audio URL từ server
      const response = await api.get<{ audioUrl: string }>(
        `/tts/audio/${schedule.id}/${voiceType}`
      );
      
      if (response.audioUrl) {
        // Play audio
        const audio = new Audio(`${getBackendRootUrl()}${response.audioUrl}`);
        audioRef.current = audio;
        
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          console.error('Audio playback failed');
        };
        
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to get audio:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };
  
  const handleClick = () => {
    if (isPlaying) {
      handleStop();
    } else {
      setShowPopup(true);
    }
  };
  
  return (
    <>
      <Button
        variant="ghost"
        size={size}
        onClick={handleClick}
        className={className}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <VolumeX className="h-4 w-4 text-red-500" />
        ) : (
          <Volume1 className="h-4 w-4" />
        )}
      </Button>
      
      <VoiceSelectorPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        onSelectVoice={handleSelectVoice}
        isLoading={isLoading}
      />
    </>
  );
}
```

---

## Phase 4: Testing & Optimization (1-2 ngày)

### 4.1. Kiểm tra VRAM Usage

```python
# Script kiểm tra VRAM
import torch

def check_vram():
    if torch.cuda.is_available():
        total = torch.cuda.get_device_properties(0).total_memory / 1e9
        allocated = torch.cuda.memory_allocated(0) / 1e9
        cached = torch.cuda.memory_reserved(0) / 1e9
        
        print(f"Total VRAM: {total:.2f} GB")
        print(f"Allocated: {allocated:.2f} GB")
        print(f"Cached: {cached:.2f} GB")
        print(f"Free: {total - allocated:.2f} GB")
```

### 4.2. Tối ưu cho RTX 3050 6GB

| Kỹ thuật | Mô tả |
|----------|-------|
| **Lazy Loading** | Load model chỉ khi có request đầu tiên |
| **Unload sau inactivity** | Giải phóng VRAM sau 10 phút không dùng |
| **Sequential Processing** | Xử lý 1 request tại 1 thời điểm |
| **Audio Caching** | Không generate lại nếu đã có file |
| **Text Chunking** | Chia văn bản dài thành đoạn nhỏ |

### 4.3. Benchmark ước tính

| Độ dài văn bản | Thời gian generate | VRAM sử dụng |
|----------------|-------------------|--------------|
| 50 ký tự | ~3-5 giây | ~4.5 GB |
| 100 ký tự | ~5-8 giây | ~4.5 GB |
| 200 ký tự | ~8-12 giây | ~5 GB |
| 500 ký tự | ~15-25 giây | ~5.5 GB |

---

## Phase 5: Deployment & Monitoring (1 ngày)

### 5.1. Scripts khởi động

**`start-tts.bat`** (Windows)
```batch
@echo off
echo Starting XTTS Service...
cd python_tts_service
call venv\Scripts\activate
python main.py
```

**`start-all.bat`**
```batch
@echo off
start "XTTS Service" cmd /k "cd python_tts_service && venv\Scripts\activate && python main.py"
timeout /t 5
start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 3
start "Frontend" cmd /k "npm run dev"
```

### 5.2. Supervisor process

```python
# Trong main.py - Auto unload sau 10 phút idle
import asyncio
from datetime import datetime, timedelta

last_request_time = datetime.now()
IDLE_TIMEOUT = timedelta(minutes=10)

async def check_idle():
    global last_request_time
    while True:
        await asyncio.sleep(60)  # Check mỗi phút
        if datetime.now() - last_request_time > IDLE_TIMEOUT:
            if xtts_engine.is_loaded:
                print("[XTTS] Idle timeout, unloading model...")
                xtts_engine.unload_model()
```

---

## 📊 Timeline tổng hợp

| Phase | Công việc | Thời gian |
|-------|-----------|-----------|
| **Phase 1** | Setup Python XTTS Service | 2-3 ngày |
| **Phase 2** | Backend Integration | 2 ngày |
| **Phase 3** | Frontend Integration | 1-2 ngày |
| **Phase 4** | Testing & Optimization | 1-2 ngày |
| **Phase 5** | Deployment & Monitoring | 1 ngày |
| | **TỔNG** | **7-10 ngày** |

---

## ⚠️ Lưu ý quan trọng

### Hardware Requirements
- **Minimum VRAM**: 5GB (XTTS v2 cần ~4GB để load model)
- **RTX 3050 6GB**: Đủ dùng nhưng cần tối ưu cẩn thận
- **RAM**: Khuyến nghị 16GB+

### Voice Sample Quality
- Chất lượng voice cloning phụ thuộc 80% vào reference audio
- Đầu tư thời gian thu âm sample tốt

### Fallback Plan
- Nếu XTTS Service không khả dụng → Hiển thị thông báo lỗi
- Có thể fallback sang Web Speech API (browser TTS) nếu cần

### Ngrok/Remote Access
- XTTS Service chạy trên localhost
- Cần thêm proxy route trong Backend để truy cập từ Ngrok

---

## 🔗 Tài liệu tham khảo

- [Coqui TTS Documentation](https://tts.readthedocs.io/)
- [XTTS v2 Model Card](https://huggingface.co/coqui/XTTS-v2)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

*Tài liệu này được tạo ngày 2026-01-27*
*Phiên bản: 1.0*
