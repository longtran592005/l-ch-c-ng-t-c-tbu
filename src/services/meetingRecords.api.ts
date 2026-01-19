import { api } from '@/services/api';
import {
  MeetingRecord,
  CreateMeetingRecordInput,
  UpdateMeetingRecordInput,
} from '@/types';

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
    // Backend expects 'audioFile' field name
    formData.append('audioFile', file);

    const token = localStorage.getItem('tbu_auth_token');
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    console.log('Uploading audio file:', file.name, 'to meeting record:', id);

    const response = await fetch(`${API_BASE_URL}/meeting-records/${id}/upload-audio`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        // Don't set Content-Type header - let browser set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error?.message || response.statusText;
        console.error('Upload error:', errorData);
      } catch {
        errorMessage = response.statusText || 'Upload failed';
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    // Backend returns { record, message, fileUrl }, we need just the record
    return result.record || result;
  },

  // Transcribe Audio (AI)
  transcribeAudio: async (id: string, audioIndex: number): Promise<MeetingRecord> => {
    return api.post<MeetingRecord>(`/meeting-records/${id}/audio/${audioIndex}/transcribe`, {});
  },

  // Refine Content (AI)
  refineContent: async (id: string): Promise<MeetingRecord> => {
    return api.post<MeetingRecord>(`/meeting-records/${id}/refine-content`, {});
  },

  // Xóa audio recording
  removeAudio: async (id: string, audioIndex: number): Promise<MeetingRecord> => {
    return api.delete<MeetingRecord>(`/meeting-records/${id}/audio/${audioIndex}`);
  },
  // Tạo biên bản AI
  generateMinutesAI: async (id: string, prompt: string): Promise<MeetingRecord> => {
    return api.post<MeetingRecord>(`/meeting-records/${id}/minutes`, { prompt, useAI: true });
  },

  // Generate summary using AI (Qwen)
  generateSummary: async (id: string, maxTokens?: number): Promise<{ summary: string }> => {
    return api.post<{ summary: string }>(`/meeting-records/${id}/summary`, { maxTokens });
  },

  // Extract action items using AI (Qwen)
  extractActionItems: async (id: string): Promise<{
    action_items: Array<{
      task: string;
      assignee: string;
      deadline: string | null;
      priority: 'high' | 'medium' | 'low';
      notes: string;
    }>;
  }> => {
    return api.post<{
      action_items: Array<{
        task: string;
        assignee: string;
        deadline: string | null;
        priority: 'high' | 'medium' | 'low';
        notes: string;
      }>
    }>(`/meeting-records/${id}/action-items`, {});
  },

  // Deep analysis using AI (Qwen)
  deepAnalysis: async (id: string, maxTokens?: number): Promise<{ analysis: string }> => {
    return api.post<{ analysis: string }>(`/meeting-records/${id}/deep-analysis`, { maxTokens });
  },

  // Meeting insights using AI (Qwen)
  meetingInsights: async (id: string, maxTokens?: number): Promise<{ insights: string }> => {
    return api.post<{ insights: string }>(`/meeting-records/${id}/insights`, { maxTokens });
  },

  // Update content only
  updateContent: async (id: string, content: string): Promise<MeetingRecord> => {
    return api.put<MeetingRecord>(`/meeting-records/${id}/content`, { content });
  },
};

export default meetingRecordsApi;