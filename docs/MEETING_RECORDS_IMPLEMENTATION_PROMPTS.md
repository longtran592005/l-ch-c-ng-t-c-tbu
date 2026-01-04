# Prompts cụ thể cho từng giai đoạn - Tính năng "Nội dung cuộc họp"

## 📋 Phase 1: Database & Backend API

### Prompt 1.1: Tạo Database Schema

```
Tôi cần tạo database schema cho tính năng "Nội dung cuộc họp". Hãy:

1. Mở file backend/prisma/schema.prisma
2. Thêm model MeetingRecord với các trường sau:
   - id: String (UUID, primary key)
   - scheduleId: String (foreign key đến Schedule, cascade delete)
   - title: String (tiêu đề cuộc họp, max 500 chars)
   - meetingDate: DateTime (ngày họp)
   - startTime: DateTime? (thời gian bắt đầu, optional)
   - endTime: DateTime? (thời gian kết thúc, optional)
   - location: String? (địa điểm, optional, max 500 chars)
   - leader: String? (chủ trì, optional, max 255 chars)
   - participants: String (JSON array dạng string, default "[]")
   - audioRecordings: String (JSON array chứa thông tin file audio, default "[]")
     Format: [{url: string, filename: string, duration: number, uploadedAt: DateTime, type: 'recorded'|'uploaded'}]
   - content: String? (nội dung cuộc họp dạng rich text, optional)
   - minutes: String? (biên bản cuộc họp, optional)
   - createdBy: String (foreign key đến User)
   - status: String (default "draft", có thể là: draft, completed, archived)
   - notes: String? (ghi chú, optional)
   - createdAt: DateTime (auto)
   - updatedAt: DateTime (auto updated)
   - completedAt: DateTime? (khi hoàn thành, optional)

3. Thêm relation:
   - MeetingRecord belongs to Schedule (scheduleId)
   - MeetingRecord belongs to User (createdBy)
   - User has many MeetingRecord
   - Schedule has many MeetingRecord

4. Thêm indexes:
   - scheduleId
   - meetingDate
   - createdBy
   - status

5. Sử dụng SQL Server data types (@db.NVarChar, @db.NText, @db.Date, @db.Time)
6. Map table name thành "meeting_records"
```

### Prompt 1.2: Tạo Migration

```
Tôi cần tạo Prisma migration cho model MeetingRecord. Hãy:

1. Chạy lệnh: npx prisma migrate dev --name add_meeting_records
2. Kiểm tra file migration được tạo trong backend/prisma/migrations/
3. Đảm bảo migration có:
   - CREATE TABLE meeting_records
   - Tất cả các columns với đúng data types
   - Foreign keys và constraints
   - Indexes
4. Nếu có lỗi, sửa lại và chạy lại migration
```

### Prompt 1.3: Tạo Backend Service

```
Tôi cần tạo service layer cho MeetingRecord. Hãy tạo file backend/src/services/meetingRecord.service.ts với:

1. Import Prisma client và các types cần thiết

2. Implement các functions:
   - getAllMeetingRecords(filters?: {scheduleId?, status?, dateFrom?, dateTo?}): Promise<MeetingRecord[]>
     + Lấy tất cả meeting records, có thể filter
     + Include relations: schedule, creator
     + Order by meetingDate DESC
   
   - getMeetingRecordById(id: string): Promise<MeetingRecord | null>
     + Lấy meeting record theo ID
     + Include relations: schedule, creator
   
   - getMeetingRecordsByScheduleId(scheduleId: string): Promise<MeetingRecord[]>
     + Lấy tất cả meeting records của một schedule
   
   - createMeetingRecord(data: CreateMeetingRecordInput): Promise<MeetingRecord>
     + Tạo meeting record mới
     + Validate data
     + Parse participants và audioRecordings từ JSON string nếu cần
   
   - updateMeetingRecord(id: string, data: UpdateMeetingRecordInput): Promise<MeetingRecord>
     + Cập nhật meeting record
     + Chỉ update các fields được cung cấp
     + Parse JSON fields nếu cần
   
   - deleteMeetingRecord(id: string): Promise<MeetingRecord>
     + Xóa meeting record
     + Cascade delete sẽ tự động xóa audio files (sẽ implement sau)
   
   - addAudioRecording(id: string, audioData: {url: string, filename: string, duration: number, type: 'recorded'|'uploaded'}): Promise<MeetingRecord>
     + Thêm audio recording vào meeting record
     + Parse audioRecordings JSON array
     + Thêm recording mới vào array
     + Save lại
   
   - removeAudioRecording(id: string, audioIndex: number): Promise<MeetingRecord>
     + Xóa một audio recording khỏi meeting record
     + Parse audioRecordings JSON array
     + Remove item tại index
     + Save lại
   
   - updateContent(id: string, content: string): Promise<MeetingRecord>
     + Cập nhật nội dung cuộc họp
   
   - generateMinutes(id: string, template?: string): Promise<MeetingRecord>
     + Tạo biên bản từ nội dung
     + Sử dụng template có sẵn hoặc format chuẩn
     + Update field minutes
     + Set status = 'completed' nếu chưa

3. Xử lý JSON fields (participants, audioRecordings):
   - Khi lưu: JSON.stringify nếu là array
   - Khi đọc: JSON.parse nếu là string
   - Handle errors gracefully

4. Export tất cả functions
```

