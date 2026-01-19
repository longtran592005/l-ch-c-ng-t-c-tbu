# 🎤 Voice-Guided Schedule Form - Tổng kết Implementation

## 📦 Các file đã tạo

### 1. **Core Service**
```
src/services/voiceAI.service.ts
```
- Xử lý giọng nói bằng AI/LLM
- System prompt chuyên nghiệp
- Fallback processing rule-based
- Chuẩn hóa dữ liệu theo từng loại field

### 2. **UI Component**
```
src/components/schedule/VoiceGuidedScheduleForm.tsx
```
- Form với hướng dẫn tuần tự từng trường
- Speech Recognition (giọng nói → text)
- Text-to-Speech (hướng dẫn bằng giọng nói)
- Hiệu ứng sáng lên, animation
- Quản lý state phức tạp

### 3. **Documentation**
```
docs/VOICE_GUIDED_FORM.md
```
- Hướng dẫn sử dụng chi tiết
- Ví dụ cho từng trường
- Xử lý lỗi
- Tích hợp LLM

### 4. **Demo Page**
```
src/pages/demo/VoiceGuidedFormDemo.tsx
```
- Trang demo để test
- Hướng dẫn trực quan
- Hiển thị kết quả

### 5. **Tailwind Config**
```
tailwind.config.ts
```
- Thêm animation `pulse-slow`

## 🚀 Cách tích hợp vào ScheduleManagement

### Bước 1: Import component

```tsx
import { VoiceGuidedScheduleForm } from '@/components/schedule/VoiceGuidedScheduleForm';
import type { ScheduleFormData } from '@/components/schedule/VoiceGuidedScheduleForm';
```

### Bước 2: Thay thế Dialog Content

**Trước đây:**
```tsx
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>...</DialogHeader>
  
  {/* Form cũ với nhiều Input, Select, Calendar... */}
  <div className="grid gap-4 py-4">
    {/* ... */}
  </div>
  
  <DialogFooter>
    <Button onClick={handleSubmit}>Thêm mới</Button>
  </DialogFooter>
</DialogContent>
```

**Sau khi tích hợp:**
```tsx
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle>
      {editingSchedule ? 'Chỉnh sửa lịch công tác' : 'Thêm lịch công tác mới'}
    </DialogTitle>
    <DialogDescription>
      Điền thông tin chi tiết hoặc sử dụng giọng nói để nhập liệu
    </DialogDescription>
  </DialogHeader>

  <VoiceGuidedScheduleForm
    onSubmit={handleFormSubmit}
    onCancel={() => setIsDialogOpen(false)}
    initialData={editingSchedule ? {
      date: new Date(editingSchedule.date),
      startTime: editingSchedule.startTime,
      endTime: editingSchedule.endTime,
      content: editingSchedule.content,
      location: editingSchedule.location,
      leader: editingSchedule.leader,
      participants: editingSchedule.participants.join(', '),
      preparingUnit: editingSchedule.preparingUnit,
      eventType: editingSchedule.eventType || '',
      notes: editingSchedule.notes || ''
    } : undefined}
  />
</DialogContent>
```

### Bước 3: Cập nhật handleSubmit

```tsx
const handleFormSubmit = async (data: ScheduleFormData) => {
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
    eventType: data.eventType as ScheduleEventType,
    status: 'draft' as ScheduleStatus,
    createdBy: user?.id || 'admin',
  };

  try {
    if (editingSchedule) {
      await updateSchedule(editingSchedule.id, scheduleData);
      toast({ title: 'Đã cập nhật lịch công tác' });
    } else {
      await addSchedule(scheduleData);
      toast({ title: 'Đã thêm lịch công tác mới' });
    }
    setIsDialogOpen(false);
    setEditingSchedule(null);
  } catch (err: any) {
    toast({
      title: 'Lỗi',
      description: err?.message || 'Không thể lưu lịch',
      variant: 'destructive'
    });
  }
};
```

## 🔧 Tích hợp LLM thực sự

### Option 1: OpenAI GPT

```typescript
// src/services/voiceAI.service.ts

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Chỉ dùng cho demo, production nên gọi qua backend
});

export async function processVoiceInput(
  transcript: string,
  currentField: ScheduleField
): Promise<VoiceProcessingResult> {
  try {
    const fieldMeta = SCHEDULE_FIELDS.find(f => f.name === currentField);
    if (!fieldMeta) {
      return { status: 'DONE', error: 'Invalid field' };
    }

    const userPrompt = `
Trường hiện tại: ${fieldMeta.name}
Loại dữ liệu: ${fieldMeta.type}
${fieldMeta.enumValues ? `Giá trị hợp lệ: ${fieldMeta.enumValues.join(', ')}` : ''}

