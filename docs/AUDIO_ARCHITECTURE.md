# Audio Upload and Transcription Architecture

## Overview
This document describes the correct architecture for audio upload and transcription in the TBU Schedule Management System.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
    ┌───────────────┐    ┌───────────────────┐    ┌────────────────────┐
    │ AudioUploader  │    │  AudioRecorder   │    │AudioToTextConverter│
    └───────────────┘    └───────────────────┘    └────────────────────┘
            │                       │                       │
            │ (File selection only)   │ (Recording)            │ (Convert)
            │                       │                       │
            ▼                       ▼                       ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │              MeetingRecordDetail (Parent Component)                │
    └─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌─────────────────────────┐
        │ meetingRecords.api.ts │       │ audioToText.service.ts│
        └───────────────────────┘       └─────────────────────────┘
                    │                               │
                    │                               │
                    ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js/Express)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌───────────────────┐   ┌───────────────────┐
        │meetingRecord.route │   │audioToText.route │
        └───────────────────┘   └───────────────────┘
                    │               │
                    ▼               ▼
        ┌───────────────────┐   ┌───────────────────┐
        │meetingRecord.    │   │audioToText.      │
        │controller.ts     │   │controller.ts     │
        └───────────────────┘   └───────────────────┘
                    │               │
                    ▼               │
        ┌───────────────────┐   │
        │meetingRecord.    │   │
        │service.ts       │   │
        └───────────────────┘   │
                    │           │
                    │           │ (Transcription)
                    │           │
                    ▼           ▼
        ┌───────────────────────────────┐
        │    Python Service (FastAPI)    │
        │    (python_service/main.py)    │
        └───────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │  PhoWhisper (AI Model)     │
        └───────────────────────────────┘
```

## Workflows

### 1. Audio Upload Workflow

**Steps:**
1. User opens MeetingRecordDetail
2. User clicks "Ghi âm trực tiếp" (Record) or "Tải file lên" (Upload)
3. **AudioRecorder** or **AudioUploader** component is shown in a dialog
4. User records audio or selects a file
5. Component returns the file to **MeetingRecordDetail**
6. MeetingRecordDetail calls `meetingRecordsApi.uploadAudio(id, file)`
7. Frontend sends POST to `/api/meeting-records/:id/upload-audio`
8. Backend saves file via Multer to `uploads/audio/`
9. Backend updates meeting record in database with new audio URL

**Endpoints:**
- Frontend: `meetingRecordsApi.uploadAudio(id, file)`
- Backend Route: `POST /api/meeting-records/:id/upload-audio`
- Backend Controller: `handleUploadAudio`
- Backend Service: `addAudioRecording`

**Request:**
```
POST /api/meeting-records/:id/upload-audio
Content-Type: multipart/form-data
Authorization: Bearer <token>

audioFile: <File>
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "record": { ... },
  "fileUrl": "/uploads/audio/filename.mp3"
}
```

### 2. Audio Transcription Workflow (Meeting Record Context)

**Steps:**
1. User views a meeting record with audio files
2. User clicks "Chuyển văn bản (AI)" button on an audio file
3. **MeetingRecordDetail** calls `handleConvertAudioToText(audioUrl, filename)`
4. Audio file is downloaded from backend
5. **AudioToTextConverter** dialog opens
6. User clicks "Chuyển đổi" (Convert)
7. Component calls `audioToText.service.convertAudioToText(audioFile)`
8. Frontend sends POST to `/api/audio-to-text/convert`
9. Backend forwards file to Python service `/transcribe`
10. Python service uses PhoWhisper to transcribe
11. Text is returned to backend, then to frontend
12. User can edit the text
13. User clicks "Sử dụng văn bản này"
14. Text is appended to meeting record content

**Endpoints:**
- Frontend: `audioToText.service.convertAudioToText(audioFile)`
- Backend Route: `POST /api/audio-to-text/convert`
- Backend Controller: `handleConvertAudioToText`
- Backend Service: `transcribeAudioFile` → calls Python `/transcribe`

**Request:**
```
POST /api/audio-to-text/convert
Content-Type: multipart/form-data
Authorization: Bearer <token>