### Prompt 1.4: Tạo Backend Controller

```
Tôi cần tạo controller layer cho MeetingRecord. Hãy tạo file backend/src/controllers/meetingRecord.controller.ts với:

1. Import Express types, service, và error utilities

2. Implement các handlers:
   - handleGetAllMeetingRecords(req, res)
     + Lấy query params: scheduleId, status, dateFrom, dateTo
     + Gọi service.getAllMeetingRecords với filters
     + Return 200 với data
   
   - handleGetMeetingRecordById(req, res)
     + Lấy id từ params
     + Gọi service.getMeetingRecordById
     + Nếu không tìm thấy, throw AppError 404
     + Return 200 với data
   
   - handleGetMeetingRecordsByScheduleId(req, res)
     + Lấy scheduleId từ params
     + Gọi service.getMeetingRecordsByScheduleId
     + Return 200 với data
   
   - handleCreateMeetingRecord(req, res)
     + Validate req.body (có thể dùng Zod sau)
     + Gọi service.createMeetingRecord
     + Return 201 với data
   
   - handleUpdateMeetingRecord(req, res)
     + Lấy id từ params
     + Validate req.body
     + Gọi service.updateMeetingRecord
     + Return 200 với data
   
   - handleDeleteMeetingRecord(req, res)
     + Lấy id từ params
     + Gọi service.deleteMeetingRecord
     + Return 204 (no content)
   
   - handleAddAudioRecording(req, res)
     + Lấy id từ params
     + Validate req.body (url, filename, duration, type)
     + Gọi service.addAudioRecording
     + Return 200 với data
   
   - handleRemoveAudioRecording(req, res)
     + Lấy id từ params
     + Lấy audioIndex từ body hoặc query
     + Gọi service.removeAudioRecording
     + Return 200 với data
   
   - handleUpdateContent(req, res)
     + Lấy id từ params
     + Lấy content từ body
     + Gọi service.updateContent
     + Return 200 với data
   
   - handleGenerateMinutes(req, res)
     + Lấy id từ params
     + Lấy template từ body (optional)
     + Gọi service.generateMinutes
     + Return 200 với data

3. Sử dụng asyncHandler từ error.middleware để wrap tất cả handlers

4. Export tất cả handlers
```

### Prompt 1.5: Tạo Backend Routes

```
Tôi cần tạo routes cho MeetingRecord API. Hãy tạo file backend/src/routes/meetingRecord.route.ts với:

1. Import Router từ express, controller, và asyncHandler

2. Tạo router:
   const meetingRecordRouter = Router();

3. Định nghĩa routes:
   - GET    /meeting-records              -> handleGetAllMeetingRecords
   - GET    /meeting-records/:id           -> handleGetMeetingRecordById
   - GET    /meeting-records/schedule/:scheduleId -> handleGetMeetingRecordsByScheduleId
   - POST   /meeting-records               -> handleCreateMeetingRecord (cần authenticate)
   - PUT    /meeting-records/:id           -> handleUpdateMeetingRecord (cần authenticate)
   - DELETE /meeting-records/:id           -> handleDeleteMeetingRecord (cần authenticate)
   - POST   /meeting-records/:id/audio     -> handleAddAudioRecording (cần authenticate)
   - DELETE /meeting-records/:id/audio/:audioIndex -> handleRemoveAudioRecording (cần authenticate)
   - PUT    /meeting-records/:id/content    -> handleUpdateContent (cần authenticate)
   - POST   /meeting-records/:id/minutes    -> handleGenerateMinutes (cần authenticate)

4. Apply authentication middleware cho các routes cần thiết (sẽ thêm sau)

5. Export default meetingRecordRouter

6. Sau đó, thêm vào backend/src/routes/index.ts:
   - Import meetingRecordRouter
   - app.use(meetingRecordRouter) hoặc app.use('/api', meetingRecordRouter) tùy cấu hình
```

### Prompt 1.6: Tạo File Upload Utility

```
Tôi cần tạo utility để xử lý file upload cho audio files. Hãy tạo file backend/src/utils/fileUpload.util.ts với:

1. Import multer, path, fs, và các types cần thiết

2. Cấu hình multer:
   - Storage: diskStorage
   - Destination: './uploads/audio' (tạo folder nếu chưa có)
   - Filename: function để generate unique filename
     Format: meeting-{meetingId}-{timestamp}-{originalname}
   - File filter: chỉ chấp nhận audio files
     - MIME types: audio/mpeg, audio/wav, audio/mp4, audio/webm, audio/x-m4a
     - Extensions: .mp3, .wav, .m4a, .webm
   - Limits:
     - fileSize: 100MB (100 * 1024 * 1024)

3. Export:
   - uploadAudio: multer middleware instance
   - validateAudioFile: function để validate file type và size
   - deleteAudioFile: function để xóa file từ filesystem
   - getAudioFilePath: function để lấy đường dẫn file

4. Tạo folder uploads/audio nếu chưa có (có thể dùng fs.mkdirSync với recursive: true)

5. Handle errors gracefully
```

