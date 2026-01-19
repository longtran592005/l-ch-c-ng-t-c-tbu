# Hướng dẫn cài đặt thủ công Python Service khi gặp lỗi pip build wheel

## 🐛 Vấn đề

Error: `Getting requirements to build wheel did not run successfully` khi cài `openai-whisper==20231117`

Nguyên nhân:
- Có xung đột giữa các dependencies trong `requirements.txt`
- Pip không thể build wheel từ nguồn cho openai-whisper khi có dependencies khác

## 🔧 Giải pháp đơn giản

### Phương án 1: Bỏ qua lỗi build wheel (Khuyên nghị)

```bash
# 1. Cài đặt dependencies theo thứ tự (từ đơn giản đến phức tạp)
cd python_service

# 2. Install dependencies từng cái một
pip install fastapi==0.109.0
pip install uvicorn[standard]==0.27.0
pip install python-multipart==0.0.9
pip install pydantic>=2.0.0

# 3. Cài đặt dependencies AI (thường lỗi nhất)
pip install torch
pip install torchaudio
pip install pydub
pip install librosa
pip install soundfile
pip install numpy
pip install scipy

# 4. Bỏ qua openai-whisper build wheel
pip install openai-whisper==20231117

# 5. Cài đặt Pydantic (thường gây lỗi)
pip install pydantic

# 6. Install các dependencies còn lại
pip install requests
pip install aiofiles
```

### Phương án 2: Cài đặt từ source (Nên cao hơn)

```bash
# Cài đặt Cython trước (để build các packages C++)
# Sử dụng Windows Installer: https://www.cpython.org/downloads/windows/
# Hoặc Chocolatey: choco install python

cd python_service

# Install từ PyPI (bỏ qua build wheel)
pip install fastapi uvicorn python-multipart pydantic torch torchaudio pydub librosa soundfile numpy scipy requests

# Install openai-whisper (bỏ qua build wheel)
pip install openai-whisper --no-build-isolation

# Install Pydantic (khuyên nghị)
pip install pydantic
```

### Phương án 3: Cài đặt với constraints

```bash
# Cài đặt dependencies với version cụ thể để tránh xung đột
pip install "fastapi==0.109.0" "uvicorn[standard]==0.27.0" "python-multipart==0.0.9"
pip install "pydantic>=2.0.0,<3.1" "python-dotenv>=1.0.0"

# Cài đặt AI dependencies riêng (để tránh xung đột)
pip install "torch>=2.0.0,<2.1"
pip install "torchaudio>=2.0.0,<2.1"
pip install "pydub>=0.25.0,<1.0.0"
pip install "librosa>=0.10.0,<0.11.0"
pip install "soundfile>=0.12.0,<0.13.0"

# Cài đặt openai-whisper từ PyPI (có thể cần pip install wheel)
pip install "openai-whisper==20231117"

# Install Pydantic (thường gây lỗi)
pip install pydantic

# Install utilities
pip install requests aiofiles
```

### Phương án 4: Sử dụng pre-built wheel (Nhanh nhất)

```bash
# Tải pre-built wheel từ releases openai-whisper
# GitHub: https://github.com/openai/whisper/releases
# Download: openai-whisper-cp311-cu118-2025024143.safetensors

# Install wheel
pip install openai-whisper-cp311-cu118-2025024143.safetensors

# Hoặc cài từ PyPI (sẽ tự động build wheel)
pip install openai-whisper==20231117
```

### Phương án 5: Tạm thời bỏ qua các tính năng nâng cao

**Thử dụng model Whisper gốc thay vì openai-whisper:**

Cập nhật `main.py`:
```python
# Load model Whisper gốc thay vì openai-whisper
import whisper

def load_model():
    global model
    try:
        logger.info(f"Loading Whisper model: {MODEL_NAME}")
        
        # Load model Whisper gốc (không phải build wheel)
        model = whisper.load_model(
            "small",  # Sẽ download từ OpenAI
            device=DEVICE,
            download_root="./models",
            in_memory=True  # Load vào RAM (quan trọng cho file dài)
        )
        
        logger.info("Whisper model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        raise
```

