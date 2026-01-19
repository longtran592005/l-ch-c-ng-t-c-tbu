import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // Assuming cn utility is available for class merging

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number; // minutes
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, maxDuration }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to avoid re-renders and ensure cleanup
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false); // Use ref to check recording state in interval

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
  };

  // Cleanup function - must be defined before startRecording
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recorder:', e);
      }
      mediaRecorderRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    // Prevent multiple simultaneous recordings
    if (isRecordingRef.current || isRecording) {
      console.warn('Recording already in progress');
      return;
    }
    
    // Cleanup any existing recording first
    if (mediaRecorderRef.current || streamRef.current) {
      console.log('Cleaning up existing recording before starting new one');
      cleanup();
      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('Starting recording...');
    setError(null);
    audioChunksRef.current = [];
    setRecordingTime(0);
    recordingTimeRef.current = 0;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      streamRef.current = stream; // Store stream in ref
      
      let recorder: MediaRecorder;
      const options = { mimeType: 'audio/webm' };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          recorder = new MediaRecorder(stream, { mimeType: 'audio/mp4' });
        } else {
          throw new Error('No supported audio MIME type found.');
        }
      } else {
        recorder = new MediaRecorder(stream, options);
      }

      mediaRecorderRef.current = recorder; // Store in ref

      // Store chunks in ref immediately when available
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log('Recording stopped. Chunks:', audioChunksRef.current.length, 'Duration:', recordingTimeRef.current);
        
        // Clear interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        const finalChunks = [...audioChunksRef.current];
        const finalDuration = recordingTimeRef.current;
        
        if (finalChunks.length === 0) {
          console.error('No audio chunks collected!');
        setError('Không có dữ liệu ghi âm. Vui lòng thử lại.');
        isRecordingRef.current = false;
        setIsRecording(false);
        cleanup();
        return;
        }

        const audioBlob = new Blob(finalChunks, { type: recorder.mimeType || 'audio/webm' });
        console.log('Created audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
        
        onRecordingComplete(audioBlob, finalDuration);
        
        // Cleanup
        audioChunksRef.current = [];
        cleanup();
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError(`Lỗi ghi âm: ${event.error?.name || 'Unknown error'}`);
        isRecordingRef.current = false;
        setIsRecording(false);
        cleanup();
      };

      // Start recording with timeslice
      recorder.start(1000);
      isRecordingRef.current = true; // Set ref first
      setIsRecording(true);
      console.log('Recording started');

      // Start timer - use a stable interval
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      intervalRef.current = setInterval(() => {
        // Use ref to check recording state (avoid stale closure)
        if (!isRecordingRef.current) {
          // Safety check - if recording stopped, clear interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }
        
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
        
        if (maxDuration && recordingTimeRef.current >= maxDuration * 60) {
          stopRecording();
        }
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Quyền truy cập microphone bị từ chối. Vui lòng cấp quyền để ghi âm.');
        } else if (err.name === 'NotFoundError') {
          setError('Không tìm thấy microphone. Vui lòng kiểm tra thiết bị.');
        } else {
          setError(`Đã xảy ra lỗi: ${err.message}`);
        }
      } else if (err instanceof Error) {
        setError(`Lỗi không xác định: ${err.message}`);
      } else {
        setError('Đã xảy ra lỗi không xác định khi thiết lập ghi âm.');
      }
      isRecordingRef.current = false;
      setIsRecording(false);
      setRecordingTime(0);
      cleanup();
    }
  }, [isRecording, onRecordingComplete, maxDuration, cleanup]);

  const stopRecording = useCallback(() => {
    console.log('Stop recording called, isRecording:', isRecording);
    
    // Clear interval immediately to stop timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Update ref and state
    isRecordingRef.current = false;
    setIsRecording(false);
    
    if (!mediaRecorderRef.current) {
      console.warn('No MediaRecorder to stop');
      cleanup();
      return;
    }

    const recorder = mediaRecorderRef.current;
    
    if (recorder.state === 'recording') {
      try {
        // Request final data chunk before stopping
        recorder.requestData();
        recorder.stop();
        console.log('MediaRecorder stop() called');
      } catch (e) {
        console.error('Error stopping recorder:', e);
        cleanup();
      }
    } else {
      console.log('Recorder already stopped or inactive, state:', recorder.state);
      cleanup();
    }
  }, [isRecording, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('AudioRecorder unmounting, cleaning up...');
      cleanup();
    };
  }, [cleanup]);


  return (
    <div className="flex flex-col items-center justify-center p-4">
      {error && (
        <div className="mb-4 text-red-500 font-medium p-2 border border-red-400 rounded-md bg-red-50">
          {error}
        </div>
      )}

      <div className="flex items-center space-x-4 mb-6">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            className="w-24 h-24 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-all duration-300"
            size="icon"
            aria-label="Start recording"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16"/>
            </svg>
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            className={cn(
              "w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-300 relative",
              "before:content-[''] before:absolute before:inset-2 before:rounded-full before:border-2 before:border-white before:opacity-0 before:animate-[pulse-border_1.5s_infinite]" // Red circle effect
            )}
            size="icon"
            aria-label="Stop recording"
          >
            <div className="w-8 h-8 bg-white rounded-sm"></div> {/* Stop icon */}
          </Button>
        )}

        <div className="text-4xl font-mono text-gray-800">
          {formatTime(recordingTime)}
        </div>
      </div>

      {isRecording && (
        <p className="text-gray-600">Recording...</p>
      )}
    </div>
  );
};

export default AudioRecorder;