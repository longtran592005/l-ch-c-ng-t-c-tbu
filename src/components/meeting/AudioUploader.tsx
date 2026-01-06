import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button'; // Assuming Button component path
import { cn } from '@/lib/utils'; // Assuming cn utility
import { Loader2 } from 'lucide-react'; // Import Loader2 for spinner

interface AudioUploaderProps {
  onUploadComplete: (file: File) => void;
  maxSize?: number; // bytes, default 100MB (100 * 1024 * 1024)
  acceptedFormats?: string[]; // default: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm']
}

const DEFAULT_MAX_SIZE = 500 * 1024 * 1024; // 500MB
const DEFAULT_ACCEPTED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/x-m4a'];

const AudioUploader: React.FC<AudioUploaderProps> = ({
  onUploadComplete,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false); // New state for upload loading
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (!file) {
      setError('No file selected.');
      return false;
    }

    console.log('Validating file:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Validate file type - check if type matches or if it's an audio file by extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const audioExtensions = ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'aac', 'flac', 'mp4'];
    const isAudioByType = acceptedFormats.includes(file.type);
    const isAudioByExtension = fileExtension && audioExtensions.includes(fileExtension);

    if (!isAudioByType && !isAudioByExtension) {
      // Allow m4a specifically if type check failed (common issue)
      if (fileExtension === 'm4a') {
        // pass
      } else {
        console.log('File type validation failed. Type:', file.type, 'Extension:', fileExtension);
        setError(`Định dạng không hợp lệ. Hỗ trợ: ${audioExtensions.join(', ')}`);
        return false;
      }
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size exceeds the limit of ${maxSize / (1024 * 1024)}MB.`);
      return false;
    }

    setError(null);
    console.log('File validation passed');
    return true;
  }, [acceptedFormats, maxSize]);

  const handleFileChange = useCallback((file: File | null) => {
    if (file && validateFile(file)) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  }, [validateFile]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File selected:', event.target.files);
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      console.log('Selected file:', file.name, file.type, file.size);
      handleFileChange(file);
    } else {
      console.log('No file selected');
    }
  }, [handleFileChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    console.log('File dropped:', e.dataTransfer.files);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      console.log('Dropped file:', file.name, file.type, file.size);
      handleFileChange(file);
      e.dataTransfer.clearData();
    }
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleUpload = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!selectedFile) {
      setError('Vui lòng chọn file để tải lên.');
      return;
    }

    console.log('Starting upload for file:', selectedFile.name);
    setIsUploading(true);
    setError(null);

    try {
      await onUploadComplete(selectedFile);
      // Reset state after successful upload
      setSelectedFile(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear file input
      }
    } catch (uploadError: any) {
      console.error('Upload error in component:', uploadError);
      setError(`Tải lên thất bại: ${uploadError?.message || 'Lỗi không xác định'}`);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, onUploadComplete]);

  const openFileBrowser = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col items-center p-4 w-full">
      {error && (
        <div className="mb-4 text-red-600 font-medium p-2 border border-red-400 rounded-md bg-red-50 w-full text-center">
          {error}
        </div>
      )}

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 w-full",
          "hover:border-[#4080FF] hover:bg-[#F5F8FF] hover:shadow-[0_0_0_4px_rgba(64,128,255,0.08)]",
          isDragging ? "border-[#4080FF] bg-[#F5F8FF] shadow-[0_0_0_4px_rgba(64,128,255,0.08)]" : "border-[#E5E6EB] bg-[#FAFBFC]",
          "cursor-pointer"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileBrowser}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={acceptedFormats.join(',') + ',.mp3,.wav,.m4a,.webm,.ogg,.aac,.flac,.mp4'}
          className="hidden"
        />
        <div className="flex flex-col items-center">
          <svg className="upload-icon w-10 h-10 mb-2 text-[#4080FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <p className="upload-text text-[#4E5969] mb-1 font-medium">
            Drag & drop your audio file here, or
            <span className="browse-link text-[#4080FF] font-medium no-underline hover:underline ml-1">Browse</span>
          </p>
          <p className="file-types text-[#86909C] text-xs mt-2">
            Supported formats: {acceptedFormats.map(f => f.split('/')[1]).join(', ')}. Max size: {maxSize / (1024 * 1024)}MB.
          </p>
        </div>
      </div>

      {selectedFile && (
        <div className="mt-4 p-4 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-800 w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{selectedFile.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleUpload}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải lên...
                </>
              ) : (
                'Tải lên'
              )}
            </Button>
            <Button
              onClick={() => {
                setSelectedFile(null);
                setError(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              variant="outline"
              disabled={isUploading}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AudioUploader;