audioFile: <File>
language: vi
```

**Response:**
```json
{
  "success": true,
  "text": "Transcribed text...",
  "language": "vi",
  "processingTime": 12.5,
  "confidence": 0.95
}
```

### 3. Direct Transcription Workflow (Alternative)

**Steps:**
1. Audio is already uploaded to a meeting record
2. User wants to transcribe directly without downloading
3. Frontend can call `meetingRecordsApi.transcribeAudio(id, audioIndex)`
4. Backend retrieves the audio file path
5. Backend calls Python service to transcribe
6. Backend updates meeting record content with transcribed text

**Endpoints:**
- Frontend: `meetingRecordsApi.transcribeAudio(id, audioIndex)`
- Backend Route: `POST /api/meeting-records/:id/audio/:audioIndex/transcribe`
- Backend Controller: `handleTranscribeAudio`
- Backend Service: `transcribeAudio`

## Key Components and Services

### Frontend Components

#### AudioUploader (`src/components/meeting/AudioUploader.tsx`)
**Purpose:** File selection and validation only
**Behavior:**
- Does NOT upload files itself
- Validates file type and size
- Returns selected file to parent component
- Parent (MeetingRecordDetail) handles actual upload

**Props:**
```typescript
interface AudioUploaderProps {
  onFileSelected: (file: File) => void; // Returns file to parent
  maxSize?: number; // Default: 500MB
  acceptedFormats?: string[]; // Audio MIME types
  disabled?: boolean;
}
```

**Usage:**
```tsx
<AudioUploader
  onFileSelected={handleFileSelected}
  maxSize={500 * 1024 * 1024}
/>
```

#### AudioRecorder (`src/components/meeting/AudioRecorder.tsx`)
**Purpose:** Record audio directly in browser
**Behavior:**
- Records audio using MediaRecorder API
- Uploads the recording via `useAudioUpload` hook
- Returns audio blob to parent

**Props:**
```typescript
interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
}
```

#### AudioToTextConverter (`src/components/meeting/AudioToTextConverter.tsx`)
**Purpose:** Convert audio file to text
**Behavior:**
- Takes audio file as input
- Calls `audioToText.service.convertAudioToText()`
- Displays transcribed text for editing
- Allows user to accept or cancel

**Props:**
```typescript
interface AudioToTextConverterProps {
  audioFile: File;
  onTextExtracted: (text: string) => void;
  onClose: () => void;
  isOpen: boolean;
}
```

#### MeetingRecordDetail (`src/components/meeting/MeetingRecordDetail.tsx`)
**Purpose:** Display and manage meeting record details
**Behavior:**
- Parent for AudioUploader, AudioRecorder, AudioToTextConverter
- Handles all upload operations via `meetingRecordsApi`
- Manages meeting record state
- Handles transcription text extraction

### Frontend Services

#### meetingRecords.api.ts (`src/services/meetingRecords.api.ts`)
**Key Methods:**
```typescript
uploadAudio(id: string, file: File, options: UploadOptions): Promise<MeetingRecord>
  - Upload audio file to meeting record
  - POST /api/meeting-records/:id/upload-audio

transcribeAudio(id: string, audioIndex: number): Promise<MeetingRecord>
  - Transcribe audio at index
  - POST /api/meeting-records/:id/audio/:audioIndex/transcribe

updateContent(id: string, content: string): Promise<MeetingRecord>
  - Update meeting record content
  - PUT /api/meeting-records/:id/content
```

#### audioToText.service.ts (`src/services/audioToText.service.ts`)
**Key Methods:**
```typescript
convertAudioToText(request: AudioToTextRequest): Promise<AudioToTextResponse>
  - Direct audio-to-text conversion
  - POST /api/audio-to-text/convert
  - Uses PhoWhisper via Python service
```

#### useAudioUpload Hook (`src/hooks/useAudioUpload.ts`)
**Purpose:** Custom hook for file uploads
**Features:**
- Retry logic
- Timeout handling
- Progress tracking
- Cancel support

**Usage:**
```typescript
const { uploadFile, progress, cancelUpload } = useAudioUpload({
  maxRetries: 3,
  timeout: 60000
});

const result = await uploadFile(url, file);
```

### Backend Routes

#### meetingRecord.route.ts (`backend/src/routes/meetingRecord.route.ts`)
**Protected Routes (require authentication):**
```typescript
POST   /api/meeting-records/:id/upload-audio           // Upload audio
DELETE /api/meeting-records/:id/audio/:audioIndex     // Remove audio
POST   /api/meeting-records/:id/audio/:audioIndex/transcribe  // Transcribe
PUT    /api/meeting-records/:id/content               // Update content
POST   /api/meeting-records/:id/minutes              // Generate minutes
```

#### audioToText.route.ts (`backend/src/routes/audioToText.route.ts`)
**Protected Routes:**
```typescript
POST /api/audio-to-text/convert  // Direct audio-to-text conversion
```

### Backend Controllers

#### meetingRecord.controller.ts
**Key Handlers:**
```typescript
handleUploadAudio(req, res): Upload audio file to meeting record
handleTranscribeAudio(req, res): Transcribe specific audio recording
handleUpdateContent(req, res): Update meeting record content
handleRemoveAudioRecording(req, res): Delete audio recording
```

#### audioToText.controller.ts
**Key Handlers:**
```typescript
handleConvertAudioToText(req, res): Convert audio to text using PhoWhisper
  - Validates uploaded file
  - Calls speechToText.service
  - Returns transcribed text
