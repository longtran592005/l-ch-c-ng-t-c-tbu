"""
TBU AI Service - FastAPI
Integrates Whisper (GPU) + Qwen 2.5 (CPU) for meeting analysis
Singleton pattern for Qwen model to prevent OOM
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import shutil
import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import logging

from vinai import transcribe_audio, load_model as load_whisper_model
from config import (
    WHISPER_MODEL, DEVICE, WHISPER_SIZE,
    QWEN_MODEL, QWEN_MAX_NEW_TOKENS, QWEN_TEMPERATURE, QWEN_TOP_P
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import LLM Generator to use the same provider as Chatbot
from rag.llm_generator import llm_generator

app = FastAPI(title="TBU AI Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Qwen Model (Singleton - loaded once)
_qwen_model = None
_qwen_tokenizer = None

def load_qwen_model():
    """
    Load Qwen 2.5 model once on startup (singleton pattern).
    Runs on CPU to save GPU VRAM for Whisper.
    """
    global _qwen_model, _qwen_tokenizer
    
    if _qwen_model is not None:
        logger.info("✅ Qwen model already loaded")
        return _qwen_model, _qwen_tokenizer
    
    try:
        logger.info(f"🚀 Loading Qwen model on CPU: {QWEN_MODEL}")
        logger.info("⚠️  This will take 1-2 minutes on first run...")
        
        # Load on CPU to save GPU for Whisper
        _qwen_tokenizer = AutoTokenizer.from_pretrained(
            QWEN_MODEL,
            trust_remote_code=True
        )
        
        _qwen_model = AutoModelForCausalLM.from_pretrained(
            QWEN_MODEL,
            torch_dtype=torch.float32,  # CPU runs better with float32
            device_map="cpu",
            trust_remote_code=True,
            low_cpu_mem_usage=True,  # Critical for 13GB RAM
            offload_folder="offload",  # Offload to disk if needed
        )
        
        logger.info(f"✅ Qwen model loaded on CPU")
        logger.info(f"   Model size: {_qwen_model.num_parameters / 1e9:.1f}B parameters")
        
        return _qwen_model, _qwen_tokenizer
        
    except Exception as e:
        logger.error(f"❌ Failed to load Qwen model: {e}")
        raise HTTPException(status_code=503, detail="Qwen model not available")

def clean_transcript(text: str) -> str:
    """
    Clean transcript by removing filler words and normalizing.
    Optimized for Vietnamese meeting transcripts.
    """
    if not text:
        return ""
    
    # Vietnamese filler words commonly found in meetings
    filler_words = [
        "à", "ờ", "ừ", "ừm", "à mà", "thì mà",
        "như vậy", "thì là", "rồi thì", "đúng không",
        "ví dụ như", "chẳng hạn", "tức là", "ý là"
    ]
    
    # Remove extra whitespace
    lines = text.strip().split('\n')
    cleaned_lines = []
    
    for line in lines:
        cleaned = line.strip()
        
        # Remove multiple spaces
        while '  ' in cleaned:
            cleaned = cleaned.replace('  ', ' ')
        
        # Remove filler words at the beginning of sentences
        for filler in filler_words:
            if cleaned.startswith(filler + ' '):
                cleaned = cleaned[len(filler):].strip()
            elif cleaned.startswith(filler + ','):
                cleaned = cleaned[len(filler):].strip()
        
        if cleaned:
            cleaned_lines.append(cleaned)
    
    return '\n'.join(cleaned_lines)

async def generate_with_llm(prompt: str, max_tokens: int = QWEN_MAX_NEW_TOKENS) -> str:
    """
    Generate text using the active LLM provider (Gemini or Ollama).
    """
    try:
        # Use the unified llm_generator
        return await llm_generator.generate_plain(prompt, max_tokens=max_tokens)
    except Exception as e:
        logger.error(f"❌ LLM Generation failed: {e}")
        return f"Lỗi xử lý AI: {str(e)}"

# ==================== Pydantic Models ====================

class AnalyzeRequest(BaseModel):
    """Request model for AI analysis"""
    transcript: str
    generate_summary: bool = True
    generate_minutes: bool = False
    extract_action_items: bool = False
    deep_analysis: bool = False
    max_tokens: Optional[int] = None

class ActionItem(BaseModel):
    """Action item extracted from meeting"""
    task: str
    assignee: Optional[str] = None
    deadline: Optional[str] = None
    priority: str = "medium"
    notes: Optional[str] = None

class AnalyzeResponse(BaseModel):
    """Response model for AI analysis"""
    original_transcript: str
    cleaned_transcript: str
    summary: Optional[str] = None
    minutes: Optional[str] = None
    action_items: Optional[List[ActionItem]] = None
    analysis: Optional[str] = None
    processing_time: float

# ==================== Endpoints ====================

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    logger.info("=" * 60)
    logger.info("TBU AI Service Starting...")
    logger.info("=" * 60)
    
    # Load Whisper model
    try:
        load_whisper_model()
        logger.info(f"✅ Whisper model loaded: {WHISPER_MODEL}")
    except Exception as e:
        logger.error(f"❌ Failed to load Whisper: {e}")
    
    # Pre-load Qwen model (singleton)
    try:
        load_qwen_model()
    except Exception as e:
        logger.warning(f"⚠️  Qwen model load failed, will lazy-load: {e}")

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "tbu-ai-service",
        "status": "running",
        "models": {
            "whisper": "loaded" if torch.cuda.is_available() or DEVICE == "cpu" else "loading",
            "qwen": "loaded" if _qwen_model is not None else "not_loaded",
            "qwen_model": QWEN_MODEL,
            "whisper_device": DEVICE
        }
    }

@app.post("/ai/analyze")
async def analyze_meeting(request: AnalyzeRequest):
    """
    Complete AI analysis pipeline:
    1. Clean transcript
    2. Generate summary (if requested)
    3. Generate minutes (if requested)
    4. Extract action items (if requested)
    5. Deep analysis (if requested)
    
    All runs on CPU with Qwen 2.5 for stability.
    """
    import time
    start_time = time.time()
    
    logger.info(f"📊 Starting AI analysis ({len(request.transcript)} chars)")
    
    # Step 1: Clean transcript
    cleaned_text = clean_transcript(request.transcript)
    logger.info(f"✨ Text cleaned ({len(request.transcript)} -> {len(cleaned_text)} chars)")
    
    response = AnalyzeResponse(
        original_transcript=request.transcript,
        cleaned_transcript=cleaned_text
    )
    
    # Generate outputs in parallel (same model, different prompts)
    import asyncio
    
    async def generate_summary():
        prompt = """Bạn là trợ lý AI chuyên nghiệp chuyên tóm tắt nội dung cuộc họp.