### Prompt 1.7: Tạo File Upload Endpoint

```
Tôi cần tạo endpoint để upload audio file. Hãy:

1. Trong backend/src/controllers/meetingRecord.controller.ts, thêm:
   - handleUploadAudio(req, res)
     + Lấy id từ params
     + Lấy file từ req.file (multer)
     + Validate file
     + Lưu file vào folder uploads/audio
     + Tạo URL để access file (có thể là /api/meeting-records/:id/audio/:filename)
     + Gọi service.addAudioRecording với thông tin file
     + Return 200 với data bao gồm file URL

2. Trong backend/src/routes/meetingRecord.route.ts, thêm:
   - POST /meeting-records/:id/upload-audio
     + Sử dụng uploadAudio middleware
     + Gọi handleUploadAudio

3. Trong backend/src/app.ts, thêm static file serving:
   - app.use('/uploads', express.static('uploads'))
   - Để có thể access file qua URL

4. Test endpoint với Postman hoặc curl
```

### Prompt 1.8: Test Backend API

```
Tôi cần test tất cả backend API endpoints. Hãy:

1. Đảm bảo backend server đang chạy
2. Test các endpoints sau với Postman hoặc curl:

   a) GET /api/meeting-records
      - Test với và không có query params
   
   b) POST /api/meeting-records
      - Body: {scheduleId, title, meetingDate, ...}
      - Test với valid và invalid data
   
   c) GET /api/meeting-records/:id
      - Test với valid và invalid ID
   
   d) PUT /api/meeting-records/:id
      - Test update các fields
   
   e) DELETE /api/meeting-records/:id
   
   f) POST /api/meeting-records/:id/upload-audio
      - Upload file audio
      - Test với valid và invalid files
   
   g) POST /api/meeting-records/:id/minutes
      - Generate minutes

3. Kiểm tra:
   - Status codes đúng
   - Response format đúng
   - Error handling hoạt động
   - File upload/download hoạt động

4. Fix các bugs nếu có
```

---

## 📋 Phase 2: Frontend Core

### Prompt 2.1: Tạo TypeScript Types

```
Tôi cần thêm types cho MeetingRecord vào frontend. Hãy mở src/types/index.ts và thêm:

1. Type MeetingRecord:
   export interface MeetingRecord {
     id: string;
     scheduleId: string;
     schedule?: Schedule; // Optional relation
     title: string;
     meetingDate: Date;
     startTime?: string;
     endTime?: string;
     location?: string;
     leader?: string;
     participants: string[];
     audioRecordings: AudioRecording[];
     content?: string;
     minutes?: string;
     createdBy: string;
     creator?: User; // Optional relation
     status: 'draft' | 'completed' | 'archived';
     notes?: string;
     createdAt: Date;
     updatedAt: Date;
     completedAt?: Date;
   }

2. Type AudioRecording:
   export interface AudioRecording {
     url: string;
     filename: string;
     duration: number; // seconds
     uploadedAt: Date;
     type: 'recorded' | 'uploaded';
   }

3. Type CreateMeetingRecordInput:
   export interface CreateMeetingRecordInput {
     scheduleId: string;
     title: string;
     meetingDate: Date;
     startTime?: string;
     endTime?: string;
     location?: string;
     leader?: string;
     participants?: string[];
   }

4. Type UpdateMeetingRecordInput:
   export interface UpdateMeetingRecordInput {
     title?: string;
     meetingDate?: Date;
     startTime?: string;
     endTime?: string;
     location?: string;
     leader?: string;
     participants?: string[];
     content?: string;
     minutes?: string;
     status?: 'draft' | 'completed' | 'archived';
     notes?: string;
   }
```

### Prompt 2.2: Tạo API Service

