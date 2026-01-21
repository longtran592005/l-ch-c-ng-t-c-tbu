from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import sys
import io

# Force UTF-8 encoding for standard output to avoid UnicodeEncodeError on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from vinai import transcribe_audio, load_model
from qwen import load_qwen_model, get_qwen_model
from realtime import websocket_realtime_transcription
from config import (
    QWEN_ENABLED, QWEN_MODEL, QWEN_MAX_NEW_TOKENS,
    QWEN_TEMPERATURE, QWEN_TOP_P, print_config
)

app = FastAPI(title="TBU AI Service - Whisper + Qwen 2.5")

# Pydantic models for Qwen requests
class SummaryRequest(BaseModel):
    content: str
    max_tokens: int = QWEN_MAX_NEW_TOKENS

class MinutesRequest(BaseModel):
    content: str
    title: str = ""
    meeting_date: str = ""
    location: str = ""
    leader: str = ""
    max_tokens: int = QWEN_MAX_NEW_TOKENS

class ActionItemsRequest(BaseModel):
    content: str

class DeepAnalysisRequest(BaseModel):
    content: str
    max_tokens: int = QWEN_MAX_NEW_TOKENS

class MeetingInsightsRequest(BaseModel):
    content: str
    max_tokens: int = QWEN_MAX_NEW_TOKENS

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.on_event("startup")
async def startup_event():
    """Load models 1 lần khi server khởi động"""
    try:
        print_config()
        load_model()
        print("--- ✅ Whisper Model loaded successfully ---")

        if QWEN_ENABLED:
            try:
                load_qwen_model(QWEN_MODEL)
                print(f"--- ✅ Qwen Model loaded successfully ({QWEN_MODEL}) ---")
            except Exception as e:
                print(f"--- ⚠️ Failed to load Qwen model: {e} ---")
                print("--- ⚠️ Qwen features will be disabled ---")
        else:
            print("--- ℹ️  Qwen Model is disabled in config ---")

    except Exception as e:
        print(f"--- ❌ Failed to load models: {e} ---")

@app.get("/")
def health_check():
    """Health check endpoint"""
    qwen_status = "enabled" if QWEN_ENABLED and get_qwen_model() else "disabled"
    return {
        "status": "ok",
        "service": "tbu-ai-service",
        "models": {
            "whisper": "loaded",
            "qwen": qwen_status,
            "qwen_model": QWEN_MODEL if QWEN_ENABLED else "N/A"
        }
    }

@app.get("/model-status")
def model_status():
    """Get detailed status of loaded models"""
    from config import DEVICE, COMPUTE_TYPE, WHISPER_MODEL

    status = {
        "status": "ok",
        "whisper": {
            "model": WHISPER_MODEL,
            "device": DEVICE,
            "compute_type": COMPUTE_TYPE,
            "model_loaded": True
        }
    }

    if QWEN_ENABLED:
        qwen = get_qwen_model()
        status["qwen"] = {
            "model": QWEN_MODEL,
            "device": qwen.device if qwen else "not_loaded",
            "model_loaded": qwen is not None,
            "enabled": True
        }
    else:
        status["qwen"] = {
            "model": "N/A",
            "device": "N/A",
            "model_loaded": False,
            "enabled": False
        }

    return status

@app.post("/transcribe")
async def transcribe_endpoint(file: UploadFile = File(...)):
    """
    Chuyển đổi file audio thành văn bản tiếng Việt.

    Input: file audio (mp3, wav, m4a)
    Output: {"text": "..."}
    """
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"--- 📂 Received file: {file.filename} ({os.path.getsize(file_path)} bytes) ---")

        # Gọi hàm transcribe từ vinai.py
        text = transcribe_audio(file_path, batch_size=4, beam_size=5)

        # Xóa file tạm
        if os.path.exists(file_path):
            os.remove(file_path)

        print(f"--- ✅ Transcription complete ---")

        return {"text": text}

    except Exception as e:
        print(f"--- ❌ Error: {str(e)} ---")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== QWEN 2.5 ENDPOINTS ====================

def check_qwen_enabled():
    """Check if Qwen is enabled and loaded"""
    if not QWEN_ENABLED:
        raise HTTPException(status_code=503, detail="Qwen model is disabled in configuration")
    
    qwen = get_qwen_model()
    if qwen is None:
        raise HTTPException(status_code=503, detail="Qwen model is not loaded")
    
    return qwen

@app.post("/generate-summary")
async def generate_summary(request: SummaryRequest):
    """
    Tạo tóm tắt ngắn gọn cho nội dung cuộc họp.

    Input: {"content": "...", "max_tokens": 1024 (optional)}
    Output: {"summary": "..."}
    """
    try:
        qwen = check_qwen_enabled()
        print(f"--- 🤖 Generating summary (content length: {len(request.content)}) ---")

        summary = qwen.generate_summary(request.content)

        print(f"--- ✅ Summary generated ({len(summary)} chars) ---")

        return {"summary": summary}

    except HTTPException:
        raise
    except Exception as e:
        print(f"--- ❌ Error generating summary: {str(e)} ---")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")

