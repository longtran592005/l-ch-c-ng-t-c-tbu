import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Square, AlertCircle, CheckCircle } from 'lucide-react';

interface RealtimeTranscriberProps {
  onSaveTranscript?: (text: string) => void;
  onStart?: () => void;
  onStop?: () => void;
}

export default function RealtimeTranscriber({ onSaveTranscript, onStart, onStop }: RealtimeTranscriberProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const SAMPLE_RATE = 16000;
  const CHUNK_DURATION_MS = 100;

  const connectWebSocket = useCallback(() => {
    const wsUrl = import.meta.env.VITE_PYTHON_WS_URL || 'ws://localhost:8001/realtime-transcribe';
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('[Realtime] WebSocket connected');
      setIsConnected(true);
      setError(null);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcription') {
          setTranscript(prev => prev + (prev ? ' ' : '') + data.text);
        } else if (data.type === 'ack') {
          console.log(`[Realtime] Acknowledged ${data.processed_bytes} bytes`);
        } else if (data.type === 'ready') {
          console.log('[Realtime] Server ready:', data);
          console.log('[Realtime] Sample rate:', data.sample_rate);
        } else if (data.type === 'error') {
          setError(data.message);
        } else if (data.type === 'final') {
          console.log('[Realtime] Final transcription:', data.text);
          setTranscript(prev => prev + (prev ? ' ' : '') + data.text);
        }
      } catch (e) {
        console.error('[Realtime] Error parsing message:', e);
      }
    };
    
    ws.onerror = (event) => {
      console.error('[Realtime] WebSocket error:', event);
      setError('Kết nối thất bại');
      setIsConnected(false);
    };
    
    ws.onclose = () => {
      console.log('[Realtime] WebSocket closed');
      setIsConnected(false);
    };
    
    wsRef.current = ws;
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
        }
      });
      
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        throw new Error('Browser không hỗ trợ WebM audio');
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        
        if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(blob);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(CHUNK_DURATION_MS);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      if (onStart) onStart();
      
    } catch (e: any) {
      console.error('[Realtime] Error starting recording:', e);
      setError(e.message || 'Không thể bắt đầu ghi âm');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (onStop) onStop();
    }
  };

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const handleSave = () => {
    if (onSaveTranscript && transcript.trim()) {
      onSaveTranscript(transcript);
      setTranscript('');
    }
  };

  const handleClear = () => {
    setTranscript('');
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ghi âm thời gian thực</CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Đã kết nối
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1" />
                Mất kết nối
              </>
            )}
          </Badge>
          {isRecording && (
            <Badge variant="destructive">
              <Square className="w-3 h-3 mr-1 animate-pulse" />
              Đang ghi âm
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        
        <div className="flex gap-2">
          {!isRecording ? (
            <Button 
              onClick={startRecording} 
              disabled={!isConnected}
              className="flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Bắt đầu ghi âm
            </Button>
          ) : (
            <Button 
              onClick={stopRecording} 
              variant="destructive"
              className="flex items-center gap-2"
            >
              <MicOff className="w-4 h-4" />
              Dừng ghi âm
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Nội dung đã chuyển đổi:</label>
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Văn bản sẽ xuất hiện ở đây khi bạn ghi âm..."
            rows={10}
            className="w-full"
          />
        </div>
        
        {transcript && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!transcript.trim()}>
              Lưu văn bản
            </Button>
            <Button onClick={handleClear} variant="outline">
              Xóa
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