```
Tôi cần tạo API service cho MeetingRecord. Hãy tạo file src/services/meetingRecords.api.ts với:

1. Import api từ '@/services/api' và các types

2. Tạo các functions:

   export const meetingRecordsApi = {
     // Lấy tất cả meeting records
     getAll: async (filters?: {
       scheduleId?: string;
       status?: string;
       dateFrom?: string;
       dateTo?: string;
     }): Promise<MeetingRecord[]> => {
       const params = new URLSearchParams();
       if (filters?.scheduleId) params.append('scheduleId', filters.scheduleId);
       if (filters?.status) params.append('status', filters.status);
       if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
       if (filters?.dateTo) params.append('dateTo', filters.dateTo);
       
       const query = params.toString();
       return api.get<MeetingRecord[]>(`/meeting-records${query ? `?${query}` : ''}`);
     },

     // Lấy meeting record theo ID
     getById: async (id: string): Promise<MeetingRecord> => {
       return api.get<MeetingRecord>(`/meeting-records/${id}`);
     },

     // Lấy meeting records theo schedule ID
     getByScheduleId: async (scheduleId: string): Promise<MeetingRecord[]> => {
       return api.get<MeetingRecord[]>(`/meeting-records/schedule/${scheduleId}`);
     },

     // Tạo meeting record mới
     create: async (data: CreateMeetingRecordInput): Promise<MeetingRecord> => {
       return api.post<MeetingRecord>('/meeting-records', data);
     },

     // Cập nhật meeting record
     update: async (id: string, data: UpdateMeetingRecordInput): Promise<MeetingRecord> => {
       return api.put<MeetingRecord>(`/meeting-records/${id}`, data);
     },

     // Xóa meeting record
     delete: async (id: string): Promise<void> => {
       return api.delete(`/meeting-records/${id}`);
     },

     // Upload audio file
     uploadAudio: async (id: string, file: File): Promise<MeetingRecord> => {
       const formData = new FormData();
       formData.append('audio', file);
       
       // Cần custom fetch vì api service hiện tại chỉ support JSON
       const token = localStorage.getItem('tbu_auth_token');
       const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
       
       const response = await fetch(`${API_BASE_URL}/api/meeting-records/${id}/upload-audio`, {
         method: 'POST',
         headers: {
           'Authorization': token ? `Bearer ${token}` : '',
         },
         body: formData,
       });
       
       if (!response.ok) {
         const error = await response.json().catch(() => ({ message: response.statusText }));
         throw new Error(error.message || 'Upload failed');
       }
       
       return response.json();
     },

     // Xóa audio recording
     removeAudio: async (id: string, audioIndex: number): Promise<MeetingRecord> => {
       return api.delete<MeetingRecord>(`/meeting-records/${id}/audio/${audioIndex}`);
     },

     // Cập nhật nội dung
     updateContent: async (id: string, content: string): Promise<MeetingRecord> => {
       return api.put<MeetingRecord>(`/meeting-records/${id}/content`, { content });
     },

     // Tạo biên bản
     generateMinutes: async (id: string, template?: string): Promise<MeetingRecord> => {
       return api.post<MeetingRecord>(`/meeting-records/${id}/minutes`, { template });
     },
   };

3. Export default meetingRecordsApi
```

### Prompt 2.3: Tạo Context

```
Tôi cần tạo Context để quản lý MeetingRecord state. Hãy tạo file src/contexts/MeetingRecordsContext.tsx với:

1. Import React hooks, types, và meetingRecordsApi

2. Tạo interface MeetingRecordsContextType:
   interface MeetingRecordsContextType {
     meetingRecords: MeetingRecord[];
     isLoading: boolean;
     error: string | null;
     fetchMeetingRecords: (filters?: {...}) => Promise<void>;
     getMeetingRecordById: (id: string) => Promise<MeetingRecord | null>;
     createMeetingRecord: (data: CreateMeetingRecordInput) => Promise<MeetingRecord>;
     updateMeetingRecord: (id: string, data: UpdateMeetingRecordInput) => Promise<void>;
     deleteMeetingRecord: (id: string) => Promise<void>;
     uploadAudio: (id: string, file: File) => Promise<void>;
     removeAudio: (id: string, audioIndex: number) => Promise<void>;
     updateContent: (id: string, content: string) => Promise<void>;
     generateMinutes: (id: string, template?: string) => Promise<void>;
   }

3. Tạo Context:
   const MeetingRecordsContext = createContext<MeetingRecordsContextType | undefined>(undefined);

4. Tạo Provider component:
   - State: meetingRecords, isLoading, error
   - Implement tất cả functions từ context type
   - fetchMeetingRecords: gọi API và update state
   - Các functions khác: gọi API, update state, handle errors
   - Sử dụng useCallback cho các functions
   - Sử dụng useToast để hiển thị notifications

5. Tạo custom hook:
   export function useMeetingRecords() {
     const context = useContext(MeetingRecordsContext);
     if (!context) {
       throw new Error('useMeetingRecords must be used within MeetingRecordsProvider');
     }
     return context;
   }

6. Export Provider và hook

7. Thêm Provider vào src/contexts/index.ts
```

### Prompt 2.4: Thêm Provider vào App

```
Tôi cần thêm MeetingRecordsProvider vào App. Hãy:

1. Mở src/App.tsx
2. Import MeetingRecordsProvider từ '@/contexts'
3. Wrap children với MeetingRecordsProvider (sau ScheduleProvider, trước TooltipProvider)
4. Đảm bảo Provider được đặt đúng vị trí trong component tree
```

### Prompt 2.5: Tạo MeetingRecordsPage

```
Tôi cần tạo trang chính để quản lý Meeting Records. Hãy tạo file src/pages/admin/MeetingRecordsPage.tsx với:

1. Import AdminLayout, các components cần thiết, và useMeetingRecords

2. Component structure:
   - Sử dụng AdminLayout với title="Nội dung cuộc họp"
   - Layout 2 cột:
     + Cột trái: Danh sách cuộc họp (MeetingRecordList)
     + Cột phải: Chi tiết cuộc họp (MeetingRecordDetail) hoặc empty state

3. State management:
   - selectedRecordId: string | null
   - filters: { scheduleId?, status?, dateFrom?, dateTo? }

4. Functions:
   - handleSelectRecord: chọn record để xem chi tiết
   - handleCreateNew: tạo record mới
   - handleFilter: filter danh sách

5. useEffect:
   - Fetch meeting records khi component mount
   - Fetch lại khi filters thay đổi

6. Render:
   - Header với title và nút "Tạo mới"
   - 2 cột layout (responsive: stack trên mobile)
   - Loading state
   - Error state
```

