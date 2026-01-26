# Tài liệu kỹ thuật: Chatbot TBU

## Tổng quan

Hệ thống Chatbot TBU được thiết kế theo kiến trúc **RAG (Retrieval-Augmented Generation)** kết hợp với xử lý NLP cục bộ. Chatbot có khả năng trả lời câu hỏi về lịch công tác, tin tức, thông báo và thông tin chung của trường.

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ ChatbotButton   │  │ ChatbotWindow   │  │ ChatbotWindowRAG    │  │
│  │ (Nút mở chat)   │  │ (Mode Offline)  │  │ (Mode Online RAG)   │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────┬───────────┘  │
│           │                    │                     │              │
│  ┌────────▼────────────────────▼─────────────────────▼───────────┐  │
│  │              chatbotService.ts (Frontend)                     │  │
│  │  • sendMessage() - Gửi message đến Backend                    │  │
│  │  • checkHealth() - Kiểm tra trạng thái RAG service            │  │
│  │  • getSessionId() - Quản lý phiên chat                        │  │
│  └──────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │ HTTP API
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js/Express)                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              chatbot.controller.ts                           │   │
│  │  • chat() - Xử lý request chat                               │   │
│  │  • indexSchedules() - Index lịch vào Vector Store            │   │
│  │  • reindexAll() - Reindex toàn bộ dữ liệu                    │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                 │                                   │
│  ┌──────────────────────────────▼───────────────────────────────┐   │
│  │              chatbot.service.ts                              │   │
│  │  • chat() - Forward request đến Python RAG Service           │   │
│  │  • reindexSchedules() - Lấy lịch từ DB, gửi đến RAG index    │   │
│  │  • getChatHistory() - Lấy lịch sử chat từ DB                 │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                 │                                   │
│  ┌──────────────────────────────▼───────────────────────────────┐   │
│  │              contextService.ts                               │   │
│  │  • getTodayScheduleContext() - Lấy lịch hôm nay từ DB        │   │
│  │  • getLeadersContext() - Lấy danh sách lãnh đạo              │   │
│  │  • buildAIContext() - Xây dựng context đầy đủ cho AI         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ HTTP API (localhost:8002)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PYTHON RAG SERVICE (FastAPI)                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Endpoints:                                                  │   │
│  │  • POST /chat - Chat với context từ Vector Store             │   │
│  │  • POST /index/schedules - Index lịch công tác               │   │
│  │  • POST /index/news - Index tin tức                          │   │
│  │  • POST /index/document - Index tài liệu (info.docx)         │   │
│  │  • GET /stats - Thống kê vector store                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ LangChain    │  │ Ollama/Qwen  │  │ ChromaDB Vector Store   │   │
│  │ (Orchestrate)│  │ (LLM Model)  │  │ (Lưu trữ embeddings)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Luồng xử lý chi tiết

### 1. Người dùng gửi tin nhắn

```
User nhập: "Lịch công tác hôm nay là gì?"
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ ChatbotWindow.tsx                                               │
│ • handleSendMessage() được gọi                                  │
│ • Tạo userMessage với createMessage()                           │
│ • Hiển thị tin nhắn user lên giao diện                          │
│ • Bật trạng thái isTyping (hiệu ứng đang gõ)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Gọi API Backend

```
Frontend gửi POST /api/chatbot/chat
{
  "message": "Lịch công tác hôm nay là gì?",
  "session_id": "session_1706196812345_abc123",
  "chat_history": [
    { "role": "user", "content": "Xin chào" },
    { "role": "assistant", "content": "Xin chào! Tôi có thể giúp gì?" }
  ]
}
```

### 3. Backend xử lý

```
┌─────────────────────────────────────────────────────────────────┐
│ chatbot.controller.ts - chat()                                  │
│ • Validate message không rỗng                                   │
│ • Gọi chatbotService.chat()                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ chatbot.service.ts - chat()                                     │
│ • Forward request đến Python RAG Service (localhost:8002)       │
│ • Nếu có session_id, lưu lịch sử chat vào database              │
│ • Trả về response từ RAG service                                │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Python RAG Service xử lý