Nhiệm vụ: Tóm tắt ngắn gọn, súc tích các điểm chính của cuộc họp.
Yêu cầu:
- Tóm tắt trong 3-5 đoạn
- Nêu rõ mục tiêu chính
- Liệt kê các quyết định quan trọng
- Giọng văn chuyên nghiệp, khách quan

Nội dung cuộc họp:
{content}

Tóm tắt:""".format(content=cleaned_text[:8000])  # Limit to 8k chars for stability
        
        try:
            summary_text = await generate_with_llm(prompt, max_tokens=1024)
            logger.info(f"✅ Summary generated ({len(summary_text)} chars)")
            response.summary = summary_text
        except Exception as e:
            logger.error(f"❌ Summary failed: {e}")
            response.summary = "Lỗi tạo tóm tắt"
    
    async def generate_minutes():
        prompt = """Bạn là thư ký chuyên nghiệp có kinh nghiệm soạn thảo biên bản cuộc họp.
Nhiệm vụ: Tạo biên bản cuộc họp đầy đủ, có cấu trúc rõ ràng.
Cấu trúc biên bản:
1. THÔNG TIN CHUNG
   - Tên cuộc họp
   - Thời gian, địa điểm
   - Thành phần tham dự

2. NỘI DUNG CUỘC HỌP
   - Các mục thảo luận chính
   - Quan điểm và tranh luận

3. QUYẾT ĐỊNH
   - Các quyết định đã thông qua
   - Kết quả biểu quyết (nếu có)

4. HÀNH ĐỘNG CẦN LÀM
   - Các công việc cần thực hiện
   - Người phụ trách
   - Thời hạn hoàn thành

Yêu cầu: Ngôn ngữ trang trọng, chính xác, đầy đủ thông tin.

Nội dung cuộc họp:
{content}