### Prompt 2.6: Tạo MeetingRecordList Component

```
Tôi cần tạo component hiển thị danh sách cuộc họp. Hãy tạo file src/components/meeting/MeetingRecordList.tsx với:

1. Props:
   interface MeetingRecordListProps {
     records: MeetingRecord[];
     selectedId?: string;
     onSelectRecord: (id: string) => void;
     filters?: {...};
     onFilterChange?: (filters: {...}) => void;
   }

2. Features:
   - Hiển thị danh sách records dạng cards hoặc table
   - Mỗi item hiển thị:
     + Title
     + Meeting date
     + Location
     + Status badge
     + Number of audio recordings
     + Last updated
   - Click vào item để select
   - Highlight selected item
   - Search box (filter by title)
   - Filter dropdown (by status, date range)
   - Empty state khi không có records
   - Loading skeleton

3. Styling:
   - Sử dụng shadcn/ui components
   - Responsive design
   - Hover effects
   - Active state cho selected item

4. Export component
```

### Prompt 2.7: Tạo MeetingRecordDetail Component

```
Tôi cần tạo component hiển thị chi tiết cuộc họp. Hãy tạo file src/components/meeting/MeetingRecordDetail.tsx với:

1. Props:
   interface MeetingRecordDetailProps {
     recordId: string;
     onClose?: () => void;
   }

2. Features:
   - Fetch record data khi mount
   - Hiển thị thông tin cuộc họp:
     + Title (editable)
     + Meeting date, time
     + Location
     + Leader
     + Participants
     + Status
   - Tabs hoặc sections:
     + Tab 1: Audio Recordings
       - List audio files
       - Audio player cho mỗi file
       - Upload button
       - Record button
     + Tab 2: Nội dung cuộc họp
       - Rich text editor
       - Auto-save
     + Tab 3: Biên bản
       - Display minutes
       - Generate button
   - Action buttons:
     + Save
     + Delete
     + Close

3. State:
   - record: MeetingRecord | null
   - isLoading: boolean
   - isEditing: boolean
   - activeTab: 'audio' | 'content' | 'minutes'

4. Functions:
   - handleSave: save changes
   - handleDelete: delete record
   - handleTabChange: switch tabs

5. Styling:
   - Card layout
   - Tabs component
   - Form inputs
   - Buttons

6. Export component
```

### Prompt 2.8: Thêm Route và Sidebar Item

```
Tôi cần thêm route và sidebar item cho Meeting Records. Hãy:

1. Mở src/App.tsx:
   - Import MeetingRecordsPage
   - Thêm route: <Route path="/quan-tri/noi-dung-cuoc-hop" element={<MeetingRecordsPage />} />

2. Mở src/components/admin/AdminLayout.tsx:
   - Import icon: Mic hoặc FileText hoặc Users
   - Thêm vào sidebarItems array:
     { icon: Mic, label: 'Nội dung cuộc họp', href: '/quan-tri/noi-dung-cuoc-hop' }
   - Đặt sau "Quản lý lịch" và trước "Tin tức"

3. Test navigation:
   - Click vào sidebar item
   - Kiểm tra route hoạt động
   - Kiểm tra page render đúng
```

---

## 📋 Phase 3: Audio Features

### Prompt 3.1: Tạo AudioRecorder Component

```
Tôi cần tạo component để ghi âm trực tiếp. Hãy tạo file src/components/meeting/AudioRecorder.tsx với:

1. Props:
   interface AudioRecorderProps {
     onRecordingComplete: (audioBlob: Blob, duration: number) => void;
     maxDuration?: number; // minutes
   }

2. State:
   - isRecording: boolean
   - recordingTime: number (seconds)
   - mediaRecorder: MediaRecorder | null
   - audioChunks: Blob[]
   - error: string | null

3. Functions:
   - startRecording: async
     + Request microphone permission
     + Get user media (audio only)
     + Create MediaRecorder với mimeType: 'audio/webm' hoặc 'audio/mp4'
     + Start recording
     + Update state
   
   - stopRecording: async
     + Stop MediaRecorder
     + Collect all chunks
     + Create Blob từ chunks
     + Call onRecordingComplete với blob và duration
     + Reset state
   
   - pauseRecording / resumeRecording (optional)
   
   - formatTime: format seconds thành MM:SS

4. UI:
   - Record button (red circle khi recording)
   - Stop button
   - Timer display
   - Waveform visualization (optional, có thể dùng thư viện)
   - Error message
   - Permission request UI

5. useEffect:
   - Cleanup: stop recording khi unmount
   - Timer: update recordingTime mỗi giây khi recording

6. Handle errors:
   - Microphone permission denied
   - MediaRecorder not supported
   - Other errors

7. Styling:
   - Large record button
   - Visual feedback khi recording
   - Responsive

8. Export component
```

### Prompt 3.2: Tạo AudioUploader Component