Và cập nhật `requirements.txt`:
```text
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.9
pydantic>=2.0.0

openai-whisper==20231117

# Xóa openai-whisper từ đây nếu đã install bằng pip install wheel
# openai-whisper==20231117
```

## 🧪 Kiểm tra sau khi cài đặt

```bash
# 1. Kiểm tra version
python --version
pip --version

# 2. Kiểm tra cài đặt
pip list | grep -E "(fastapi|uvicorn|whisper)"

# 3. Kiểm tra import
python -c "import whisper; print('OK')"
```

## 🚀 Khởi động service sau khi cài đặt xong

```bash
cd python_service
python main.py
```

## 📋 Giải pháp nhanh nhất (bỏ qua mọi lỗi)

```bash
# Xóa venv cũ (nếu có)
rm -rf venv

# Tạo venv mới
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate

# Cài đặt nhanh
pip install --upgrade pip setuptools wheel
pip install fastapi uvicorn python-multipart pydantic torch torchaudio pydub librosa soundfile numpy scipy requests

# Install openai-whisper (skip build wheel)
pip install --no-build-isolation openai-whisper==20231117

# Bỏ qua pydantic (gây lỗi)
# pip install pydantic

# Test import
python -c "import whisper; print('OK')"
```

## 🔍 Nếu vẫn lỗi:

### Error "ModuleNotFoundError: No module named 'whisper'"

```bash
# Cài đặt whisper riêng
pip install git+https://github.com/openai/whisper.git

# Hoặc cài từ PyPI với version khác
pip install whisper-openai
```

### Error "UserWarning: pkg_resources is deprecated"

```bash
# Cài đặt setuptools mới
pip install --upgrade setuptools

# Hoặc bỏ qua warning
export PYTHONWARNINGS=ignore::UserWarning::pkg_resources
pip install openai-whisper
```

### Error "MemoryError" hoặc "Killed"

```bash
# Thử dụng model nhỏ hơn
# Trong main.py, thay:
# model = whisper.load_model("small", ...)

# Thành:
model = whisper.load_model("tiny", ...) # Hoặc "base"
```

### Error "Clang.exe not found"

```bash
# Cài đặt C++ build tools (Windows)
# Visual Studio Build Tools
# Hoặc cài đặt MinGW-w64

# Hoặc sử dụng Python từ Windows Store (đã bao gồm)
pip install whisper-openai  # Sẽ tự động cài đặt dependencies
```

## 📞 Cách chạy service

### Option 1: Development
```bash
cd python_service
python main.py
```

### Option 2: Production
```bash
cd python_service
# Sử dụng gunicorn (production-ready)
pip install gunicorn

# Sử dụng nhiều workers
gunicorn main:app -w 4 -b 0.0.0.0:8001
```

## 🎯 Các dependencies cần thiết yếu

**Minimum:**
- Python 3.10 trở lên
- fastapi
- uvicorn
- openai-whisper

**Recommended:**
- CUDA Toolkit (nếu dùng GPU)
- 4GB RAM trở lên
- SSD (cho nhanh load model)

## 📚 Backup và Rollback

```bash
# Xóa venv và cài đặt lại từ đầu
rm -rf venv
python -m venv venv
pip install -r requirements.txt
python main.py
```

## 🔗 Tài liệu hỗ trợ

- [OpenAI Whisper GitHub](https://github.com/openai/whisper)
- [OpenAI Whisper Documentation](https://github.com/openai/whisper/tree/main/README.md)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Python Installation Guide](https://docs/LONG_AUDIO_TRANSCRIPTION.md)

## 💡 Tips

- **Linux/Mac**: Sử dụng `python3 -m venv venv` thay vì `python -m venv`
- **Windows PowerShell**: Chạy `venv\Scripts\activate.bat` thay vì activate
- **File dài**: File >30 phút sẽ tự động chia nhỏ, không cần chia thủ công
- **Debug mode**: Kiểm tra logs tại `logs/speech_to_text.log`

## ✅ Kiểm tra cài đặt

Sau khi cài đặt xong, chạy:

```bash
# Test imports
python -c "import whisper; import fastapi; print('All imports OK')"

# Test service
python -c "
import requests
requests.get('http://localhost:8001/model-status')
print('Status check OK')
"
```

Nếu tất cả pass → Cài đặt thành công! 🎉
