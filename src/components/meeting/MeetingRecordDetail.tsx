import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { useMeetingRecords } from "@/contexts/MeetingRecordsContext";
import { MeetingRecord, AudioRecording } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { format } from "date-fns";
import { vi } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import AudioRecorder from "./AudioRecorder";
import AudioUploader from "./AudioUploader";
import AudioPlayer from "./AudioPlayer";
import MeetingContentEditor from "./MeetingContentEditor";
import MeetingMinutesGenerator from "./MeetingMinutesGenerator";
import AudioToTextConverter from "./AudioToTextConverter";
import { meetingRecordsApi } from "@/services/meetingRecords.api";
import { callAIAPI } from "@/services/aiService";
import RealtimeTranscriber from "./RealtimeTranscriber.tsx";
import { Sparkles, List, FileText, Brain, BarChart3 } from "lucide-react";

interface MeetingRecordDetailProps {
  recordId: string;
  onClose?: () => void;
}

export default function MeetingRecordDetail({ recordId, onClose }: MeetingRecordDetailProps) {
  const { getMeetingRecordById } = useMeetingRecords(); // Removed isLoading as it's not directly used here for individual record fetch
  const [record, setRecord] = useState<MeetingRecord | null>(null);
  const { toast } = useToast();
  const [showRecorder, setShowRecorder] = useState<boolean>(false);
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const [showAudioToText, setShowAudioToText] = useState<boolean>(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [isRecordLoading, setIsRecordLoading] = useState<boolean>(false); // Local loading state for fetching individual record

  // State for content editor
  const [content, setContent] = useState<string>('');
  const [isSavingContent, setIsSavingContent] = useState<boolean>(false);
  const [originalContent, setOriginalContent] = useState<string | null>(null);

  // State for meeting minutes
  const [minutes, setMinutes] = useState<string>('');

  // State for AI analysis
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiActionItems, setAiActionItems] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Effect to initialize local minutes state when record data loads or changes
  useEffect(() => {
    if (record?.minutes) {
      setMinutes(record.minutes);
    } else {
      setMinutes('');
    }
  }, [record]);

  // Rest of the code...

  const handleGenerateMinutes = useCallback(async (generatedContent: string) => {
    if (!record?.id) return;
    try {
      await meetingRecordsApi.update(record.id, { minutes: generatedContent });
      setMinutes(generatedContent); // Update local state directly for immediate feedback
      toast({
        title: "Thành công",
        description: "Biên bản đã được tạo và lưu.",
        variant: "default",
        duration: 2000,
      });
      // No need for full refreshRecordData if only minutes updated and local state is set
    } catch (error) {
      toast({
        title: "Lỗi",
        description: `Không thể lưu biên bản: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  }, [record?.id, toast]);

  const handleClearMinutes = useCallback(() => {
    setMinutes('');
    // Optionally clear from API as well if "clearing" means deleting the saved minutes
    // For now, just clear locally to show generator again.
  }, []);

  const handleGenerateMinutesAI = useCallback(async (prompt: string): Promise<string> => {
    if (!record?.id) {
      toast({
        title: "Lỗi",
        description: "Không có ID bản ghi cuộc họp để tạo biên bản AI.",
        variant: "destructive",
      });
      throw new Error("No record ID for AI generation.");
    }
    try {
      // Assuming a new API call to backend that then calls the AI service
      // This will be implemented in the backend later.
      // For now, let's use a placeholder or directly call callAIAPI from frontend if allowed.
      // Given the prompt asks for a backend endpoint, we should call that.
      // We will define a new method in meetingRecordsApi for this.
      toast({
        title: "Đang tạo biên bản AI...",
        description: "Vui lòng chờ, AI đang xử lý nội dung.",
        duration: 3000,
      });

      // Placeholder for actual backend API call
      // const response = await meetingRecordsApi.generateMinutesAI(record.id, prompt);
      // return response.minutes;

      // Use the new API method
      const response = await meetingRecordsApi.generateMinutesAI(record.id, prompt);
      const generatedText = response.minutes;
      toast({
        title: "Thành công",
        description: "Biên bản AI đã được tạo.",
        variant: "default",
        duration: 1500,
      });
      return generatedText;

    } catch (error) {
      toast({
        title: "Lỗi tạo biên bản AI",
        description: `Không thể tạo biên bản bằng AI: ${(error as Error).message}`,
        variant: "destructive",
      });
      throw error;
    }
  }, [record?.id, toast]);

  // Effect to initialize local content state when record data loads
  useEffect(() => {
    if (record?.content) {
      setContent(record.content);
    } else {
      setContent('');
    }
  }, [record]);

  const refreshRecordData = useCallback(async () => {
    if (!recordId) return;
    setIsRecordLoading(true);
    try {
      const data = await getMeetingRecordById(recordId);
      if (data) {
        setRecord(data);
        // Do not update content here, let the editor manage it unless it's a fresh load.
        // setContent(data.content || ''); // This would overwrite editor's current state
      } else {
        toast({
          title: "Lỗi",
          description: "Không tìm thấy nội dung cuộc họp.",
          variant: "destructive"
        });
        if (onClose) onClose();
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải nội dung cuộc họp.",
        variant: "destructive"
      });
      if (onClose) onClose();
    } finally {
      setIsRecordLoading(false);
    }
  }, [recordId, getMeetingRecordById, toast, onClose]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleAutoSaveContent = useCallback(async (editorContent: string) => {
    if (!record?.id) return;
    setIsSavingContent(true);
    try {
      await meetingRecordsApi.updateContent(record.id, editorContent);
      // No need to refreshRecordData fully, just update the local record content
      setRecord(prev => prev ? { ...prev, content: editorContent } : null);
      toast({
        title: "Tự động lưu",
        description: "Nội dung cuộc họp đã được tự động lưu.",
        variant: "default",
        duration: 1500,
      });
    } catch (error) {
      toast({
        title: "Lỗi tự động lưu",
        description: `Không thể tự động lưu nội dung: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingContent(false);
    }
  }, [record?.id, toast]);

  // Handle audio to text conversion - Use server-side processing directly
  const handleConvertAudioToText = useCallback(async (audioIndex: number) => {
    if (!record?.id) return;

    try {
      toast({
        title: "Đang xử lý...",
        description: "Hệ thống đang chuyển đổi giọng nói thành văn bản. Vui lòng chờ...",
        duration: 5000,
      });

      // Call backend to run transcription locally using vinai.py
      await meetingRecordsApi.transcribeAudio(record.id, audioIndex);

      toast({
        title: "Thành công",
        description: "Đã chuyển đổi văn bản thành công. Nội dung đã được cập nhật.",
        variant: "default",
      });

      // Refresh to see the new content
      refreshRecordData();

      // Select content tab
      setActiveTab('content');

    } catch (error: any) {
      console.error('Transcription error:', error);
      toast({
        title: "Lỗi",
        description: `Lỗi khi chuyển đổi: ${error.message || 'Không xác định'}`,
        variant: "destructive",
      });
    }
  }, [record?.id, refreshRecordData, toast]);



  // ... (rest of state definitions)

  const handleRefineContent = useCallback(async () => {
    if (!record?.id) return;
    setIsGeneratingAI(true);
    // Save current content before refining
    setOriginalContent(content);
    try {
      toast({
        title: "Đang xử lý AI...",
        description: "Đang chuẩn hóa văn bản, sửa lỗi chính tả...",
        duration: 5000,
      });
      await meetingRecordsApi.refineContent(record.id);
      await refreshRecordData();
      toast({
        title: "Thành công",
        description: "Văn bản đã được chuẩn hóa.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: `Lỗi khi chuẩn hóa: ${error.message}`,
        variant: "destructive",
      });
      // Revert local state if API fails (optional, but good UX)
      setOriginalContent(null);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [record?.id, content, refreshRecordData, toast]);

  const handleUndoRefine = useCallback(async () => {
    if (!originalContent || !record?.id) return;
    try {
      // Restore original content via API
      await meetingRecordsApi.updateContent(record.id, originalContent);
      setContent(originalContent);
      setOriginalContent(null); // Clear undo history after reverting
      toast({
        title: "Đã hoàn tác",
        description: "Văn bản đã được khôi phục về trạng thái trước khi chuẩn hóa.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: `Không thể hoàn tác: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [originalContent, record?.id, toast]);

  useEffect(() => {
    refreshRecordData();
  }, [recordId]);

  const handleDeleteAudio = useCallback(async (audioIndex: number) => {
    if (!record?.id || !record.audioRecordings) return;

    const originalRecord = record;
    const updatedAudioRecordings = record.audioRecordings.filter((_, index) => index !== audioIndex);

    // Optimistic update
    setRecord({ ...record, audioRecordings: updatedAudioRecordings });

    try {
      await meetingRecordsApi.removeAudio(record.id, audioIndex);
      toast({
        title: "Thành công",
        description: "Đã xóa ghi âm thành công.",
        variant: "default",
      });
      // No need to call refreshRecordData() on success
    } catch (error) {
      // Revert on error
      setRecord(originalRecord);
      toast({
        title: "Lỗi",
        description: `Không thể xóa ghi âm. Đã hoàn tác thay đổi. Lỗi: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  }, [record, toast]);

  const handleRecordingComplete = useCallback(async (audioBlob: Blob, duration: number) => {
    console.log('Recording complete. Blob size:', audioBlob.size, 'Duration:', duration);

    if (!record?.id) {
      toast({
        title: "Lỗi",
        description: "Không có ID bản ghi cuộc họp để tải lên.",
        variant: "destructive",
      });
      return;
    }

    if (audioBlob.size === 0) {
      toast({
        title: "Lỗi",
        description: "Không có dữ liệu ghi âm. Vui lòng thử lại.",
        variant: "destructive",
      });
      return;
    }

    setShowRecorder(false); // Close dialog immediately
    toast({
      title: "Đang tải lên...",
      description: "Đang xử lý ghi âm. Vui lòng chờ.",
    });

    try {
      // Determine file extension based on blob type
      let extension = 'webm';
      if (audioBlob.type.includes('mp4')) extension = 'mp4';
      else if (audioBlob.type.includes('ogg')) extension = 'ogg';
      else if (audioBlob.type.includes('wav')) extension = 'wav';

      const audioFile = new File([audioBlob], `recorded_audio_${Date.now()}.${extension}`, {
        type: audioBlob.type || 'audio/webm'
      });

      console.log('Uploading audio file:', audioFile.name, 'Size:', audioFile.size, 'Type:', audioFile.type);

      const result = await meetingRecordsApi.uploadAudio(record.id, audioFile);
      console.log('Upload successful:', result);

      toast({
        title: "Thành công",
        description: "Ghi âm đã được tải lên thành công.",
        variant: "default",
      });
      refreshRecordData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Lỗi",
        description: `Không thể tải lên ghi âm: ${error?.message || 'Lỗi không xác định'}`,
        variant: "destructive",
      });
    }
  }, [record?.id, refreshRecordData, toast]);

  const handleUploadComplete = useCallback(async (file: File) => {
    console.log('Upload complete callback. File:', file.name, 'Size:', file.size, 'Type:', file.type);

    if (!record?.id) {
      toast({
        title: "Lỗi",
        description: "Không có ID bản ghi cuộc họp để tải lên.",
        variant: "destructive",
      });
      return;
    }

    setShowUploader(false); // Close dialog immediately
    toast({
      title: "Đang tải lên...",
      description: "Đang xử lý tệp tin. Vui lòng chờ.",
    });

    try {
      console.log('Uploading file to meeting record:', record.id);
      const result = await meetingRecordsApi.uploadAudio(record.id, file);
      console.log('Upload successful:', result);

      toast({
        title: "Thành công",
        description: "Tệp tin đã được tải lên thành công.",
        variant: "default",
      });
      refreshRecordData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Lỗi",
        description: `Không thể tải lên tệp tin: ${error?.message || 'Lỗi không xác định'}`,
        variant: "destructive",
      });
    }
  }, [record?.id, refreshRecordData, toast]);

  // AI Analysis handlers
  const handleGenerateSummaryAI = useCallback(async () => {
    if (!record?.id || !record?.content) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đảm bảo có nội dung cuộc họp trước.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const result = await meetingRecordsApi.generateSummary(record.id);
      setAiSummary(result.summary);
      setActiveTab('ai-analysis');
      toast({
        title: "Thành công",
        description: "Tóm tắt đã được tạo.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: `Không thể tạo tóm tắt: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [record, toast]);

  const handleGenerateMinutesAIv2 = useCallback(async () => {
    if (!record?.id || !record?.content) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đảm bảo có nội dung cuộc họp trước.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const result = await meetingRecordsApi.generateMinutesAI(record.id, 'auto');
      setMinutes(result.minutes);
      setActiveTab('ai-analysis');
      toast({
        title: "Thành công",
        description: "Biên bản AI đã được tạo.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: `Không thể tạo biên bản: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [record, toast]);

  const handleExtractActionItemsAI = useCallback(async () => {
    if (!record?.id || !record?.content) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đảm bảo có nội dung cuộc họp trước.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const result = await meetingRecordsApi.extractActionItems(record.id);
      setAiActionItems(result.action_items);
      setActiveTab('ai-analysis');
      toast({
        title: "Thành công",
        description: `Đã trích xuất ${result.action_items.length} action items.`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: `Không thể trích xuất action items: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [record, toast]);

  const handleDeepAnalysisAI = useCallback(async () => {
    if (!record?.id || !record?.content) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đảm bảo có nội dung cuộc họp trước.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const result = await meetingRecordsApi.deepAnalysis(record.id);
      setAiAnalysis(result.analysis);
      setActiveTab('ai-analysis');
      toast({
        title: "Thành công",
        description: "Phân tích sâu đã hoàn thành.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: `Không thể thực hiện phân tích sâu: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [record, toast]);

  const handleMeetingInsightsAI = useCallback(async () => {
    if (!record?.id || !record?.content) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đảm bảo có nội dung cuộc họp trước.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const result = await meetingRecordsApi.meetingInsights(record.id);
      setAiInsights(result.insights);
      setActiveTab('ai-analysis');
      toast({
        title: "Thành công",
        description: "Meeting insights đã được tạo.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: `Không thể tạo meeting insights: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [record, toast]);

  // Early returns must come AFTER all hooks
  if (isRecordLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-8" />
        </CardHeader>
        <CardContent className="flex-grow flex flex-col space-y-4 pt-6">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </CardFooter>
      </Card>
    );
  }

  if (!record) {
    // This case is handled by the parent component, but as a fallback:
    return (
      <Card>
        <CardContent className="pt-6 h-full flex items-center justify-center">
          <p>Không có dữ liệu để hiển thị.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col border shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-muted/30 flex-shrink-0">
        <CardTitle className="text-lg font-semibold truncate">{record.title}</CardTitle>
        {onClose && <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0"><X className="h-5 w-5" /></Button>}
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col min-h-0">
          <TabsList className="flex-shrink-0 grid w-auto grid-cols-3 mx-4 mt-3 bg-secondary/50 p-1 rounded-lg">
            <TabsTrigger value="details" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm px-4">Thông tin</TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm px-4">Ghi âm & Tệp</TabsTrigger>
            <TabsTrigger value="processing" className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm px-4">Xử lý biên bản</TabsTrigger>
          </TabsList>

          {/* TAB 1: Chi tiết */}
          <TabsContent value="details" className="mt-0 flex-grow overflow-auto p-4 min-h-0">
            <div className="grid gap-4 md:grid-cols-2 h-full">
              <Card className="shadow-sm h-fit">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">Thông tin chung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Ngày họp:</span>
                    <p className="text-base">{format(new Date(record.meetingDate), 'PPPP', { locale: vi })}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Địa điểm:</span>
                    <p>{record.location || 'Chưa cập nhật'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Trạng thái:</span>
                    <div className="mt-1">
                      <Badge variant={record.status === 'completed' ? 'default' : (record.status === 'draft' ? 'secondary' : 'outline')}>
                        {record.status === 'completed' ? 'Đã hoàn thành' : (record.status === 'draft' ? 'Bản nháp' : 'Lưu trữ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm h-fit">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">Thành phần</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block mb-1">Chủ trì:</span>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {(record.leader || '?')[0].toUpperCase()}
                      </div>
                      <span>{record.leader || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block mb-1">Tham dự:</span>
                    <p className="text-sm leading-relaxed">
                      {record.participants?.join(', ') || 'Chưa cập nhật'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: File Ghi âm */}
          <TabsContent value="files" className="mt-0 flex-grow overflow-auto p-4 min-h-0">
            <div className="flex flex-col h-full">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-muted/30 p-3 rounded-lg border border-dashed border-muted-foreground/20">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Hỗ trợ file tối đa 500MB (MP3, WAV, M4A...)</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowRecorder(true)} size="sm" className="gap-2 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    Ghi âm trực tiếp
                  </Button>
                  <Button onClick={() => setShowUploader(true)} size="sm" variant="secondary" className="gap-2 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Tải file lên
                  </Button>
                </div>
              </div>

              {record.audioRecordings && record.audioRecordings.length > 0 ? (
                <div className="grid gap-4">
                  {record.audioRecordings.map((audio, index) => (
                    <Card key={index} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium text-lg flex items-center gap-2">
                              {audio.filename}
                              <Badge variant="outline" className="text-xs font-normal">
                                {audio.type === 'recorded' ? 'Ghi âm' : 'Tải lên'}
                              </Badge>
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Đã thêm: {format(new Date(audio.uploadedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleConvertAudioToText(index)}
                              variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              Chuyển văn bản (AI)
                            </Button>
                            <Button
                              onClick={() => handleDeleteAudio(index)}
                              variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              Xóa
                            </Button>
                          </div>
                        </div>
                        <div className="bg-secondary/20 rounded-md p-2">
                          <AudioPlayer
                            src={audio.url}
                            filename={audio.filename}
                          // Simplified props, removed redundant delete/download as they are handled in parent UI now
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </div>
                  <h3 className="text-lg font-medium">Chưa có bản ghi âm nào</h3>
                  <p className="text-muted-foreground max-w-sm mt-2">
                    Tải lên file ghi âm cuộc họp hoặc ghi âm trực tiếp tại đây để bắt đầu xử lý.
                  </p>
                  <div className="flex gap-3 mt-6">
                    <Button onClick={() => setShowRecorder(true)}>Bắt đầu ghi âm</Button>
                    <Button variant="outline" onClick={() => setShowUploader(true)}>Tải file lên</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: Xử lý (Split View) */}
          <TabsContent value="processing" className="mt-0 flex-grow flex flex-col overflow-hidden min-h-0 p-4">
            <div className="flex flex-col lg:flex-row h-full gap-3">
              {/* CỘT TRÁI: Văn bản thô (Transcript) */}
              <div className="flex-1 flex flex-col min-h-[300px] border rounded-lg shadow-sm bg-background overflow-hidden">
                <div className="p-2 border-b bg-muted/30 flex justify-between items-center flex-shrink-0">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Văn bản thô
                  </h3>
                  <div className="flex gap-1">
                    {originalContent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                        onClick={handleUndoRefine}
                        title="Hoàn tác về phiên bản gốc"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                        Hoàn tác
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-2"
                      onClick={handleRefineContent}
                      disabled={isGeneratingAI || !content}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Chuẩn hóa AI
                    </Button>
                  </div>
                </div>
                <div className="flex-grow overflow-hidden relative min-h-0">
                  <MeetingContentEditor
                    value={content}
                    onChange={handleContentChange}
                    placeholder="Nội dung văn bản sau khi chuyển đổi giọng nói sẽ xuất hiện ở đây..."
                    autoSave={true}
                    onAutoSave={handleAutoSaveContent}
                    autoSaveInterval={10000}
                    className="h-full border-none focus-visible:ring-0 p-4"
                  />
                </div>
              </div>

              {/* NÚT AI Ở GIỮA (Chỉ hiện trên desktop) */}
              <div className="hidden lg:flex flex-col justify-center items-center flex-shrink-0">
                <Button
                  size="icon"
                  className="rounded-full h-8 w-8 shadow-md"
                  onClick={() => handleGenerateMinutesAI("auto")}
                  title="Dùng AI tạo biên bản từ văn bản thô"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Button>
              </div>

              {/* CỘT PHẢI: Biên bản hoàn chỉnh */}
              <div className="flex-1 flex flex-col min-h-[300px] border rounded-lg shadow-sm bg-background overflow-hidden">
                <div className="p-2 border-b bg-muted/30 flex justify-between items-center flex-shrink-0">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Biên bản chính thức
                  </h3>
                  {/* Nút tạo biên bản cho mobile */}
                  <div className="lg:hidden">
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleGenerateMinutesAI("auto")}>Tạo bằng AI</Button>
                  </div>
                </div>
                <div className="flex-grow overflow-y-auto p-0 min-h-0">
                  {minutes ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-grow p-4">
                        <textarea
                          className="w-full h-full min-h-[300px] resize-none focus:outline-none bg-transparent"
                          value={minutes}
                          onChange={(e) => setMinutes(e.target.value)}
                          placeholder="Biên bản cuộc họp sẽ xuất hiện ở đây..."
                        />
                      </div>
                      <div className="p-2 border-t flex justify-end gap-2 bg-muted/10">
                        <Button variant="outline" size="sm" onClick={() => setMinutes('')}>Làm mới</Button>
                        <Button size="sm" onClick={() => handleGenerateMinutes(minutes)}>Lưu biên bản</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center p-6">
                      <MeetingMinutesGenerator
                        record={record}
                        onGenerate={setMinutes}
                        onGenerateAI={handleGenerateMinutesAI}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>


        </Tabs>
      </CardContent>

      {/* Audio Recorder Dialog */}
      {showRecorder && (
        <Dialog open={showRecorder} onOpenChange={setShowRecorder}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Ghi âm Cuộc họp</DialogTitle>
              <DialogDescription>
                Chọn loại ghi âm:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Audio Uploader Dialog */}
      {showUploader && (
        <Dialog open={showUploader} onOpenChange={setShowUploader}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tải lên Tệp tin Âm thanh</DialogTitle>
              <DialogDescription>
                Kéo thả file audio vào đây (Tối đa 500MB).
              </DialogDescription>
            </DialogHeader>
            <AudioUploader onUploadComplete={handleUploadComplete} />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}