```
Tôi cần tạo component để upload file audio. Hãy tạo file src/components/meeting/AudioUploader.tsx với:

1. Props:
   interface AudioUploaderProps {
     onUploadComplete: (file: File) => void;
     maxSize?: number; // bytes, default 100MB
     acceptedFormats?: string[]; // default: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm']
   }

2. State:
   - isDragging: boolean
   - uploadProgress: number (0-100)
   - error: string | null
   - selectedFile: File | null

3. Functions:
   - handleFileSelect: (file: File) => void
     + Validate file type
     + Validate file size
     + Set selectedFile
   
   - handleDrop: (e: DragEvent) => void
     + Prevent default
     + Get files from dataTransfer
     + Handle first file
   
   - handleDragOver: (e: DragEvent) => void
     + Prevent default
     + Set isDragging = true
   
   - handleDragLeave: () => void
     + Set isDragging = false
   
   - handleUpload: async () => void
     + Call onUploadComplete với file
     + Reset state

4. UI:
   - Drop zone (large area)
   - Drag & drop indicator
   - File input (hidden)
   - Browse button
   - Selected file info (name, size)
   - Upload button
   - Progress bar (nếu upload trực tiếp)
   - Error message
   - Format hints

5. Validation:
   - File type: chỉ audio files
   - File size: max 100MB
   - Show clear error messages

6. Styling:
   - Large drop zone
   - Visual feedback khi dragging
   - File info display
   - Responsive

7. Export component
```

### Prompt 3.3: Tạo AudioPlayer Component

```
Tôi cần tạo component để phát lại audio. Hãy tạo file src/components/meeting/AudioPlayer.tsx với:

1. Props:
   interface AudioPlayerProps {
     src: string; // URL của audio file
     title?: string;
     filename?: string;
     onDelete?: () => void;
     onDownload?: () => void;
   }

2. State:
   - isPlaying: boolean
   - currentTime: number (seconds)
   - duration: number (seconds)
   - volume: number (0-1)
   - playbackRate: number (0.5, 1, 1.5, 2)
   - isLoading: boolean
   - error: string | null

3. Refs:
   - audioRef: useRef<HTMLAudioElement>(null)

4. Functions:
   - togglePlay: () => void
     + Play/pause audio
   
   - handleTimeUpdate: () => void
     + Update currentTime từ audio element
   
   - handleSeek: (time: number) => void
     + Set audio currentTime
   
   - handleVolumeChange: (volume: number) => void
     + Set audio volume
   
   - handlePlaybackRateChange: (rate: number) => void
     + Set audio playbackRate
   
   - formatTime: (seconds: number) => string
     + Format thành MM:SS hoặc HH:MM:SS
   
   - handleDownload: () => void
     + Download file từ URL

5. UI:
   - Play/Pause button
   - Seek bar (slider)
   - Current time / Total time
   - Volume control (slider)
   - Playback speed selector (dropdown)
   - Download button
   - Delete button (nếu có onDelete)
   - Loading indicator
   - Error message
   - Waveform visualization (optional)

6. useEffect:
   - Load audio metadata khi src thay đổi
   - Update duration
   - Cleanup: pause audio khi unmount

7. Styling:
   - Modern audio player design
   - Large controls
   - Responsive
   - Accessible (keyboard navigation)

8. Export component
```

### Prompt 3.4: Tích hợp Audio Components vào Detail Page

```
Tôi cần tích hợp các audio components vào MeetingRecordDetail. Hãy:

1. Mở src/components/meeting/MeetingRecordDetail.tsx

2. Trong tab "Audio Recordings":
   - Import AudioRecorder, AudioUploader, AudioPlayer
   - State: showRecorder, showUploader
   
   - Hiển thị:
     + List các audio recordings từ record.audioRecordings
     + Mỗi item có:
       - AudioPlayer component
       - Delete button
       - File info (filename, duration, type, uploadedAt)
     + "Ghi âm" button -> mở AudioRecorder dialog
     + "Upload file" button -> mở AudioUploader dialog
   
   - Functions:
     + handleRecordingComplete: (blob, duration) => void
       - Upload blob lên server
       - Call API uploadAudio
       - Refresh record data
     
     + handleUploadComplete: (file) => void
       - Call API uploadAudio với file
       - Refresh record data
     
     + handleDeleteAudio: (index) => void
       - Call API removeAudio
       - Refresh record data

3. Dialogs:
   - Dialog cho AudioRecorder
   - Dialog cho AudioUploader
   - Sử dụng Dialog component từ shadcn/ui

4. Test:
   - Record audio
   - Upload file
   - Play audio
   - Delete audio
```

---

## 📋 Phase 4: Content Editor

### Prompt 4.1: Cài đặt Rich Text Editor

```
Tôi cần cài đặt Tiptap editor. Hãy:

1. Install packages:
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder

2. (Optional) Install more extensions:
   npm install @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table

3. Verify installation:
   - Check package.json
   - Check node_modules
```

### Prompt 4.2: Tạo MeetingContentEditor Component

