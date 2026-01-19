# TBU Python AI Service

Service Python FastAPI cho:
- Speech-to-Text sử dụng OpenAI Whisper (large-v3)
- Xử lý audio offline, tối ưu cho tiếng Việt

## Cài đặt

```bash
pip install -r requirements.txt
```

## Chạy

```bash
python main.py
```

Server sẽ chạy trên http://localhost:8081

## API Endpoints

### GET /
Health check

### POST /transcribe
Chuyển đổi audio sang text

**Request:**
- Content-Type: multipart/form-data
- file: Audio file

**Response:**
```json
{
  "text": "Văn bản chuyển đổi..."
}
```

## Thông số Model

- Model: large-v3 (OpenAI Whisper)
- Beam size: 5
- Device: CUDA (GPU) / CPU (fallback)
- Prompt tiếng Việt cho việc viết hoa, dấu câu

## File Audio hỗ trợ

mp3, wav, m4a, aac, flac, ogg
