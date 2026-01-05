import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useCallback } from "react";
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
import MeetingMinutesGenerator from "./MeetingMinutesGenerator"; // New import
import AudioToTextConverter from "./AudioToTextConverter"; // New import for audio to text conversion
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
        variant: "success",
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
        variant: "success",
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
        if(onClose) onClose();
      }
    } catch (error) {
      toast({
          title: "Lỗi",
          description: "Không thể tải nội dung cuộc họp.",
          variant: "destructive"
      });
      if(onClose) onClose();
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
        variant: "success",
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
        variant: "success",
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
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{record.title}</CardTitle>
        {onClose && <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>}
      </CardHeader>
      <CardContent className="flex-grow">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4"> {/* Updated to grid-cols-4 */}
            <TabsTrigger value="details">Chi tiết cuộc họp</TabsTrigger>
            <TabsTrigger value="content">Nội dung cuộc họp</TabsTrigger>
            <TabsTrigger value="audio">Ghi âm và Tệp tin</TabsTrigger>
            <TabsTrigger value="minutes">Biên bản</TabsTrigger> {/* New tab */}
          </TabsList>
          <TabsContent value="details" className="mt-4 flex-grow overflow-auto p-2">
            <p className="mb-2"><strong>Ngày họp:</strong> {format(new Date(record.meetingDate), 'PPPP', { locale: vi })}</p>
            <p className="mb-2"><strong>Địa điểm:</strong> {record.location}</p>
            <p className="mb-2"><strong>Trạng thái:</strong> {record.status}</p>
          </TabsContent>
          <TabsContent value="content" className="mt-4 flex-grow flex flex-col">
            <MeetingContentEditor
              value={content}
              onChange={handleContentChange}
              placeholder="Ghi lại nội dung cuộc họp..."
              autoSave={true}
              onAutoSave={handleAutoSaveContent}
              autoSaveInterval={10000} // Auto-save every 10 seconds
            />
            {isSavingContent && <p className="text-sm text-blue-500 mt-2">Đang lưu nội dung...</p>}
          </TabsContent>
          <TabsContent value="audio" className="mt-4 flex-grow overflow-auto p-2">
            <div className="flex justify-end gap-2 mb-4">
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Opening recorder dialog');
                  setShowRecorder(true);
                }} 
                size="sm"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                  <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 006 0V3a3 3 0 00-3-3z"/>
                </svg>
                Ghi âm
              </Button>
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Opening uploader dialog');
                  setShowUploader(true);
                }} 
                size="sm"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                  <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V10.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                </svg>
                Tải tệp tin
              </Button>
            </div>
            {record.audioRecordings && record.audioRecordings.length > 0 ? (
              <div className="space-y-4">
                {record.audioRecordings.map((audio, index) => (
                  <Card key={index} className="p-3">
                    <AudioPlayer
                      src={audio.url}
                      title={audio.filename}
                      filename={audio.filename}
                      onDownload={() => {
                        // Convert relative URL to absolute URL for download
                        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                        const downloadUrl = audio.url.startsWith('http') 
                          ? audio.url 
                          : `${API_BASE_URL}${audio.url.startsWith('/') ? audio.url : '/' + audio.url}`;
                        
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = audio.filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast({ title: "Đang tải xuống", description: `Tệp ${audio.filename} sẽ được tải xuống.` });
                      }}
                      onDelete={() => handleDeleteAudio(index)}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-muted-foreground">
                        <p>Loại: {audio.type === 'recorded' ? 'Ghi âm trực tiếp' : 'Tệp tải lên'}</p>
                        <p>Ngày tải lên: {format(new Date(audio.uploadedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                      </div>
                      <Button
                        onClick={() => handleConvertAudioToText(audio.url, audio.filename)}
                        variant="outline"
                        size="sm"
                        className="ml-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Chuyển sang văn bản
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-muted-foreground bg-secondary/20 rounded-md h-48">
                <svg className="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
                </svg>
                <p className="text-lg font-medium">Chưa có ghi âm nào</p>
                <p className="text-sm">Hãy ghi âm hoặc tải tệp tin lên để bắt đầu.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="minutes" className="mt-4 flex-grow flex flex-col p-2"> {/* New tab for minutes */}
            {minutes ? (
              <div className="flex flex-col flex-grow">
                <div className="flex justify-end gap-2 mb-4">
                  <Button onClick={handleClearMinutes} variant="outline" size="sm">
                    Tạo lại
                  </Button>
                  {/* Optional: Add a Save button here if editing the minutes directly is allowed later */}
                </div>
                <div className="border border-input rounded-md overflow-auto flex-grow bg-card">
                  <pre className="whitespace-pre-wrap font-sans text-base p-4">{minutes}</pre>
                </div>
              </div>
            ) : (
              <MeetingMinutesGenerator record={record} onGenerate={handleGenerateMinutes} onGenerateAI={handleGenerateMinutesAI} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 relative z-10 pb-4">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button>Lưu</Button>
      </CardFooter>

      {/* Audio Recorder Dialog */}
      {showRecorder && (
        <Dialog open={showRecorder} onOpenChange={(open) => {
          console.log('Recorder dialog open change:', open);
          setShowRecorder(open);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Ghi âm Cuộc họp</DialogTitle>
              <DialogDescription>
                Nhấn nút để bắt đầu ghi âm. Bạn sẽ được yêu cầu cấp quyền truy cập microphone.
              </DialogDescription>
            </DialogHeader>
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
          </DialogContent>
        </Dialog>
      )}

      {/* Audio Uploader Dialog */}
      {showUploader && (
        <Dialog open={showUploader} onOpenChange={(open) => {
          console.log('Uploader dialog open change:', open);
          setShowUploader(open);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tải lên Tệp tin Âm thanh</DialogTitle>
              <DialogDescription>
                Kéo thả file audio vào đây hoặc click để chọn file từ máy tính của bạn.
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