Văn bản giọng nói: "${transcript}"

Hãy xử lý và trả về JSON theo đúng format quy định.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as VoiceProcessingResult;

  } catch (error) {
    console.error('[VoiceAI] OpenAI error:', error);
    // Fallback to rule-based
    return fallbackProcessing(transcript, fieldMeta);
  }
}
```

### Option 2: Google Gemini

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function processVoiceInput(
  transcript: string,
  currentField: ScheduleField
): Promise<VoiceProcessingResult> {
  try {
    const fieldMeta = SCHEDULE_FIELDS.find(f => f.name === currentField);
    if (!fieldMeta) {
      return { status: 'DONE', error: 'Invalid field' };
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    });

    const prompt = `${SYSTEM_PROMPT}

Trường hiện tại: ${fieldMeta.name}
Loại dữ liệu: ${fieldMeta.type}
${fieldMeta.enumValues ? `Giá trị hợp lệ: ${fieldMeta.enumValues.join(', ')}` : ''}

Văn bản giọng nói: "${transcript}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text) as VoiceProcessingResult;

  } catch (error) {
    console.error('[VoiceAI] Gemini error:', error);
    return fallbackProcessing(transcript, fieldMeta);
  }
}
```

### Option 3: Backend API (Khuyến nghị cho Production)

```typescript
export async function processVoiceInput(
  transcript: string,
  currentField: ScheduleField
): Promise<VoiceProcessingResult> {
  try {
    const response = await fetch('/api/ai/process-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('tbu_auth_token')}`
      },
      body: JSON.stringify({
        transcript,
        field: currentField
      })
    });

    if (!response.ok) {
      throw new Error('API call failed');
    }

    const result = await response.json();
    return result as VoiceProcessingResult;

  } catch (error) {
    console.error('[VoiceAI] API error:', error);
    // Fallback to rule-based
    const fieldMeta = SCHEDULE_FIELDS.find(f => f.name === currentField);
    return fallbackProcessing(transcript, fieldMeta!);
  }
}
```

## 📝 Environment Variables

Tạo file `.env`:

```env
# OpenAI
VITE_OPENAI_API_KEY=sk-...

# Google Gemini
VITE_GEMINI_API_KEY=...

# Backend API
VITE_API_BASE_URL=http://localhost:3000
```

## 🧪 Testing

### 1. Chạy Demo Page

```bash
# Thêm route vào router
# src/App.tsx hoặc router config

import VoiceGuidedFormDemo from '@/pages/demo/VoiceGuidedFormDemo';

// Thêm route
{
  path: '/demo/voice-form',
  element: <VoiceGuidedFormDemo />
}
```

Truy cập: `http://localhost:5173/demo/voice-form`

### 2. Test Cases

#### Test Case 1: Nhập đầy đủ
- Bật giọng nói
- Nhập tất cả trường theo hướng dẫn
- Kiểm tra kết quả

#### Test Case 2: Bỏ qua trường không bắt buộc
- Nói "hết" để bỏ qua
- Kiểm tra value = null

#### Test Case 3: Sửa lỗi
- Nói sai → không có "hết"
- Hệ thống tiếp tục nghe
- Nói lại đúng

## 🎯 Roadmap

### Phase 1: ✅ Hoàn thành
- [x] Voice AI Service với system prompt
- [x] Voice-Guided Form component
- [x] Fallback processing rule-based
- [x] UI/UX với hiệu ứng
- [x] Documentation

### Phase 2: 🚧 Đang phát triển
- [ ] Tích hợp LLM thực sự (OpenAI/Gemini)
- [ ] Backend API cho voice processing
- [ ] Cải thiện độ chính xác
- [ ] Thêm ngôn ngữ khác (English)

### Phase 3: 📋 Kế hoạch
- [ ] Voice commands (shortcuts)
- [ ] Offline mode với local LLM
- [ ] Multi-language support
- [ ] Voice analytics & insights

## 🐛 Known Issues

1. **Web Speech API không ổn định**
   - Giải pháp: Thêm retry mechanism
   - Fallback: Cho phép nhập bằng tay

2. **Giọng địa phương khó nhận dạng**
   - Giải pháp: Train custom model
   - Workaround: Hướng dẫn nói rõ hơn

3. **Cần Internet**
   - Giải pháp: Tích hợp local speech recognition
   - Workaround: Thông báo người dùng

## 📞 Support

- **Email**: longtran592005@gmail.com
- **GitHub Issues**: [Link to repo]
- **Documentation**: `/docs/VOICE_GUIDED_FORM.md`

---

**Developed by**: TBU AI Team  
**Version**: 1.0.0  
**Last Updated**: 2026-01-19
