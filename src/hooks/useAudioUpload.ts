import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

interface UploadResult {
  success: boolean;
  error?: Error;
  response?: any;
}

export const useAudioUpload = (options: UploadOptions = {}) => {
  const { toast } = useToast();
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadFile = useCallback(async (
    url: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<UploadResult> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Upload attempt ${attempt + 1}/${maxRetries} for file:`, file.name);
        
        setIsUploading(true);
        setUploadError(null);
        setProgress({ loaded: 0, total: file.size, percentage: 0 });

        const formData = new FormData();
        formData.append('audioFile', file);
        
        if (additionalData) {
          Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value as string);
          });
        }

        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        const token = localStorage.getItem('tbu_auth_token');

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            abortControllerRef.current?.abort();
            reject(new Error('Upload timeout - server không phản hồi'));
          }, timeout);
        });

        const uploadPromise = fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: formData,
          signal,
        });

        const response = await Promise.race([uploadPromise, timeoutPromise]);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error?.message || response.statusText;
          throw new Error(errorMessage || `Upload failed with status ${response.status}`);
        }

        const result = await response.json();
        
        setIsUploading(false);
        setProgress({
          loaded: file.size,
          total: file.size,
          percentage: 100,
        });

        console.log('Upload successful:', result);
        
        return {
          success: true,
          response: result,
        };

      } catch (error: any) {
        lastError = error;
        console.error(`Upload attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries - 1) {
          console.log(`Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          if (error.name === 'AbortError') {
            throw error;
          }
        } else {
          setIsUploading(false);
          const errorMsg = error.message || 'Upload failed after multiple attempts';
          setUploadError(errorMsg);
          
          toast({
            title: "Lỗi tải lên",
            description: errorMsg,
            variant: "destructive",
            duration: 5000,
          });

          return {
            success: false,
            error: error,
          };
        }
      }
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
    };
  }, [maxRetries, retryDelay, timeout, toast]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsUploading(false);
      setUploadError('Đã hủy tải lên');
      
      toast({
        title: "Đã hủy",
        description: "Quá trình tải lên đã bị hủy.",
        variant: "default",
      });
    }
  }, [toast]);

  const resetUpload = useCallback(() => {
    setIsUploading(false);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setUploadError(null);
    abortControllerRef.current = null;
  }, []);

  return {
    uploadFile,
    isUploading,
    progress,
    error: uploadError,
    cancelUpload,
    resetUpload,
  };
};

export default useAudioUpload;