@app.post("/generate-minutes")
async def generate_minutes(request: MinutesRequest):
    """
    Tạo biên bản cuộc họp có cấu trúc.

    Input: {
        "content": "...",
        "title": "Tên cuộc họp" (optional),
        "meeting_date": "DD/MM/YYYY" (optional),
        "location": "Địa điểm" (optional),
        "leader": "Người điều hành" (optional)
    }
    Output: {"minutes": "..."}
    """
    try:
        qwen = check_qwen_enabled()
        print(f"--- 🤖 Generating minutes (content length: {len(request.content)}) ---")

        additional_info = {
            "title": request.title,
            "meeting_date": request.meeting_date,
            "location": request.location,
            "leader": request.leader
        }

        minutes = qwen.generate_minutes(request.content, additional_info)

        print(f"--- ✅ Minutes generated ({len(minutes)} chars) ---")

        return {"minutes": minutes}

    except HTTPException:
        raise
    except Exception as e:
        print(f"--- ❌ Error generating minutes: {str(e)} ---")
        raise HTTPException(status_code=500, detail=f"Failed to generate minutes: {str(e)}")

@app.post("/extract-action-items")
async def extract_action_items(request: ActionItemsRequest):
    """
    Trích xuất các hành động cần làm từ cuộc họp.

    Input: {"content": "..."}
    Output: {
        "action_items": [
            {
                "task": "Mô tả công việc",
                "assignee": "Người phụ trách",
                "deadline": "Ngày giờ hoặc null",
                "priority": "high/medium/low",
                "notes": "Ghi chú bổ sung"
            }
        ]
    }
    """
    try:
        qwen = check_qwen_enabled()
        print(f"--- 🤖 Extracting action items (content length: {len(request.content)}) ---")

        action_items = qwen.extract_action_items(request.content)

        print(f"--- ✅ Extracted {len(action_items.get('action_items', []))} action items ---")

        return action_items

    except HTTPException:
        raise
    except Exception as e:
        print(f"--- ❌ Error extracting action items: {str(e)} ---")
        raise HTTPException(status_code=500, detail=f"Failed to extract action items: {str(e)}")

@app.post("/deep-analysis")
async def deep_analysis(request: DeepAnalysisRequest):
    """
    Phân tích sâu nội dung cuộc họp.

    Input: {"content": "...", "max_tokens": 3072 (optional)}
    Output: {"analysis": "..."}
    """
    try:
        qwen = check_qwen_enabled()
        print(f"--- 🤖 Performing deep analysis (content length: {len(request.content)}) ---")

        analysis = qwen.deep_analysis(request.content)

        print(f"--- ✅ Deep analysis completed ({len(analysis)} chars) ---")

        return {"analysis": analysis}

    except HTTPException:
        raise
    except Exception as e:
        print(f"--- ❌ Error in deep analysis: {str(e)} ---")
        raise HTTPException(status_code=500, detail=f"Failed to perform deep analysis: {str(e)}")

@app.post("/meeting-insights")
async def meeting_insights(request: MeetingInsightsRequest):
    """
    Tạo thông tin phân tích và tổng hợp về cuộc họp.

    Input: {"content": "...", "max_tokens": 2048 (optional)}
    Output: {"insights": "..."}
    """
    try:
        qwen = check_qwen_enabled()
        print(f"--- 🤖 Generating meeting insights (content length: {len(request.content)}) ---")

        insights = qwen.meeting_insights(request.content)

        print(f"--- ✅ Meeting insights generated ({len(insights)} chars) ---")

        return {"insights": insights}

    except HTTPException:
        raise
    except Exception as e:
        print(f"--- ❌ Error generating insights: {str(e)} ---")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

# ==================== REALTIME TRANSCRIPTION ====================

@app.websocket("/realtime-transcribe")
async def realtime_transcribe(websocket: WebSocket):
    """
    WebSocket endpoint cho real-time transcription.

    Client gửi audio chunks (binary format, 16kHz, 16-bit, mono)
    Server trả về text đã được transcribe.

    Protocol:
    1. Client kết nối
    2. Server gửi: {"status": "ready", "sample_rate": 16000, "channels": 1}
    3. Client gửi audio chunks liên tục
    4. Server gửi: {"type": "transcription", "text": "...", "timestamp": 12345}
    5. Server gửi: {"type": "ack", "processed_bytes": 64000}
    6. Khi kết thúc: Server gửi: {"type": "final", "text": "..."}
    """
    await websocket_realtime_transcription(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
