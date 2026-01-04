
import { Router } from 'express';
import * as meetingRecordController from '../controllers/meetingRecord.controller';
import { uploadAudio } from '../utils/fileUpload.util';
// import { authenticate } from '../middleware/auth.middleware'; // Will be added later

const meetingRecordRouter = Router();

// ... (existing routes)

// Route for uploading a single audio file
meetingRecordRouter.post(
    '/meeting-records/:id/upload-audio',
    // authenticate, // This route should be protected
    uploadAudio.single('audioFile'), // 'audioFile' is the name of the form field
    meetingRecordController.handleUploadAudio
);

// Public routes
meetingRecordRouter.get('/meeting-records', meetingRecordController.handleGetAllMeetingRecords);
meetingRecordRouter.get('/meeting-records/:id', meetingRecordController.handleGetMeetingRecordById);
meetingRecordRouter.get('/meeting-records/schedule/:scheduleId', meetingRecordController.handleGetMeetingRecordsByScheduleId);

// Authenticated routes
meetingRecordRouter.post(
    '/meeting-records', 
    // authenticate, 
    meetingRecordController.handleCreateMeetingRecord
);

meetingRecordRouter.put(
    '/meeting-records/:id', 
    // authenticate, 
    meetingRecordController.handleUpdateMeetingRecord
);

meetingRecordRouter.delete(
    '/meeting-records/:id', 
    // authenticate, 
    meetingRecordController.handleDeleteMeetingRecord
);

meetingRecordRouter.post(
    '/meeting-records/:id/audio', 
    // authenticate, 
    meetingRecordController.handleAddAudioRecording
);

meetingRecordRouter.delete(
    '/meeting-records/:id/audio/:audioIndex', 
    // authenticate, 
    meetingRecordController.handleRemoveAudioRecording
);

meetingRecordRouter.put(
    '/meeting-records/:id/content', 
    // authenticate, 
    meetingRecordController.handleUpdateContent
);

meetingRecordRouter.post(
    '/meeting-records/:id/minutes', 
    // authenticate, 
    meetingRecordController.handleGenerateMinutes
);

export default meetingRecordRouter;
