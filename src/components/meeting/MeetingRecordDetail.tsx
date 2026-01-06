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

  // State for meeting minutes
  const [minutes, setMinutes] = useState<string>('');

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

  // Handle audio to text conversion
  const handleConvertAudioToText = useCallback(async (audioUrl: string, filename: string) => {
    try {
      // Download audio file from URL
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const fullUrl = audioUrl.startsWith('http')
        ? audioUrl
        : `${API_BASE_URL}${audioUrl.startsWith('/') ? audioUrl : '/' + audioUrl}`;

      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error('Không thể tải file audio.');
      }

      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || 'audio/mpeg' });

      setSelectedAudioFile(file);
      setShowAudioToText(true);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: `Không thể tải file audio: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Handle when text is extracted from audio
  const handleTextExtracted = useCallback((text: string) => {
    // Option 1: Add to content (văn bản thô)
    if (content) {
      setContent(content + '\n\n' + text);
    } else {
      setContent(text);
    }

    // Switch to content tab to show the extracted text
    setActiveTab('content');

    toast({
      title: "Thành công",
      description: "Văn bản đã được thêm vào nội dung cuộc họp. Bạn có thể chỉnh sửa và sau đó tạo biên bản.",
      variant: "default",
      duration: 3000,
    });
  }, [content, toast]);

  useEffect(() => {
    refreshRecordData();
  }, [refreshRecordData]);

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
    <Card className="h-full flex flex-col border-none shadow-none sm:border sm:rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 sm:px-6">
        <CardTitle className="text-xl">{record.title}</CardTitle>
        {onClose && <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>}
      </CardHeader>
      <CardContent className="flex-grow p-0 sm:p-6 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4 mx-4 sm:mx-0 w-auto self-center sm:self-start bg-secondary/50 p-1">
            <TabsTrigger value="details" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Thông tin</TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Ghi âm & Tệp</TabsTrigger>
            <TabsTrigger value="processing" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Xử lý biên bản</TabsTrigger>
          </TabsList>

          {/* TAB 1: Chi tiết */}
          <TabsContent value="details" className="mt-0 flex-grow overflow-auto px-4 sm:px-0">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-muted-foreground">Thông tin chung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="font-medium">Ngày họp:</span>
                    <p className="text-lg">{format(new Date(record.meetingDate), 'PPPP', { locale: vi })}</p>
                  </div>
                  <div>
                    <span className="font-medium">Địa điểm:</span>
                    <p className="text-muted-foreground">{record.location}</p>
                  </div>
                  <div>
                    <span className="font-medium">Trạng thái:</span>
                    <Badge variant={record.status === 'completed' ? 'default' : (record.status === 'draft' ? 'secondary' : 'outline')}>
                      {record.status === 'completed' ? 'Đã hoàn thành' : (record.status === 'draft' ? 'Bản nháp' : 'Lưu trữ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-muted-foreground">Thành phần</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="font-medium block mb-1">Chủ trì:</span>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(record.leader || '?')[0].toUpperCase()}
                      </div>
                      <span>{record.leader}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium block mb-1">Tham dự:</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {record.participants?.join(', ') || 'Chưa cập nhật'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: File Ghi âm */}
          <TabsContent value="files" className="mt-0 flex-grow overflow-auto px-4 sm:px-0">
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
                              onClick={() => handleConvertAudioToText(audio.url, audio.filename)}
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
          <TabsContent value="processing" className="mt-0 flex-grow flex flex-col overflow-hidden h-full">
            <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-6 pt-2">
              {/* CỘT TRÁI: Văn bản thô (Transcript) */}
              <div className="flex-1 flex flex-col h-full min-h-[400px] border rounded-lg shadow-sm bg-background">
                <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
                  <h3 className="font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Văn bản thô (Transcript)
                  </h3>
                  <Badge variant="outline" className="font-normal text-xs">Tự động lưu</Badge>
                </div>
                <div className="flex-grow overflow-hidden relative">
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
              <div className="hidden lg:flex flex-col justify-center items-center gap-2">
                <Button
                  size="icon"
                  className="rounded-full h-10 w-10 shadow-md"
                  onClick={() => handleGenerateMinutesAI("auto")} // Trigger AI gen
                  title="Dùng AI tạo biên bản từ văn bản thô"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Button>
              </div>

              {/* CỘT PHẢI: Biên bản hoàn chỉnh */}
              <div className="flex-1 flex flex-col h-full min-h-[400px] border rounded-lg shadow-sm bg-background">
                <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
                  <h3 className="font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Biên bản chính thức
                  </h3>
                  {/* Nút tạo biên bản cho mobile */}
                  <div className="lg:hidden">
                    <Button size="sm" variant="outline" onClick={() => handleGenerateMinutesAI("auto")}>Tạo bằng AI</Button>
                  </div>
                </div>
                <div className="flex-grow overflow-y-auto p-0">
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
                Nhấn nút để bắt đầu ghi âm.
              </DialogDescription>
            </DialogHeader>
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
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

      {/* Audio to Text Converter Dialog */}
      {showAudioToText && (
        <AudioToTextConverter
          audioFile={selectedAudioFile}
          onTextExtracted={handleTextExtracted}
          onClose={() => {
            setShowAudioToText(false);
            setSelectedAudioFile(null);
          }}
          isOpen={showAudioToText}
        />
      )}
    </Card>
  );
}