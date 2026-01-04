import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider'; // Assuming a Slider component
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'; // Assuming DropdownMenu components
import { cn } from '@/lib/utils'; // Assuming cn utility

interface AudioPlayerProps {
  src: string; // URL of the audio file
  title?: string;
  filename?: string;
  onDelete?: () => void;
  onDownload?: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title,
  filename,
  onDelete,
  onDownload,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1); // 0-1
  const [playbackRate, setPlaybackRate] = useState<number>(1); // 0.5, 1, 1.5, 2
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const playbackRates = useMemo(() => [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2], []);

  // Convert relative URL to absolute URL
  const getAudioUrl = useCallback((url: string): string => {
    if (!url) return '';
    
    // If URL is already absolute (starts with http:// or https://), return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If URL is relative (starts with /), prepend API base URL
    if (url.startsWith('/')) {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      return `${API_BASE_URL}${url}`;
    }
    
    // Otherwise return as is (might be a data URL or blob URL)
    return url;
  }, []);

  const audioUrl = useMemo(() => getAudioUrl(src), [src, getAudioUrl]);

  // Format time to MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  };

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          setError('Failed to play audio. ' + err.message);
          setIsPlaying(false);
        });
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      // Only update if time changed significantly (reduce re-renders)
      const newTime = audioRef.current.currentTime;
      setCurrentTime(prev => {
        // Only update if difference is > 0.1 seconds
        return Math.abs(newTime - prev) > 0.1 ? newTime : prev;
      });
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handlePlaying = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleWaiting = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const target = event.target as HTMLAudioElement;
    let errorMessage = 'An unknown audio error occurred.';
    switch (target.error?.code) {
      case 1: // MEDIA_ERR_ABORTED
        errorMessage = 'Audio playback aborted.';
        break;
      case 2: // MEDIA_ERR_NETWORK
        errorMessage = 'A network error caused the audio download to fail.';
        break;
      case 3: // MEDIA_ERR_DECODE
        errorMessage = 'The audio playback was aborted due to a corruption problem or because the media used features your browser does not support.';
        break;
      case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
        errorMessage = 'The audio could not be loaded, either because the server or network failed or because the format is not supported.';
        break;
    }
    setError(errorMessage);
    setIsLoading(false);
    setIsPlaying(false);
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (audioRef.current) {
      audioRef.current.volume = value[0];
      setVolume(value[0]);
    }
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const handleDownloadClick = useCallback(() => {
    if (onDownload) {
      onDownload();
    } else if (audioUrl && filename) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (audioUrl) {
      // Fallback for when filename is not provided, try to extract from src
      const parts = audioUrl.split('/');
      const defaultFilename = parts[parts.length - 1].split('?')[0]; // Remove query params
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = defaultFilename || 'audio_file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [onDownload, audioUrl, filename]);

  // Effect to load audio metadata when src changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      console.log('Loading audio from URL:', audioUrl);
      setIsLoading(true);
      setError(null);
      audioRef.current.load(); // Reload the audio element if src changes
      audioRef.current.volume = volume; // Set initial volume
      audioRef.current.playbackRate = playbackRate; // Set initial playback rate
    }
  }, [audioUrl, volume, playbackRate]);

  // Cleanup effect - only setup once, cleanup on unmount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Throttle timeupdate to reduce re-renders
    let timeUpdateTimeout: NodeJS.Timeout | null = null;
    const throttledTimeUpdate = () => {
      if (timeUpdateTimeout) return;
      timeUpdateTimeout = setTimeout(() => {
        handleTimeUpdate();
        timeUpdateTimeout = null;
      }, 100); // Update every 100ms instead of every frame
    };

    audio.addEventListener('timeupdate', throttledTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

      return () => {
        if (timeUpdateTimeout) {
          clearTimeout(timeUpdateTimeout);
        }
        audio.removeEventListener('timeupdate', throttledTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.pause();
        audio.src = ''; // Clear src to stop loading
      };
  }, [audioUrl]); // Only re-setup when URL changes

  return (
    <div className="audio-player p-4 border rounded-lg shadow-sm bg-card text-card-foreground w-full max-w-lg mx-auto">
      <audio ref={audioRef} src={audioUrl} preload="metadata" crossOrigin="anonymous" />

      {error && (
        <div className="mb-3 p-2 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      {filename && <p className="text-sm text-muted-foreground mb-3">{filename}</p>}

      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <svg className="animate-spin h-5 w-5 mr-3 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading audio...
        </div>
      )}

      <div className="flex items-center space-x-4 mb-3">
        <Button onClick={togglePlay} variant="ghost" size="icon" disabled={isLoading}>
          {isPlaying ? (
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </Button>

        <div className="flex-1">
          <Slider
            min={0}
            max={duration}
            step={0.1}
            value={[currentTime]}
            onValueChange={handleSeek}
            className="w-full"
            disabled={isLoading}
          />
        </div>

        <span className="text-sm font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-2">
          {/* Volume Control */}
          <svg className="h-5 w-5 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.616 3.076a1 1 0 011.09.217L19 6.586V13a1 1 0 01-1.707.707l-3.707-3.707a1 1 0 01-.217-1.09z" clipRule="evenodd" />
          </svg>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[volume]}
            onValueChange={handleVolumeChange}
            className="w-24"
            disabled={isLoading}
          />
        </div>

        {/* Playback Rate */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-8 text-sm px-2" disabled={isLoading}>
              {playbackRate.toFixed(2)}x
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {playbackRates.map((rate) => (
              <DropdownMenuItem key={rate} onClick={() => handlePlaybackRateChange(rate)}>
                {rate.toFixed(2)}x
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex space-x-2">
          {onDownload && (
            <Button onClick={handleDownloadClick} variant="outline" size="sm" disabled={isLoading}>
              Download
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </Button>
          )}
          {onDelete && (
            <Button onClick={onDelete} variant="destructive" size="sm">
              Delete
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1H9a1 1 0 00-1 1v3m-3 0h14"></path></svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;