```

### Backend Services

#### meetingRecord.service.ts
**Key Methods:**
```typescript
addAudioRecording(id, audioData): Add audio to meeting record
removeAudioRecording(id, audioIndex): Delete audio from meeting record
transcribeAudio(id, audioIndex): Transcribe audio file
updateContent(id, content): Update meeting record content
```

#### speechToText.service.ts
**Key Methods:**
```typescript
transcribeAudioFile(filePath, options): Transcribe using Python PhoWhisper service
  - File: Backend uploads to Python service
  - Returns: Transcribed text with metadata
```

### Python Service (AI)

#### python_service/main.py
**Endpoints:**
```python
POST /transcribe
  - Accepts audio file
  - Returns: Transcribed text
  - Supports chunking for long files
  - Uses: vinai/PhoWhisper-small model

GET  /
  - Health check

GET  /model-status
  - Check if model is loaded
```

**Key Features:**
- Automatic audio chunking for files > 30 minutes
- Audio quality detection
- Progress tracking
- Chunk overlap to prevent missing content

## Configuration

### Environment Variables

**Frontend (.env):**
```env
VITE_API_BASE_URL=http://localhost:8000
```

**Backend (.env):**
```env
NODE_ENV=development
PORT=8000
DATABASE_URL="sqlserver://..."
JWT_SECRET=your-secret
PYTHON_AI_SERVICE_URL=http://localhost:8001
```

### File Upload Settings

**Backend Multer Config (`fileUpload.util.ts`):**
```typescript
uploadAudio: multer({
  dest: 'uploads/audio/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: Audio-only files
})
```

**Frontend Validation:**
```typescript
maxSize: 500 * 1024 * 1024  // 500MB
acceptedFormats: ['audio/mpeg', 'audio/wav', 'audio/mp4', ...]
```

## Authentication

All audio-related routes require authentication:
- `POST /api/meeting-records/:id/upload-audio`
- `DELETE /api/meeting-records/:id/audio/:audioIndex`
- `POST /api/meeting-records/:id/audio/:audioIndex/transcribe`
- `POST /api/audio-to-text/convert`

Authentication middleware (`auth.middleware.ts`) validates JWT tokens and attaches user to request.

## Error Handling

### Frontend Errors
- File validation errors (size, type)
- Network errors during upload
- Timeout errors
- Transcription errors

### Backend Errors
- Multer upload errors (file too large, wrong format)
- AppError with codes:
  - `FILE_TOO_LARGE`: File exceeds 500MB
  - `NO_FILE_UPLOADED`: No file in request
  - `TRANSCRIPTION_ERROR`: Python service error
  - `TIMEOUT_ERROR`: Transcription timeout
  - `INVALID_AUDIO_INDEX`: Bad audio index

## Security Considerations

1. **Authentication:** All audio routes require JWT authentication
2. **File Size Limits:** Max 500MB to prevent DoS attacks
3. **Rate Limiting:** Audio-to-text conversion has rate limiter
4. **File Type Validation:** Only audio files allowed
5. **File Access:** Uploads directory served as static, but files validated

## Troubleshooting

### Upload Fails
1. Check file size (max 500MB)
2. Check file type (audio only)
3. Check authentication token
4. Check backend is running on correct port
5. Check uploads directory exists and is writable

### Transcription Fails
1. Check Python service is running (port 8001)
2. Check PhoWhisper model is loaded
3. Check audio quality (not too quiet/clipped)
4. Check file format is supported
5. Check timeout settings (10 minutes)

### No Audio Playback
1. Check audio file path in database
2. Check uploads directory is served as static
3. Check file exists on disk
4. Check browser audio format support

## Related Files

### Frontend
- `src/components/meeting/AudioUploader.tsx`
- `src/components/meeting/AudioRecorder.tsx`
- `src/components/meeting/AudioToTextConverter.tsx`
- `src/components/meeting/MeetingRecordDetail.tsx`
- `src/services/meetingRecords.api.ts`
- `src/services/audioToText.service.ts`
- `src/hooks/useAudioUpload.ts`

### Backend
- `backend/src/routes/meetingRecord.route.ts`
- `backend/src/routes/audioToText.route.ts`
- `backend/src/controllers/meetingRecord.controller.ts`
- `backend/src/controllers/audioToText.controller.ts`
- `backend/src/services/meetingRecord.service.ts`
- `backend/src/services/speechToText.service.ts`
- `backend/src/utils/fileUpload.util.ts`
- `backend/src/middleware/auth.middleware.ts`

### Python Service
- `python_service/main.py`
- `python_service/audio_segmentation.py`

## Summary

The audio upload and transcription system follows a clean separation of concerns:

1. **Upload:** Separate from transcription, handled by meeting records API
2. **Transcription:** Can be done standalone or via meeting record context
3. **Authentication:** All routes protected with JWT
4. **Error Handling:** Comprehensive error handling at all layers
5. **Python Service:** Self-contained AI service for transcription

This architecture allows for flexibility - users can upload audio first and transcribe later, or upload and immediately convert to text.
