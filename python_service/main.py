from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import time

# Optional: Implement Whisper here
# import whisper

app = FastAPI(title="TBU Meeting Minutes AI Service")

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

# Global model variable
model = None

@app.get("/")
def health_check():
    return {"status": "ok", "service": "python-ai-service"}

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Endpoint to transcribe audio file to text.
    Currently returns a mock response to ensure system connectivity.
    """
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"Received file: {file.filename}, Size: {os.path.getsize(file_path)} bytes")

        # Simulate processing time
        time.sleep(2)

        # TODO: Load Whisper model and transcribe
        # if not model:
        #     model = whisper.load_model("base")
        # result = model.transcribe(file_path)
        # text = result["text"]
        
        mock_text = f"Đây là văn bản được chuyển đổi từ file {file.filename}. (Mô phỏng: Python Service nhận file thành công và trả về kết quả này. Vui lòng cài đặt Whisper để chạy thực tế)."

        # Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return {"text": mock_text, "language": "vi"}

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-minutes")
async def generate_minutes(text: str = Form(...), format_type: str = Form("administrative")):
    """
    Endpoint to generate meeting minutes from transcript using LLM (e.g., Gemini/GPT).
    """
    # Simulate LLM processing
    time.sleep(2)
    
    minutes = f"""
    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
    Độc lập - Tự do - Hạnh phúc
    
    BIÊN BẢN CUỘC HỌP
    
    1. Thời gian, địa điểm:
    ...
    
    2. Thành phần tham dự:
    ...
    
    3. Nội dung chính (Được tóm tắt từ văn bản):
    {text[:200]}...
    
    4. Kết luận:
    ...
    """
    return {"minutes": minutes}

if __name__ == "__main__":
    import uvicorn
    # Run on port 8001 to avoid conflict with Node (8000) or React (3000)
    uvicorn.run(app, host="0.0.0.0", port=8001)
