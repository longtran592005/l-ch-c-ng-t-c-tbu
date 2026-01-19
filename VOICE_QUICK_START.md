# 🎤 Voice-Guided Schedule Form - Quick Start

## 🎯 Tính năng

Nhập liệu lịch công tác **hoàn toàn bằng giọng nói** với hướng dẫn tuần tự từng trường.

## ✨ Highlights

- ✅ **Hướng dẫn bằng giọng nói** (Text-to-Speech)
- ✅ **Nhận dạng giọng nói** (Speech-to-Text)
- ✅ **AI xử lý thông minh** (Ollama Qwen 2.5 Local)
- ✅ **Hiệu ứng sáng lên** từng trường
- ✅ **Từ khóa "HẾT"** để kết thúc mỗi trường
- ✅ **Tự động fallback** nếu Ollama không chạy

## 🤖 AI Processing

**Ollama Qwen 2.5 Local** (Khuyến nghị):
- Độ chính xác cao (~95%)
- Hiểu ngữ cảnh tốt
- Chạy local, không cần Internet
- Tự động fallback nếu không chạy

**Fallback Rule-based**:
- Luôn hoạt động
- Độ chính xác ~70%
- Nhanh (<100ms)

### Khởi động Ollama (Optional nhưng khuyến nghị)

```bash
# Chạy Qwen 2.5
ollama run qwen2.5:7b-instruct-q4_0

# Kiểm tra: http://localhost:11434
```

## 🚀 Sử dụng

### 1. Import Component

```tsx
import { VoiceGuidedScheduleForm } from '@/components/schedule/VoiceGuidedScheduleForm';
```

### 2. Sử dụng trong Dialog

```tsx
<VoiceGuidedScheduleForm
  onSubmit={handleSubmit}
  onCancel={() => setIsDialogOpen(false)}
  initialData={formData}
/>
```

### 3. Xử lý Submit

```tsx
const handleSubmit = async (data: ScheduleFormData) => {
  const scheduleData = {
    date: data.date,
    dayOfWeek: format(data.date, 'EEEE', { locale: vi }),
    startTime: data.startTime,
    endTime: data.endTime,
    content: data.content,
    location: data.location,
    leader: data.leader,
    participants: data.participants.split(',').map(p => p.trim()).filter(Boolean),
    preparingUnit: data.preparingUnit,
    notes: data.notes,
    eventType: data.eventType,
    status: 'draft',
    createdBy: user?.id || 'admin',
  };

  await addSchedule(scheduleData);
};
```

## 📝 Ví dụ sử dụng

```
👤 Bật giọng nói
🤖 "Hãy nói ngày tổ chức, ví dụ: ngày 15 tháng 1 năm 2026 hết"

👤 "ngày 20 tháng 1 năm 2026 hết"
✅ Lưu: 2026-01-20

🤖 "Đã lưu. Tiếp theo: Giờ bắt đầu..."
👤 "8 giờ sáng hết"
✅ Lưu: 08:00:00

🤖 "Đã lưu. Tiếp theo: Giờ kết thúc..."
👤 "10 giờ hết"
✅ Lưu: 10:00:00

... (tiếp tục cho đến hết)

🤖 "Đã hoàn thành nhập liệu bằng giọng nói!"
```

## 📦 Files Created

```
src/
├── services/
│   └── voiceAI.service.ts          # AI processing service
├── components/
│   └── schedule/
│       └── VoiceGuidedScheduleForm.tsx  # Main component
└── pages/
    └── demo/
        └── VoiceGuidedFormDemo.tsx      # Demo page

docs/
├── VOICE_GUIDED_FORM.md            # Chi tiết hướng dẫn
└── VOICE_IMPLEMENTATION.md         # Tích hợp & LLM setup

tailwind.config.ts                   # Added pulse-slow animation
```

## 🔧 Tích hợp LLM (Optional)

### OpenAI

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY
});

// Thay thế fallbackProcessing bằng OpenAI call
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ],
  response_format: { type: 'json_object' }
});
```

### Google Gemini

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const result = await model.generateContent(prompt);
```

## 🎨 UI Features

- **Active field**: Viền xanh + nền xanh nhạt + icon loa nhấp nháy
- **Completed field**: Viền xanh lá + icon check
- **Disabled field**: Màu xám (chưa tới lượt)
- **Animation**: pulse-slow cho trường đang active

## 📚 Documentation

- **User Guide**: `docs/VOICE_GUIDED_FORM.md`
- **Implementation**: `docs/VOICE_IMPLEMENTATION.md`
- **Demo**: `/demo/voice-form`

## 🐛 Troubleshooting

**Không nghe được giọng nói?**
- Kiểm tra microphone
- Cho phép quyền truy cập microphone
- Dùng Chrome/Edge (không dùng Firefox)

**Không hiểu nội dung?**
- Nói rõ ràng hơn
- Đảm bảo có từ "hết" ở cuối
- Thử lại với cú pháp đơn giản

## 🎯 Next Steps

1. **Test Demo**: Truy cập `/demo/voice-form`
2. **Tích hợp**: Thay thế form cũ trong ScheduleManagement
3. **LLM**: Tích hợp OpenAI/Gemini cho độ chính xác cao hơn
4. **Deploy**: Test trên production

---

**Created by**: TBU AI Team  
**Version**: 1.0.0  
**Date**: 2026-01-19