```
┌─────────────────────────────────────────────────────────────────┐
│ Python RAG Service                                              │
│                                                                 │
│ 1. RETRIEVAL (Tìm kiếm)                                         │
│    • Chuyển đổi query thành vector (embedding)                  │
│    • Tìm kiếm trong ChromaDB các documents tương tự             │
│    • Trả về top-k documents liên quan                           │
│                                                                 │
│ 2. AUGMENTATION (Bổ sung context)                               │
│    • Ghép nối documents tìm được vào prompt                     │
│    • Bao gồm: lịch công tác, tin tức, thông tin trường          │
│                                                                 │
│ 3. GENERATION (Sinh câu trả lời)                                │
│    • Gửi prompt đến Ollama/Qwen LLM                             │
│    • LLM tạo câu trả lời dựa trên context                       │
│    • Trả về answer + sources (nguồn trích dẫn)                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Response trả về

```json
{
  "success": true,
  "data": {
    "answer": "Hôm nay có 3 cuộc họp:\n\n1. 08:00 - Họp giao ban tại Phòng họp A...",
    "sources": [
      {
        "content": "Họp giao ban tuần - Phòng họp A",
        "metadata": { "date": "2026-01-27", "leader": "Phạm Quốc Thanh" },
        "score": 0.92
      }
    ],
    "query": "Lịch công tác hôm nay là gì?",
    "num_retrieved": 5
  }
}
```

---

## Các thành phần chi tiết

### Frontend Components

| File | Mô tả |
|------|-------|
| `ChatbotButton.tsx` | Nút bấm mở cửa sổ chat, hiển thị ở góc phải màn hình |
| `ChatbotWindow.tsx` | Cửa sổ chat chính với chế độ **Offline** (xử lý NLP cục bộ) |
| `ChatbotWindowRAG.tsx` | Cửa sổ chat với chế độ **Online RAG** (gọi API Backend) |
| `ChatMessage.tsx` | Component hiển thị một tin nhắn đơn lẻ |

### Frontend Services

| File | Mô tả |
|------|-------|
| `chatbotService.ts` | Service giao tiếp với Backend API |
| `chatbotLogic.ts` | Logic xử lý NLP offline (không cần Backend) |

### Backend Components

| File | Mô tả |
|------|-------|
| `chatbot.controller.ts` | Controller xử lý HTTP requests |
| `chatbot.service.ts` | Service giao tiếp với Python RAG |
| `chatbot.route.ts` | Định nghĩa API routes |
| `contextService.ts` | Xây dựng context từ database |

---

## Chế độ hoạt động

### Chế độ 1: Offline (NLP cục bộ)

Khi **Python RAG Service không chạy**, chatbot tự động chuyển sang chế độ offline:

```
User message → normalizeText() → extractIntent() → querySchedules() → formatAnswer()
```

**Đặc điểm:**
- Xử lý hoàn toàn ở Frontend
- Không cần kết nối đến LLM
- Sử dụng pattern matching và keyword extraction
- Trả lời nhanh, không độ trễ network

**Các module NLP offline:**
- `normalizeText.ts`: Chuẩn hóa văn bản (loại bỏ dấu, viết thường)
- `intentExtractor.ts`: Trích xuất ý định (hỏi lịch, hỏi tin tức...)
- `contextManager.ts`: Quản lý ngữ cảnh hội thoại
- `scheduleQuery.ts`: Truy vấn lịch từ dữ liệu local
- `answerFormatter.ts`: Định dạng câu trả lời
- `faqDatabase.ts`: Cơ sở dữ liệu câu hỏi thường gặp

### Chế độ 2: Online (RAG với LLM)

Khi **Python RAG Service đang chạy**, chatbot sử dụng AI:

```
User message → Backend API → Python RAG → Vector Search → Ollama LLM → Response
```

**Đặc điểm:**
- Câu trả lời thông minh hơn, tự nhiên hơn
- Hiểu được ngữ cảnh phức tạp
- Có thể trích dẫn nguồn (sources)
- Yêu cầu Ollama + Python service chạy

---

## API Endpoints

### Public APIs (Không cần auth)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/chatbot/chat` | Chat với chatbot |
| GET | `/api/chatbot/health` | Kiểm tra trạng thái RAG service |

### Admin APIs (Cần auth + role admin)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/chatbot/stats` | Thống kê vector store |
| POST | `/api/chatbot/index/schedules` | Index lịch công tác |
| POST | `/api/chatbot/index/document` | Index tài liệu info.docx |
| POST | `/api/chatbot/reindex-all` | Reindex toàn bộ dữ liệu |

---

## Quản lý dữ liệu Vector Store

### 1. Index lịch công tác

Khi admin bấm "Reindex Schedules":
```
1. Backend lấy tất cả schedule có status = 'approved' từ Prisma
2. Format dữ liệu thành JSON
3. Gửi POST đến Python RAG /index/schedules
4. Python tạo embeddings và lưu vào ChromaDB
```

### 2. Index tin tức & thông báo

Tương tự, dữ liệu tin tức và thông báo được embed vào vector store để chatbot có thể tìm kiếm.

### 3. Index tài liệu tĩnh

File `info.docx` chứa thông tin trường (tuyển sinh, địa chỉ, liên hệ...) được index vào vector store.

---

## Cấu hình môi trường

### Backend (.env)

```env
RAG_SERVICE_URL=https://localhost:8002
```

### Python RAG Service

```env
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=qwen2.5:7b
EMBEDDING_MODEL=nomic-embed-text
```

---

## Khởi động hệ thống

### 1. Khởi động Ollama

```bash
ollama serve
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

### 2. Khởi động Python RAG Service

```bash
cd python_service
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
```

### 3. Khởi động Backend

```bash
cd backend
npm run dev
```

### 4. Khởi động Frontend

```bash
npm run dev
```

---

## Troubleshooting

### Chatbot không trả lời / báo lỗi

1. **Kiểm tra Ollama đang chạy**: `ollama list`
2. **Kiểm tra Python RAG service**: Truy cập `https://localhost:8002/`
3. **Kiểm tra model đã được pull**: `ollama pull qwen2.5:7b`

### Chatbot trả lời không chính xác

1. **Reindex dữ liệu**: Vào Admin → Chatbot Settings → Reindex All
2. **Kiểm tra dữ liệu lịch công tác** có đúng định dạng không

### Khi chạy qua Ngrok

Frontend tự động detect Ngrok và gọi qua Backend Proxy:
- `/api/proxy/rag/*` → `localhost:8002`

---

## Tác giả

- **Trường Đại học Thái Bình**
- **Phiên bản**: 2.0
- **Cập nhật**: 2026-01-27