Biên bản:""".format(content=cleaned_text[:12000])  # Limit to 12k chars
        
        try:
            minutes_text = await generate_with_llm(prompt, max_tokens=3072)
            logger.info(f"✅ Minutes generated ({len(minutes_text)} chars)")
            response.minutes = minutes_text
        except Exception as e:
            logger.error(f"❌ Minutes failed: {e}")
            response.minutes = "Lỗi tạo biên bản"
    
    async def extract_action_items():
        prompt = """Bạn là trợ lý quản lý dự án chuyên nghiệp.
Nhiệm vụ: Trích xuất các hành động cần làm từ nội dung cuộc họp.
Yêu cầu:
- Nhận dạng rõ: Việc cần làm, người phụ trách, deadline
- Format JSON:
  {{
    "action_items": [
      {{
        "task": "Mô tả công việc",
        "assignee": "Người phụ trách",
        "deadline": "Ngày giờ hoặc null",
        "priority": "high/medium/low",
        "notes": "Ghi chú bổ sung"
      }}
    ]
  }}
- Chỉ trả về JSON, không có văn bản khác

Nội dung cuộc họp:
{content}

Action items (JSON format):""".format(content=cleaned_text[:8000])
        
        try:
            items_text = await generate_with_llm(prompt, max_tokens=2048)
            logger.info(f"✅ Action items extracted")
            
            # Parse JSON from response
            import json
            try:
                json_start = items_text.find('{')
                json_end = items_text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = items_text[json_start:json_end]
                    data = json.loads(json_str)
                    response.action_items = data.get('action_items', [])
                else:
                    response.action_items = []
            except json.JSONDecodeError as je:
                logger.error(f"❌ JSON parse failed: {je}")
                response.action_items = []
        except Exception as e:
            logger.error(f"❌ Action items failed: {e}")
            response.action_items = []
    
    async def perform_analysis():
        prompt = """Bạn là nhà phân tích kinh doanh chuyên nghiệp.
Nhiệm vụ: Phân tích sâu nội dung cuộc họp.
Phân tích các khía cạnh:
1. MỤC TIÊU VÀ PHẠM VI
   - Mục tiêu cuộc họp có rõ ràng không?
   - Các vấn đề đã được thảo luận đủ chưa?

2. THAM GIA
   - Thành phần tham dự có phù hợp không?
   - Ai đóng góp tích cực nhất?

3. VẤN ĐỀ VÀ THÁCH THỨC
   - Các trở ngại chính
   - Rủi ro tiềm ẩn

4. QUYẾT ĐỊNH VÀ HƯỚNG GIẢI QUYẾT
   - Các quyết định đã đạt
   - Phương án giải quyết

5. ĐỀ XUẤT
   - Cải tiến cho cuộc họp tiếp theo
   - Hành động theo dõi

Yêu cầu: Phân tích chuyên nghiệp, chi tiết, có cơ sở.

Nội dung cuộc họp:
{content}

Phân tích chi tiết:""".format(content=cleaned_text[:12000])
        
        try:
            analysis_text = await generate_with_llm(prompt, max_tokens=3072)
            logger.info(f"✅ Deep analysis completed ({len(analysis_text)} chars)")
            response.analysis = analysis_text
        except Exception as e:
            logger.error(f"❌ Deep analysis failed: {e}")
            response.analysis = "Lỗi phân tích sâu"
    
    # Run requested tasks
    tasks = []
    if request.generate_summary:
        tasks.append(generate_summary())
    if request.generate_minutes:
        tasks.append(generate_minutes())
    if request.extract_action_items:
        tasks.append(extract_action_items())
    if request.deep_analysis:
        tasks.append(perform_analysis())
    
    # Execute tasks sequentially (not parallel due to CPU)
    for task in tasks:
        await task
    
    processing_time = time.time() - start_time
    
    logger.info(f"✅ AI analysis complete in {processing_time:.1f}s")
    response.processing_time = processing_time
    
    return response

@app.post("/transcribe")
async def transcribe_endpoint(file: UploadFile = File(...)):
    """
    Legacy endpoint for backward compatibility.
    Just transcribes audio to text without AI analysis.
    """
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"📂 Received file: {file.filename} ({os.path.getsize(file_path)} bytes)")
        
        # Transcribe with Whisper
        text = transcribe_audio(file_path)
        
        # Clean up
        if os.path.exists(file_path):
            os.remove(file_path)
        
        logger.info(f"✅ Transcription complete")
        
        return {"text": text}
    
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