```
Tôi cần tạo rich text editor component. Hãy tạo file src/components/meeting/MeetingContentEditor.tsx với:

1. Props:
   interface MeetingContentEditorProps {
     value: string; // HTML content
     onChange: (content: string) => void;
     placeholder?: string;
     autoSave?: boolean;
     onAutoSave?: (content: string) => void;
     autoSaveInterval?: number; // milliseconds, default 30000
   }

2. State:
   - editor: Editor | null
   - isSaving: boolean
   - lastSaved: Date | null
   - wordCount: number

3. Setup Tiptap Editor:
   - Import useEditor từ @tiptap/react
   - Import StarterKit
   - Configure extensions:
     + StarterKit (bold, italic, heading, list, etc.)
     + Placeholder
     + (Optional) Link, Image, Table
   
   - Editor config:
     + content: value
     + onUpdate: call onChange với HTML
     + editable: true
     + placeholder

4. Toolbar:
   - Bold, Italic, Underline
   - Heading 1, 2, 3
   - Bullet list, Numbered list
   - Blockquote
   - Code block
   - Link (nếu có extension)
   - Undo, Redo
   - (Optional) More formatting options

5. Functions:
   - handleAutoSave: () => void
     + Nếu autoSave enabled và content changed
     + Call onAutoSave
     + Update lastSaved
     + Show save indicator

6. UI:
   - Toolbar (fixed hoặc floating)
   - Editor content area
   - Word count display
   - Save indicator ("Đã lưu" hoặc "Đang lưu...")
   - Character count (optional)

7. useEffect:
   - Auto-save timer (nếu enabled)
   - Update editor content khi value prop thay đổi
   - Cleanup timer

8. Styling:
   - Modern editor design
   - Focus states
   - Placeholder styling
   - Responsive toolbar

9. Export component
```

### Prompt 4.3: Tích hợp Editor vào Detail Page

```
Tôi cần tích hợp editor vào MeetingRecordDetail. Hãy:

1. Mở src/components/meeting/MeetingRecordDetail.tsx

2. Trong tab "Nội dung cuộc họp":
   - Import MeetingContentEditor
   - State: content, isSavingContent
   
   - Hiển thị:
     + MeetingContentEditor với:
       - value: record.content || ''
       - onChange: update local state
       - autoSave: true
       - onAutoSave: call API updateContent
       - placeholder: "Ghi lại nội dung cuộc họp..."
   
   - Functions:
     + handleContentChange: (content) => void
       - Update local state
       - (Auto-save sẽ handle save)
     
     + handleManualSave: async () => void
       - Call API updateContent
       - Show toast notification
       - Update record

3. UI:
   - Editor full width
   - Save button (manual save, optional)
   - Auto-save indicator
   - Word count

4. Test:
   - Type content
   - Check auto-save works
   - Check content persists
   - Check formatting works
```

---

## 📋 Phase 5: Minutes Generator

### Prompt 5.1: Tạo Minutes Template

```
Tôi cần tạo template cho biên bản cuộc họp. Hãy tạo file src/utils/meetingMinutesTemplate.ts với:

1. Function generateMinutesTemplate:
   export function generateMinutesTemplate(
     content: string,
     meetingInfo: {
       title: string;
       date: Date;
       location?: string;
       leader?: string;
       participants?: string[];
     }
   ): string {
     // Format biên bản theo template chuẩn
     // Include:
     // - Header: Tiêu đề, ngày, địa điểm
     // - Thành phần tham dự
     // - Nội dung cuộc họp (từ content)
     // - Footer: Người ghi biên bản, chữ ký
     
     return formattedMinutes;
   }

2. Template structure:
   ```
   BIÊN BẢN CUỘC HỌP
   
   Tên cuộc họp: [title]
   Thời gian: [date] [time]
   Địa điểm: [location]
   
   Thành phần tham dự:
   - [participants list]
   
   NỘI DUNG CUỘC HỌP:
   [formatted content]
   
   Người ghi biên bản: [creator name]
   Ngày ghi: [current date]
   ```

3. Format content:
   - Parse HTML từ content
   - Convert thành plain text hoặc formatted text
   - Preserve structure (headings, lists)

4. Export function
```

### Prompt 5.2: Tạo MeetingMinutesGenerator Component

```
Tôi cần tạo component để generate biên bản. Hãy tạo file src/components/meeting/MeetingMinutesGenerator.tsx với:

1. Props:
   interface MeetingMinutesGeneratorProps {
     record: MeetingRecord;
     onGenerate: (minutes: string) => void;
   }

2. State:
   - generatedMinutes: string
   - isGenerating: boolean
   - template: string (có thể cho user chọn template)

3. Functions:
   - handleGenerate: async () => void
     + Set isGenerating = true
     + Call API generateMinutes hoặc generate locally
     + Set generatedMinutes
     + Call onGenerate
     + Set isGenerating = false
   
   - handleRegenerate: () => void
     + Generate lại với template khác (nếu có)
   
   - handleSave: () => void
     + Call onGenerate với generatedMinutes

4. UI:
   - Preview area (read-only editor hoặc formatted display)
   - "Tạo biên bản" button
   - "Tạo lại" button (nếu đã generate)
   - "Lưu" button
   - Template selector (nếu có nhiều templates)
   - Loading state
   - Error message

5. Preview:
   - Hiển thị formatted minutes
   - Có thể edit trước khi save (optional)
   - Word count

6. Styling:
   - Clean preview area
   - Formatted text display
   - Action buttons

7. Export component
```

### Prompt 5.3: Tích hợp Generator vào Detail Page

