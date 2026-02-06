# 🎤 Voice-Guided Schedule Form - Hướng dẫn sử dụng

## 📋 Tổng quan

Tính năng **Voice-Guided Schedule Form** cho phép người dùng nhập lịch công tác hoàn toàn bằng giọng nói với hướng dẫn tuần tự từng trường.

## ✨ Tính năng chính

### 1. **Nhập liệu tuần tự từng trường**
- Hệ thống sẽ hướng dẫn người dùng nhập từng trường một theo thứ tự
- Mỗi trường sẽ sáng lên (highlight) khi đến lượt nhập
- Có hiệu ứng âm thanh (Text-to-Speech) hướng dẫn

### 2. **Xử lý giọng nói thông minh**
- Sử dụng AI/LLM để chuẩn hóa dữ liệu
- Tự động viết hoa tên riêng
- Chuyển đổi số từ chữ sang số
- Chuẩn hóa ngày giờ theo format chuẩn

### 3. **Từ khóa kết thúc: "HẾT"**
- Người dùng PHẢI nói từ "hết" để kết thúc mỗi trường
- Nếu chưa nói "hết", hệ thống sẽ tiếp tục nghe
- Nói "hết" mà không có nội dung = bỏ qua trường đó (cho trường không bắt buộc)

## 🎯 Cách sử dụng

### Bước 1: Bật chế độ giọng nói
1. Mở form thêm lịch công tác
2. Click nút **"Bật giọng nói"** (biểu tượng Mic)
3. Hệ thống sẽ bắt đầu hướng dẫn

### Bước 2: Nhập từng trường theo hướng dẫn

#### **Trường 1: Ngày**
- **Hướng dẫn**: "Hãy nói ngày tổ chức, ví dụ: ngày 15 tháng 1 năm 2026 hết"
- **Ví dụ nói**: 
  - "ngày 15 tháng 1 năm 2026 hết"
  - "15 tháng 1 hết" (tự động dùng năm hiện tại)
- **Kết quả**: `2026-01-15`

#### **Trường 2: Giờ bắt đầu**
- **Hướng dẫn**: "Hãy nói giờ bắt đầu, ví dụ: 8 giờ sáng hết"
- **Ví dụ nói**:
  - "8 giờ sáng hết" → `08:00:00`
  - "2 giờ chiều hết" → `14:00:00`
  - "8 giờ 30 hết" → `08:30:00`
  - "14 giờ hết" → `14:00:00`

#### **Trường 3: Giờ kết thúc**
- **Hướng dẫn**: "Hãy nói giờ kết thúc, ví dụ: 10 giờ hết hoặc bỏ qua bằng cách nói hết"
- **Ví dụ nói**:
  - "10 giờ hết" → `10:00:00`
  - "hết" → Bỏ qua (null)

#### **Trường 4: Nội dung công tác**
- **Hướng dẫn**: "Hãy nói nội dung cuộc họp, ví dụ: Họp Giao Ban Tuần hết"
- **Ví dụ nói**:
  - "họp giao ban tuần hết" → `Họp Giao Ban Tuần`
  - "họp ban giám hiệu hết" → `Họp Ban Giám Hiệu`

#### **Trường 5: Địa điểm**
- **Hướng dẫn**: "Hãy nói địa điểm tổ chức, ví dụ: Phòng Họp A hết"
- **Ví dụ nói**:
  - "phòng họp a hết" → `Phòng Họp A`
  - "hội trường lớn hết" → `Hội Trường Lớn`

#### **Trường 6: Lãnh đạo chủ trì**
- **Hướng dẫn**: "Hãy nói tên lãnh đạo chủ trì, ví dụ: Thầy Nguyễn Văn Nam hết"
- **Ví dụ nói**:
  - "thầy nguyễn văn nam hết" → `Thầy Nguyễn Văn Nam`
  - "cô trần thị lan hết" → `Cô Trần Thị Lan`

#### **Trường 7: Thành phần tham dự**
- **Hướng dẫn**: "Hãy nói các thành phần tham dự, ví dụ: Ban Giám Hiệu, Phòng Đào Tạo hết"
- **Ví dụ nói**:
  - "ban giám hiệu, phòng đào tạo hết" → `["Ban Giám Hiệu", "Phòng Đào Tạo"]`
  - "hết" → Bỏ qua

#### **Trường 8: Đơn vị chuẩn bị**
- **Hướng dẫn**: "Hãy nói đơn vị chuẩn bị, ví dụ: Phòng Hành Chính hết"
- **Ví dụ nói**:
  - "phòng hành chính hết" → `Phòng Hành Chính`
  - "hết" → Bỏ qua

#### **Trường 9: Loại sự kiện**
- **Hướng dẫn**: "Hãy nói loại sự kiện: Cuộc Họp hết, Hội Nghị hết, hoặc Tạm Ngưng hết"
- **Ví dụ nói**:
  - "cuộc họp hết" → `cuoc_hop`
  - "hội nghị hết" → `hoi_nghi`
  - "tạm ngưng hết" → `tam_ngung`

#### **Trường 10: Ghi chú**
- **Hướng dẫn**: "Hãy nói ghi chú nếu có, ví dụ: Mang theo tài liệu hết"
- **Ví dụ nói**:
  - "mang theo tài liệu hết" → `Mang Theo Tài Liệu`
  - "hết" → Bỏ qua

### Bước 3: Hoàn thành
- Sau khi nhập xong tất cả trường, hệ thống sẽ thông báo "Đã hoàn thành nhập liệu bằng giọng nói"
- Kiểm tra lại thông tin
- Click **"Lưu lịch"** để lưu

## 🎨 Hiệu ứng trực quan

