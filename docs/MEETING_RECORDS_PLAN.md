# Kế hoạch phát triển tính năng "Nội dung cuộc họp"

## 📋 Tổng quan

Tính năng này cho phép Ban Giám hiệu ghi lại và quản lý nội dung các cuộc họp, bao gồm:
- Ghi âm trực tiếp cuộc họp
- Upload file ghi âm từ máy
- Xem/nghe lại file ghi âm
- Ghi lại nội dung cuộc họp (text)
- Tạo biên bản cuộc họp từ nội dung

## 🎯 Mục tiêu

1. Tạo trang "Nội dung cuộc họp" trong khu vực admin
2. Hiển thị danh sách các cuộc họp từ lịch công tác (eventType = 'cuoc_hop')
3. Cho phép ghi âm trực tiếp và lưu file
4. Cho phép upload file ghi âm
5. Cho phép xem/nghe lại file đã lưu
6. Cho phép ghi lại nội dung cuộc họp (rich text editor)
7. Tạo biên bản cuộc họp từ nội dung (có thể dùng template hoặc AI)

## 🗄️ Database Schema

### Model: MeetingRecord

```prisma
model MeetingRecord {
  id                String    @id @default(uuid())
  scheduleId        String    @map("schedule_id") // Liên kết với Schedule
  schedule         Schedule  @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  
  // Thông tin cuộc họp
  title             String    @db.NVarChar(500) // Tiêu đề cuộc họp
  meetingDate       DateTime  @map("meeting_date") @db.Date
  startTime         DateTime? @map("start_time") @db.Time
  endTime           DateTime? @map("end_time") @db.Time
  location          String?   @db.NVarChar(500)
  leader            String?   @db.NVarChar(255) // Chủ trì
  participants      String    @default("[]") @db.NText // JSON array
  
  // File ghi âm
  audioRecordings   String    @default("[]") @db.NText // JSON array: [{url, filename, duration, uploadedAt, type: 'recorded'|'uploaded'}]
  
  // Nội dung cuộc họp (rich text)
  content           String?   @db.NText // Nội dung cuộc họp đã ghi lại
  
  // Biên bản
  minutes           String?   @db.NText // Biên bản cuộc họp
  
  // Metadata
  createdBy         String    @map("created_by")
  creator           User      @relation(fields: [createdBy], references: [id], onDelete: NoAction)
  status            String    @default("draft") @db.NVarChar(20) // draft, completed, archived
  notes             String?   @db.NText
  
  // Timestamps
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  completedAt       DateTime? @map("completed_at")
  
  @@index([scheduleId])
  @@index([meetingDate])
  @@index([createdBy])
  @@index([status])
  @@map("meeting_records")
}
```

### Cập nhật User model

```prisma
model User {
  // ... existing fields
  meetingRecords    MeetingRecord[]
}
```

### Cập nhật Schedule model

```prisma
model Schedule {
  // ... existing fields
  meetingRecords    MeetingRecord[]
}
```

## 📁 Cấu trúc Files

### Frontend

```
src/
├── pages/
│   └── admin/
│       └── MeetingRecordsPage.tsx          # Trang chính quản lý nội dung cuộc họp
├── components/
│   └── meeting/
│       ├── MeetingRecordList.tsx            # Danh sách các cuộc họp
│       ├── MeetingRecordDetail.tsx          # Chi tiết cuộc họp
│       ├── AudioRecorder.tsx                # Component ghi âm trực tiếp
│       ├── AudioPlayer.tsx                  # Component phát lại audio
│       ├── AudioUploader.tsx                # Component upload file audio
│       ├── MeetingContentEditor.tsx         # Editor nội dung cuộc họp
│       └── MeetingMinutesGenerator.tsx      # Tạo biên bản từ nội dung
├── contexts/
│   └── MeetingRecordsContext.tsx            # Context quản lý meeting records
├── services/
│   └── meetingRecords.api.ts                # API calls cho meeting records
└── types/
    └── index.ts                             # Thêm MeetingRecord type
```

### Backend

```
backend/
├── src/
│   ├── controllers/
│   │   └── meetingRecord.controller.ts      # Controllers cho meeting records
│   ├── services/
│   │   └── meetingRecord.service.ts         # Business logic
│   ├── routes/
│   │   └── meetingRecord.route.ts           # API routes
│   └── utils/
│       └── fileUpload.util.ts               # Utility xử lý file upload
└── prisma/
    └── migrations/
        └── YYYYMMDDHHMMSS_add_meeting_records/
            └── migration.sql
```

## 🔧 Chi tiết Implementation

### 1. Audio Recording (Ghi âm trực tiếp)

**Technology**: Web Audio API + MediaRecorder API

**Features**:
- Start/Stop recording
- Hiển thị thời gian ghi âm
- Visual waveform (optional)
- Lưu file dạng WebM hoặc WAV
- Upload lên server sau khi ghi xong

**Component**: `AudioRecorder.tsx`

```typescript
interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number; // Giới hạn thời gian ghi (phút)
}
```

### 2. Audio Upload (Upload file ghi âm)

**Features**:
- Drag & drop hoặc click để chọn file
- Hỗ trợ các format: MP3, WAV, M4A, WebM
- Hiển thị progress khi upload
- Validate file size (max 100MB)
- Preview file trước khi upload

**Component**: `AudioUploader.tsx`

### 3. Audio Player (Nghe lại)

**Features**:
- Play/Pause
- Seek bar
- Hiển thị thời gian (current/total)
- Volume control
- Playback speed (0.5x, 1x, 1.5x, 2x)
- Download file

**Component**: `AudioPlayer.tsx`

### 4. Meeting Content Editor (Ghi nội dung)

**Technology**: Rich text editor (Tiptap hoặc React Quill)

