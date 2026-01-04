import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  FC,
} from 'react';
import {
  MeetingRecord,
  CreateMeetingRecordInput,
  UpdateMeetingRecordInput,
} from '@/types';
import { meetingRecordsApi } from '@/services/meetingRecords.api';
import { useToast } from '@/hooks/use-toast';

interface MeetingRecordsContextType {
  meetingRecords: MeetingRecord[];
  isLoading: boolean;
  error: string | null;
  fetchMeetingRecords: (filters?: {
    scheduleId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<void>;
  getMeetingRecordById: (id: string) => Promise<MeetingRecord | null>;
  createMeetingRecord: (
    data: CreateMeetingRecordInput
  ) => Promise<MeetingRecord | undefined>;
  updateMeetingRecord: (
    id: string,
    data: UpdateMeetingRecordInput
  ) => Promise<void>;
  deleteMeetingRecord: (id: string) => Promise<void>;
  uploadAudio: (id: string, file: File) => Promise<void>;
  removeAudio: (id: string, audioIndex: number) => Promise<void>;
  updateContent: (id: string, content: string) => Promise<void>;
  generateMinutes: (id: string, template?: string) => Promise<void>;
}

const MeetingRecordsContext = createContext<
  MeetingRecordsContextType | undefined
>(undefined);

export const MeetingRecordsProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [meetingRecords, setMeetingRecords] = useState<MeetingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleApiCall = async <T>(
    apiCall: Promise<T>,
    onSuccess?: (result: T) => void,
    successMessage?: string,
    errorMessage?: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall;
      if (onSuccess) onSuccess(result);
      if (successMessage) {
        toast({ title: 'Thành công', description: successMessage });
      }
      return result;
    } catch (err: any) {
      const message = err.message || errorMessage || 'Đã có lỗi xảy ra';
      setError(message);
      toast({ title: 'Lỗi', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMeetingRecords = useCallback(
    async (filters) => {
      await handleApiCall(
        meetingRecordsApi.getAll(filters),
        (data) => {
          // Parse dates and ensure data is in correct format
          const parsedData = (data as any[]).map((record) => ({
            ...record,
            meetingDate: record.meetingDate ? new Date(record.meetingDate) : new Date(),
            createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
            updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
            completedAt: record.completedAt ? new Date(record.completedAt) : undefined,
            participants: Array.isArray(record.participants) ? record.participants : [],
            audioRecordings: Array.isArray(record.audioRecordings) 
              ? record.audioRecordings.map((audio: any) => ({
                  ...audio,
                  uploadedAt: audio.uploadedAt ? new Date(audio.uploadedAt) : new Date(),
                }))
              : [],
          })) as MeetingRecord[];
          setMeetingRecords(parsedData);
        },
        undefined,
        'Không thể tải danh sách nội dung cuộc họp.'
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const getMeetingRecordById = useCallback(
    async (id: string) => {
      return await handleApiCall(
        meetingRecordsApi.getById(id),
        undefined,
        undefined,
        `Không thể tìm thấy nội dung họp với ID: ${id}.`
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const createMeetingRecord = useCallback(
    async (data: CreateMeetingRecordInput) => {
        const newRecord = await handleApiCall(
            meetingRecordsApi.create(data),
            (result) => {
                setMeetingRecords((prev) => [result as MeetingRecord, ...prev]);
            },
            'Tạo nội dung cuộc họp thành công.',
            'Không thể tạo nội dung cuộc họp.'
        );
        return newRecord;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateMeetingRecordInState = (updatedRecord: MeetingRecord) => {
    setMeetingRecords((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    );
  };

  const updateMeetingRecord = useCallback(
    async (id: string, data: UpdateMeetingRecordInput) => {
      await handleApiCall(
        meetingRecordsApi.update(id, data),
        (result) => updateMeetingRecordInState(result as MeetingRecord),
        'Cập nhật thành công.',
        'Không thể cập nhật.'
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteMeetingRecord = useCallback(async (id: string) => {
    await handleApiCall(
      meetingRecordsApi.delete(id),
      () => {
        setMeetingRecords((prev) => prev.filter((r) => r.id !== id));
      },
      'Xóa thành công.',
      'Không thể xóa.'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadAudio = useCallback(async (id: string, file: File) => {
    await handleApiCall(
      meetingRecordsApi.uploadAudio(id, file),
      (result) => updateMeetingRecordInState(result as MeetingRecord),
      'Tải lên audio thành công.',
      'Không thể tải lên audio.'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeAudio = useCallback(async (id: string, audioIndex: number) => {
    await handleApiCall(
      meetingRecordsApi.removeAudio(id, audioIndex),
      (result) => updateMeetingRecordInState(result as MeetingRecord),
      'Xóa audio thành công.',
      'Không thể xóa audio.'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateContent = useCallback(async (id: string, content: string) => {
    await handleApiCall(
      meetingRecordsApi.updateContent(id, content),
      (result) => updateMeetingRecordInState(result as MeetingRecord),
      'Cập nhật nội dung thành công.',
      'Không thể cập nhật nội dung.'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateMinutes = useCallback(async (id: string, template?: string) => {
    await handleApiCall(
      meetingRecordsApi.generateMinutes(id, template),
      (result) => updateMeetingRecordInState(result as MeetingRecord),
      'Tạo biên bản thành công.',
      'Không thể tạo biên bản.'
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const value = {
    meetingRecords,
    isLoading,
    error,
    fetchMeetingRecords,
    getMeetingRecordById,
    createMeetingRecord,
    updateMeetingRecord,
    deleteMeetingRecord,
    uploadAudio,
    removeAudio,
    updateContent,
    generateMinutes,
  };

  return (
    <MeetingRecordsContext.Provider value={value}>
      {children}
    </MeetingRecordsContext.Provider>
  );
};

export function useMeetingRecords() {
  const context = useContext(MeetingRecordsContext);
  if (context === undefined) {
    throw new Error(
      'useMeetingRecords must be used within a MeetingRecordsProvider'
    );
  }
  return context;
}