```
Tôi cần tích hợp generator vào MeetingRecordDetail. Hãy:

1. Mở src/components/meeting/MeetingRecordDetail.tsx

2. Trong tab "Biên bản":
   - Import MeetingMinutesGenerator
   - State: minutes
   
   - Hiển thị:
     + Nếu chưa có minutes:
       - MeetingMinutesGenerator component
       - "Tạo biên bản" button
     + Nếu đã có minutes:
       - Display minutes (formatted)
       - "Chỉnh sửa" button (optional)
       - "Tạo lại" button
   
   - Functions:
     + handleGenerateMinutes: async (minutes) => void
       - Call API generateMinutes
       - Update record
       - Show toast
     
     + handleRegenerate: () => void
       - Clear current minutes
       - Show generator again

3. UI:
   - Tab content area
   - Generator component
   - Preview/Display area
   - Action buttons

4. Test:
   - Generate minutes
   - Check format
   - Save minutes
   - Regenerate
```

### Prompt 5.4: (Optional) Tích hợp AI API

```
Nếu muốn dùng AI để generate biên bản tốt hơn, hãy:

1. Tạo file src/services/aiService.ts:
   - Function callAIAPI(prompt: string): Promise<string>
   - Sử dụng OpenAI API hoặc local LLM
   - Handle errors

2. Update MeetingMinutesGenerator:
   - Option để chọn: Template-based hoặc AI-based
   - Nếu AI: call AI service với content
   - Format response

3. Backend:
   - Tạo endpoint /api/meeting-records/:id/generate-minutes-ai
   - Integrate với AI service
   - Return formatted minutes

4. Test AI generation
```

---

## 📋 Phase 6: Polish & Testing

### Prompt 6.1: UI/UX Improvements

```
Tôi cần cải thiện UI/UX. Hãy:

1. Review tất cả components:
   - Consistent spacing
   - Consistent colors
   - Consistent typography
   - Consistent button styles
   - Consistent form styles

2. Add loading states:
   - Skeleton loaders
   - Spinners
   - Progress indicators

3. Add empty states:
   - No records
   - No audio files
   - No content

4. Add error states:
   - Error messages
   - Retry buttons
   - Error boundaries

5. Add success states:
   - Toast notifications
   - Success messages
   - Confirmation dialogs

6. Improve accessibility:
   - ARIA labels
   - Keyboard navigation
   - Focus management
   - Screen reader support

7. Responsive design:
   - Mobile layout
   - Tablet layout
   - Desktop layout
   - Test trên các screen sizes
```

### Prompt 6.2: Error Handling

```
Tôi cần cải thiện error handling. Hãy:

1. Review tất cả API calls:
   - Try-catch blocks
   - Error messages
   - User-friendly error messages
   - Error logging

2. Add error boundaries:
   - React Error Boundary cho main components
   - Fallback UI

3. Validation:
   - Form validation
   - File validation
   - Data validation

4. Network errors:
   - Handle offline
   - Handle timeout
   - Handle server errors

5. User feedback:
   - Show errors clearly
   - Provide retry options
   - Log errors for debugging
```

### Prompt 6.3: Performance Optimization

```
Tôi cần optimize performance. Hãy:

1. Code splitting:
   - Lazy load components
   - Lazy load routes
   - Dynamic imports

2. Memoization:
   - useMemo cho expensive calculations
   - useCallback cho functions
   - React.memo cho components

3. Data fetching:
   - Optimistic updates
   - Cache management
   - Debounce search/filter

4. File handling:
   - Compress audio files
   - Lazy load audio files
   - Progressive loading

5. Bundle size:
   - Check bundle size
   - Remove unused dependencies
   - Optimize imports
```

### Prompt 6.4: Final Testing

```
Tôi cần test toàn bộ tính năng. Hãy:

1. Test các flows chính:
   - Tạo meeting record
   - Ghi âm
   - Upload audio
   - Nghe audio
   - Ghi nội dung
   - Tạo biên bản
   - Edit/Delete

2. Test edge cases:
   - Empty states
   - Error states
   - Large files
   - Long recordings
   - Special characters
   - Unicode

3. Test trên browsers:
   - Chrome
   - Firefox
   - Safari
   - Edge

4. Test responsive:
   - Mobile
   - Tablet
   - Desktop

5. Test performance:
   - Load time
   - Interaction response
   - Memory usage

6. Fix bugs:
   - Document bugs
   - Fix bugs
   - Re-test

7. User acceptance testing:
   - Get feedback
   - Make improvements
```

### Prompt 6.5: Documentation

```
Tôi cần tạo documentation. Hãy:

1. Code documentation:
   - JSDoc comments
   - Type definitions
   - Component props

2. User guide:
   - How to use features
   - Screenshots
   - Step-by-step instructions

3. Developer guide:
   - Architecture
   - API documentation
   - Component structure

4. Update README:
   - New features
   - Setup instructions
   - Usage examples
```

---

## 📝 Notes

- Mỗi prompt có thể được sử dụng độc lập
- Có thể điều chỉnh prompts theo nhu cầu cụ thể
- Test sau mỗi phase trước khi chuyển sang phase tiếp theo
- Commit code sau mỗi phase hoàn thành

