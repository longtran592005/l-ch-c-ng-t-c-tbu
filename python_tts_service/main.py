"""
FastAPI Server cho Edge TTS (High Quality Northern Vietnamese)
Sử dụng giọng HoaiMy và NamMinh cực chuẩn.
Port: 8003
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import asyncio
import edge_tts
from typing import Optional

app = FastAPI(title="TBU High-Quality TTS Service", version="2.0")

# Thư mục lưu trữ (Lưu thẳng vào thư mục uploads của Backend)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "backend", "uploads", "tts"))

# Cấu hình giọng đọc miền Bắc của Microsoft
VOICES = {
    "male": "vi-VN-NamMinhNeural",
    "female": "vi-VN-HoaiMyNeural"
}

class SynthesizeRequest(BaseModel):
    text: str
    voice_type: str  # 'male' hoặc 'female'
    schedule_id: str

class SynthesizeResponse(BaseModel):
    success: bool
    audio_url: Optional[str] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    return {"service": "TBU Voice AI", "status": "active", "engine": "Edge-TTS"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/voices")
async def list_voices():
    return {
        "voices": [
            {"id": "male", "name": "Nam Miền Bắc (Minh)", "available": True},
            {"id": "female", "name": "Nữ Miền Bắc (My)", "available": True}
        ]
    }

@app.post("/warmup")
async def warmup():
    return {"success": True, "message": "Edge-TTS is always ready"}

@app.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize(request: SynthesizeRequest):
    """
    Tổng hợp giọng nói tiếng Việt chất lượng cao bằng Edge-TTS
    """
    if request.voice_type not in VOICES:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ giọng 'male' hoặc 'female'")

    voice = VOICES[request.voice_type]
    
    # Tạo đường dẫn lưu file theo cấu trúc: thư mục_giới_tính/schedule_id.mp3
    voice_dir = os.path.join(OUTPUT_ROOT, request.voice_type)
    os.makedirs(voice_dir, exist_ok=True)
    
    filename = f"schedule_{request.schedule_id}.mp3"
    output_path = os.path.join(voice_dir, filename)
    
    print(f"[EDGE-TTS] Voice Type: {request.voice_type} -> Using Voice: {voice}")
    print(f"[EDGE-TTS] Text: {request.text[:50]}...")

    try:
        # Khởi tạo tiến trình tạo audio với cấu hình chuẩn nhất
        communicate = edge_tts.Communicate(request.text, voice, rate="+0%", pitch="+0Hz")
        await communicate.save(output_path)
        
        audio_url = f"/uploads/tts/{request.voice_type}/{filename}"
        return SynthesizeResponse(success=True, audio_url=audio_url)
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return SynthesizeResponse(success=False, error=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
