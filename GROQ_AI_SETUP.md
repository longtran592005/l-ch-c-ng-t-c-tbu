# 🚀 Cài đặt Groq AI cho Chatbot

## 📌 Bước 1: Lấy API Key Groq (5 phút)

1. Truy cập: https://console.groq.com
2. Đăng ký bằng **Google** hoặc **GitHub** (HOÀN TOÀN MIỄN PHÍ!)
3. Sau khi đăng ký, copy **API Key** (format: `gsk_xxxxxxxxxxxxxxxx`)

## 📝 Bước 2: Cấu hình Backend

### Thêm vào `backend/.env`:

```env
# Groq AI Configuration
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx_XXXXXXXXXXXXX
GROQ_MODEL=llama3-70b-8192
```

### Chọn Model:

| Model | Mô tả | Khuyên nghị |
|-------|---------|------------|
| `mixtral-8x7b-32768` | Cân bằng, nhanh | ⭐ CHO CHỌN ĐIỂM HỢP |
| `llama3-70b-8192` | Lớn nhất, chất lượng tốt | ⭐ Cho câu hỏi phức tạp |
| `llama3-8b-8192` | Nhẹ, nhanh nhất | ⭐ Cho tốc độ |

**Hoặc để trống** → Sẽ dùng default là `llama3-70b-8192`

### Chạy lại Backend:

```bash
# Đóng backend hiện tại
cd backend
npm run dev
```

## 📝 Bước 3: Cấu hình Frontend

### File `.env` đã được cấu hình sẵn:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Refresh Frontend:

**Cách 1:** Refresh browser (F5)

**Cách 2:** Restart frontend:
```bash
npm run dev
```

## 🧪 Bước 4: Test Chatbot

### Các câu hỏi có thể thử:

**Lịch công tác:**
- "Lịch công tác hôm nay"
- "Lịch tuần này"
- "Hiệu trưởng hôm nay làm gì?"

**Tin tức & Thông báo:**
- "Tin tức mới nhất"
- "Có thông báo quan trọng không?"

**Thông tin trường (AI sẽ trả lời):**
- "Địa chỉ trường ở đâu?"
- "Trường có những ngành đào tạo nào?"
- "Điểm chuẩn ngành Kinh tế?"
- "Nhà trường có KTX không?"
- "Giờ làm việc của trường?"
- "Website trường là gì?"

**Câu hỏi bất kỳ (AI sẽ suy luận):**
- "Làm sao để đăng ký?"
- "Học phí ngành IT là bao nhiêu?"
- "Có học bổng không?"
- "Điền [câu hỏi bất kỳ...]"

## 📊 Kiểm tra AI có hoạt động:

### Cách 1: Xem Console

Mở browser DevTools (F12) → Console:

**Nếu AI hoạt động:**
```
[Chatbot] AI response: "..."
```

**Nếu AI fails, sẽ thấy:**
```
[Chatbot] AI failed, falling back to rule-based: ...
```

### Cách 2: Xem Network Tab

1. Mở DevTools → Network
2. Gửi câu hỏi vào chatbot
3. Tìm request tới: `/api/ai-chat`
4. Xem response:
   - 200 OK → AI hoạt động
   - 404/500 → Có lỗi

### Cách 3: Test trực tiếp API

Sử dụng curl hoặc Postman:

```bash
curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Địa chỉ trường ở đâu?"
  }'
```

**Response success:**
```json
{
  "success": true,
  "data": {
    "answer": "📍 Địa chỉ Trường Đại học Thái Bình...",
    "model": "llama3-70b-8192",
    "tokens": 245
  }
}
```

## 🔒 Security Notes:

- ✅ API key được lưu trong `.env` (không commit vào git)
- ✅ Rate limiting: 30 requests/minute (Groq free tier)
- ✅ Error handling tự động fallback vào rule-based
- ✅ Không lưu conversation history trên server

## 💰 Chi phí:

**Groq Free Tier:**
- ✅ HOÀN TOÀN MIỄN PHÍ
- ✅ Unlimited requests
- ✅ 30 requests/minute rate limit

**Không cần trả tiền!**

## 🐛 Troubleshooting:

### Lỗi: "GROQ_API_KEY not configured"

**Nguyên nhân:** Chưa thêm API key vào `.env`

**Giải pháp:**
```env
# backend/.env
GROQ_API_KEY=gsk_your_api_key_here
```

### Lỗi: "API key not valid"

**Nguyên nhân:** API key sai hoặc đã hết hạn

**Giải pháp:**
1. Truy cập https://console.groq.com
2. Lấy lại API key mới
3. Update vào `backend/.env`
4. Restart backend

### Lỗi: "Rate limit exceeded"

**Nguyên nhân:** Gửi quá 30 requests/phút

**Giải pháp:**
- Chờ 1-2 phút rồi thử lại
- Hoặc tăng rate limit trong code (khuyên nghị)

### Lỗi: Chatbot trả lời sai

**Nguyên nhân:** Model AI chưa đủ thông tin về trường

**Giải pháp:**
1. Update SYSTEM_PROMPT trong `backend/src/services/groqAI.service.ts`
2. Thêm thông tin thực tế về trường
3. Restart backend

### Lỗi: Không trả lời AI, chỉ rule-based

**Nguyên nhân:** AI service lỗi

**Giải pháp:**
1. Kiểm tra console log
2. Xem network tab
3. Test API trực tiếp với curl
4. Restart backend server

## 🎉 Done!

Bây giờ Chatbot có thể:
- ✅ Trả lời MỌI câu hỏi nhờ AI
- ✅ Fallback tự động vào rule-based nếu AI lỗi
- ✅ Conversation history (nhớ 8 tin nhắn gần nhất)
- ✅ Hoàn toàn MIỄN PHÍ với Groq

**Chúc mừng! Chatbot giờ đây đã thông minh hơn! 🚀**

---

**Need Help?**
- 📖 Groq Docs: https://console.groq.com/docs
- 🤖 Issue Report: Contact admin
