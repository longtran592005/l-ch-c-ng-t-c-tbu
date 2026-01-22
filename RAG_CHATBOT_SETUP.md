# RAG Chatbot Setup Guide

Hướng dẫn cài đặt và khởi chạy hệ thống Chatbot RAG cho TBU Schedule Management.

## Kiến trúc hệ thống

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   React UI      │────▶│  Express Backend │────▶│  Python RAG Service │
│   (Port 8080)   │     │   (Port 3000)    │     │    (Port 8002)      │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
                                                          │
                        ┌──────────────────┐              │
                        │   SQL Server     │◀─────────────┤
                        │  (Vector Store)  │              │
                        └──────────────────┘              │
                                                          │
                        ┌──────────────────┐              │
                        │   Ollama LLM     │◀─────────────┘
                        │   (Port 11434)   │
                        └──────────────────┘
```

## Prerequisites

1. **Ollama** với model `qwen2.5:7b` đã cài đặt
2. **SQL Server** đang chạy
3. **Python 3.10+** với CUDA (optional, cho GPU acceleration)
4. **Node.js 18+**

## Bước 1: Cài đặt Python Dependencies

```bash
cd python_service

# Tạo virtual environment (khuyến nghị)
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Cài đặt packages
pip install -r requirements.txt

# Cài thêm packages cho RAG (nếu chưa có trong requirements.txt)
pip install httpx pyodbc python-docx transformers torch
```

## Bước 2: Chạy Prisma Migration

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Chạy migration để tạo bảng mới
npm run prisma:migrate
# Hoặc: npx prisma migrate dev --name add_vector_embeddings

# (Optional) Xem database trong Prisma Studio
npm run prisma:studio
```

## Bước 3: Chuẩn bị dữ liệu

### 3.1 Tạo file info.docx (Optional)

Tạo thư mục và file thông tin bổ sung:

```bash
mkdir python_service\data
```

Tạo file `python_service/data/info.docx` chứa thông tin về:
- Giới thiệu Trường Đại học Thái Bình
- Các khoa, phòng ban
- Quy trình, quy định
- Thông tin liên hệ
- FAQ thường gặp

### 3.2 Cấu hình RAG (Optional)

Chỉnh sửa `python_service/rag_config.py` nếu cần:

```python
# Embedding model
EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B"  # 1024 dimensions

# Ollama settings
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen2.5:7b"

# Chunking settings
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# Retrieval settings
TOP_K = 5
SIMILARITY_THRESHOLD = 0.3
```

## Bước 4: Khởi chạy Services

### Terminal 1: Ollama (nếu chưa chạy)
```bash
ollama serve
```

### Terminal 2: Python RAG Service
```bash
cd python_service
.\venv\Scripts\activate
python rag_service.py
# Service sẽ chạy trên http://localhost:8002
```

### Terminal 3: Backend
```bash
cd backend
npm run dev
# Backend sẽ chạy trên http://localhost:3000
```

### Terminal 4: Frontend
```bash
npm run dev
# Frontend sẽ chạy trên http://localhost:8080
```

## Bước 5: Index dữ liệu

Sau khi các service đã chạy, cần index dữ liệu vào vector store:

### Index tất cả schedules từ database
```bash
curl -X POST http://localhost:8002/reindex-all
```

### Index file info.docx (nếu có)
```bash
curl -X POST http://localhost:8002/index/document \
  -H "Content-Type: application/json" \
  -d '{"file_path": "data/info.docx"}'
```

### Kiểm tra stats
```bash
curl http://localhost:8002/stats
```

## API Endpoints

### Python RAG Service (Port 8002)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Chat với RAG |
| `/index/schedules` | POST | Index schedules vào vector store |
| `/index/document` | POST | Index document (docx) |
| `/reindex-all` | POST | Re-index toàn bộ dữ liệu |
| `/stats` | GET | Thống kê vector store |
| `/health` | GET | Health check |

### Backend API (Port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chatbot/chat` | POST | Chat endpoint (proxy to RAG) |
| `/api/chatbot/reindex` | POST | Reindex schedules |
| `/api/chatbot/index-document` | POST | Index document |
| `/api/chatbot/stats` | GET | Get stats |

## Cấu trúc Database

### Table: vector_embeddings

```sql
CREATE TABLE vector_embeddings (
  id NVARCHAR(36) PRIMARY KEY,
  source_type NVARCHAR(50) NOT NULL,      -- 'schedule' | 'document'
  source_id NVARCHAR(255),                 -- schedule ID hoặc document path
  content NVARCHAR(MAX) NOT NULL,          -- text content
  metadata NVARCHAR(MAX),                  -- JSON metadata
  embedding VARBINARY(MAX) NOT NULL,       -- binary vector (1024 floats)
  embedding_dim INT NOT NULL DEFAULT 1024,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_source_type ON vector_embeddings(source_type);
CREATE INDEX idx_source_id ON vector_embeddings(source_id);
```

### Table: chat_history

```sql
CREATE TABLE chat_history (
  id NVARCHAR(36) PRIMARY KEY,
  user_id NVARCHAR(255),
  session_id NVARCHAR(255) NOT NULL,
  role NVARCHAR(10) NOT NULL,              -- 'user' | 'bot'
  content NVARCHAR(MAX) NOT NULL,
  sources NVARCHAR(MAX),                   -- JSON array of sources
  created_at DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_session ON chat_history(session_id);
CREATE INDEX idx_user ON chat_history(user_id);
```

## Troubleshooting

### 1. Embedding model không load được
```bash
# Kiểm tra torch và transformers
python -c "import torch; print(torch.cuda.is_available())"
python -c "from transformers import AutoModel; print('OK')"

# Nếu không có GPU, model sẽ chạy trên CPU (chậm hơn)
```

### 2. Ollama connection error
```bash
# Kiểm tra Ollama đang chạy
curl http://localhost:11434/api/tags

# Nếu chưa có model, pull model
ollama pull qwen2.5:7b
```

### 3. SQL Server connection error
```bash
# Kiểm tra connection string trong rag_config.py
# Đảm bảo SQL Server đang chạy và có quyền truy cập
```

### 4. CORS error
- Đảm bảo backend đã cấu hình CORS cho frontend origin
- Kiểm tra `backend/src/app.ts` có CORS middleware

### 5. Vector search không trả về kết quả
```bash
# Kiểm tra đã index dữ liệu chưa
curl http://localhost:8002/stats

# Nếu count = 0, chạy reindex
curl -X POST http://localhost:8002/reindex-all
```

## Performance Tips

1. **GPU Acceleration**: Sử dụng GPU cho embedding model sẽ nhanh hơn nhiều
2. **Batch Processing**: Index nhiều documents cùng lúc
3. **Caching**: Cache embeddings cho các queries phổ biến
4. **Connection Pooling**: Sử dụng connection pool cho SQL Server

## Cập nhật dữ liệu

Khi có schedule mới hoặc cập nhật:

1. **Auto-sync**: Backend có thể gọi `/index/schedules` sau mỗi CRUD operation
2. **Manual reindex**: Gọi `/reindex-all` khi cần refresh toàn bộ

## Security Notes

- RAG service chỉ nên expose internal (không public)
- Sử dụng authentication cho các admin endpoints
- Sanitize user input trước khi query
- Không log sensitive data

## Liên hệ

Nếu gặp vấn đề, liên hệ team phát triển.