### 1. **Trường đang active (đang nhập)**
- Viền xanh sáng (ring-4 ring-blue-500)
- Nền xanh nhạt (bg-blue-50)
- Icon loa (Volume2) nhấp nháy
- Hiệu ứng pulse-slow

### 2. **Trường đã hoàn thành**
- Viền xanh lá (border-green-500)
- Icon check (CheckCircle2) màu xanh

### 3. **Trường chưa tới lượt**
- Disabled (không thể nhập bằng tay)
- Màu xám nhạt

## 🔧 Cấu hình kỹ thuật

### Yêu cầu trình duyệt
- ✅ Chrome/Chromium (khuyến nghị)
- ✅ Edge
- ❌ Firefox (không hỗ trợ Web Speech API)
- ⚠️ Safari (hỗ trợ hạn chế)

### Yêu cầu hệ thống
- Microphone hoạt động tốt
- Kết nối Internet (cho Web Speech API)
- Quyền truy cập microphone từ trình duyệt

## 🤖 AI Processing

### Fallback Mode (Hiện tại)
- Sử dụng rule-based processing
- Pattern matching với regex
- Không cần API key

### AI Mode (Tương lai - Tích hợp LLM)
Để tích hợp LLM thực sự, chỉnh sửa file `src/services/voiceAI.service.ts`:

```typescript
export async function processVoiceInput(
  transcript: string,
  currentField: ScheduleField
): Promise<VoiceProcessingResult> {
  // TODO: Gọi API LLM (OpenAI, Gemini, hoặc local LLM)
  const response = await fetch('/api/ai/process-voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      field: currentField,
      systemPrompt: SYSTEM_PROMPT
    })
  });
  
  const result = await response.json();
  return result;
}
```

## 📝 Ví dụ hoàn chỉnh

### Kịch bản: Tạo lịch họp giao ban

```
🎤 Hệ thống: "Bắt đầu nhập liệu bằng giọng nói. Tôi sẽ hướng dẫn bạn từng bước."

🎤 Hệ thống: "Hãy nói ngày tổ chức, ví dụ: ngày 15 tháng 1 năm 2026 hết"
👤 Người dùng: "ngày 20 tháng 1 năm 2026 hết"
✅ Lưu: 2026-01-20

🎤 Hệ thống: "Đã lưu. Tiếp theo: Giờ bắt đầu. Hãy nói giờ bắt đầu, ví dụ: 8 giờ sáng hết"
👤 Người dùng: "8 giờ sáng hết"
✅ Lưu: 08:00:00

🎤 Hệ thống: "Đã lưu. Tiếp theo: Giờ kết thúc. Hãy nói giờ kết thúc, ví dụ: 10 giờ hết"
👤 Người dùng: "10 giờ hết"
✅ Lưu: 10:00:00

🎤 Hệ thống: "Đã lưu. Tiếp theo: Nội dung công tác. Hãy nói nội dung cuộc họp"
👤 Người dùng: "họp giao ban tuần hết"
✅ Lưu: Họp Giao Ban Tuần

🎤 Hệ thống: "Đã lưu. Tiếp theo: Địa điểm. Hãy nói địa điểm tổ chức"
👤 Người dùng: "phòng họp a hết"
✅ Lưu: Phòng Họp A

🎤 Hệ thống: "Đã lưu. Tiếp theo: Lãnh đạo chủ trì. Hãy nói tên lãnh đạo"
👤 Người dùng: "thầy nguyễn văn nam hết"
✅ Lưu: Thầy Nguyễn Văn Nam

🎤 Hệ thống: "Đã lưu. Tiếp theo: Thành phần tham dự"
👤 Người dùng: "ban giám hiệu, phòng đào tạo hết"
✅ Lưu: ["Ban Giám Hiệu", "Phòng Đào Tạo"]

🎤 Hệ thống: "Đã lưu. Tiếp theo: Đơn vị chuẩn bị"
👤 Người dùng: "hết"
✅ Bỏ qua

🎤 Hệ thống: "Đã lưu. Tiếp theo: Loại sự kiện"
👤 Người dùng: "cuộc họp hết"
✅ Lưu: cuoc_hop

🎤 Hệ thống: "Đã lưu. Tiếp theo: Ghi chú"
👤 Người dùng: "hết"
✅ Bỏ qua

🎤 Hệ thống: "Đã hoàn thành nhập liệu bằng giọng nói. Vui lòng kiểm tra và lưu."
```

## 🐛 Xử lý lỗi

### Lỗi thường gặp

1. **"Trình duyệt không hỗ trợ nhận dạng giọng nói"**
   - Giải pháp: Sử dụng Chrome hoặc Edge

2. **"Không thể nhận dạng giọng nói"**
   - Kiểm tra microphone
   - Kiểm tra quyền truy cập microphone
   - Kiểm tra kết nối Internet

3. **"Không hiểu nội dung"**
   - Nói rõ ràng hơn
   - Đảm bảo có từ "hết" ở cuối
   - Thử lại với cú pháp đơn giản hơn

## 🚀 Tích hợp vào ScheduleManagement

Để sử dụng Voice-Guided Form trong ScheduleManagement:

```tsx
import { VoiceGuidedScheduleForm } from '@/components/schedule/VoiceGuidedScheduleForm';

// Trong Dialog
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle>Thêm lịch công tác mới</DialogTitle>
  </DialogHeader>
  
  <VoiceGuidedScheduleForm
    onSubmit={handleSubmit}
    onCancel={() => setIsDialogOpen(false)}
    initialData={formData}
  />
</DialogContent>
```

## 📚 Tài liệu tham khảo

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng liên hệ:
- Email: support@tbu.edu.vn
- Hotline: 0123-456-789

---

**Phát triển bởi**: TBU AI Team  
**Phiên bản**: 1.0  
**Ngày cập nhật**: 19/01/2026