**Features**:
- Rich text formatting (bold, italic, underline, lists, etc.)
- Auto-save (mỗi 30 giây)
- Undo/Redo
- Word count
- Export to PDF/Word (optional)

**Component**: `MeetingContentEditor.tsx`

### 5. Meeting Minutes Generator (Tạo biên bản)

**Approach**: Template-based hoặc AI-powered

**Option 1: Template-based** (Đơn giản, nhanh)
- Sử dụng template có sẵn
- Điền thông tin từ nội dung cuộc họp
- Format chuẩn biên bản

**Option 2: AI-powered** (Phức tạp hơn, cần API)
- Sử dụng AI để tóm tắt và format nội dung
- Có thể tích hợp với OpenAI API hoặc local LLM

**Component**: `MeetingMinutesGenerator.tsx`

## 🔐 Security & Permissions

- Chỉ user có role `admin` hoặc `bgh` mới có thể truy cập
- Chỉ creator hoặc admin mới có thể edit/delete
- File upload cần validate:
  - File type (chỉ audio)
  - File size (max 100MB)
  - Virus scan (optional)

## 📡 API Endpoints

### Meeting Records

```
GET    /api/meeting-records              # Lấy danh sách
GET    /api/meeting-records/:id           # Lấy chi tiết
POST   /api/meeting-records               # Tạo mới
PUT    /api/meeting-records/:id           # Cập nhật
DELETE /api/meeting-records/:id           # Xóa

GET    /api/meeting-records/schedule/:scheduleId  # Lấy theo schedule
POST   /api/meeting-records/:id/audio     # Upload audio file
GET    /api/meeting-records/:id/audio/:audioId    # Download audio
DELETE /api/meeting-records/:id/audio/:audioId   # Xóa audio

POST   /api/meeting-records/:id/generate-minutes  # Tạo biên bản
```

## 🎨 UI/UX Design

### Layout

```
┌─────────────────────────────────────────────────┐
│  Header: "Nội dung cuộc họp"                   │
├─────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐   │
│  │  Danh sách cuộc │  │  Chi tiết cuộc    │   │
│  │  họp            │  │  họp              │   │
│  │                 │  │                   │   │
│  │  [Filter]       │  │  [Ghi âm]        │   │
│  │  [Search]       │  │  [Upload audio]  │   │
│  │                 │  │                   │   │
│  │  - Cuộc họp 1   │  │  [Audio Player]  │   │
│  │  - Cuộc họp 2   │  │                   │   │
│  │  - ...          │  │  [Nội dung]      │   │
│  │                 │  │  [Editor]        │   │
│  │                 │  │                   │   │
│  │                 │  │  [Tạo biên bản]  │   │
│  └─────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 📦 Dependencies cần thêm

### Frontend
```json
{
  "@tiptap/react": "^2.x",           // Rich text editor
  "@tiptap/starter-kit": "^2.x",
  "react-audio-player": "^0.17.x",  // Audio player
  "react-dropzone": "^14.x",          // File upload
  "date-fns": "^2.x"                  // Date formatting (đã có)
}
```

### Backend
```json
{
  "multer": "^1.4.x",                 // File upload middleware
  "@types/multer": "^1.4.x",
  "mime-types": "^2.x"                 // MIME type detection
}
```

## 🚀 Implementation Steps

### Phase 1: Database & Backend API (1-2 ngày)
1. ✅ Tạo migration cho MeetingRecord model
2. ✅ Tạo Prisma schema
3. ✅ Tạo backend controllers, services, routes
4. ✅ Implement file upload endpoint
5. ✅ Test API endpoints

### Phase 2: Frontend Core (2-3 ngày)
1. ✅ Tạo MeetingRecordsContext
2. ✅ Tạo MeetingRecordsPage
3. ✅ Tạo MeetingRecordList component
4. ✅ Tạo MeetingRecordDetail component
5. ✅ Integrate với AdminLayout

### Phase 3: Audio Features (2-3 ngày)
1. ✅ Implement AudioRecorder component
2. ✅ Implement AudioUploader component
3. ✅ Implement AudioPlayer component
4. ✅ Test audio recording/playback

### Phase 4: Content Editor (1-2 ngày)
1. ✅ Implement MeetingContentEditor
2. ✅ Add auto-save functionality
3. ✅ Test editor features

### Phase 5: Minutes Generator (1-2 ngày)
1. ✅ Implement template-based generator
2. ✅ (Optional) Integrate AI API
3. ✅ Test generation

### Phase 6: Polish & Testing (1 ngày)
1. ✅ UI/UX improvements
2. ✅ Error handling
3. ✅ Loading states
4. ✅ Responsive design
5. ✅ Final testing

## 📝 Notes

1. **File Storage**: 
   - Option 1: Lưu trên server filesystem (đơn giản)
   - Option 2: Lưu trên cloud storage (S3, Azure Blob) - tốt hơn cho production

2. **Audio Format**:
   - WebM: Tốt cho browser recording
   - MP3: Tốt cho compatibility
   - WAV: Tốt cho quality nhưng file lớn

3. **Performance**:
   - Lazy load audio files
   - Compress audio files khi upload
   - Pagination cho danh sách cuộc họp

4. **Accessibility**:
   - Keyboard navigation
   - Screen reader support
   - Transcript generation (future feature)

## ✅ Checklist

- [ ] Database schema & migration
- [ ] Backend API endpoints
- [ ] File upload handling
- [ ] Frontend context & services
- [ ] Meeting records list page
- [ ] Meeting record detail page
- [ ] Audio recorder component
- [ ] Audio uploader component
- [ ] Audio player component
- [ ] Content editor component
- [ ] Minutes generator component
- [ ] Integration với AdminLayout
- [ ] Testing
- [ ] Documentation

