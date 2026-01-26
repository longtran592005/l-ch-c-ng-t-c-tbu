/**
 * TTS (Text-to-Speech) Service Hook
 * 
 * Hook này quản lý việc đọc văn bản thành giọng nói.
 * Hiện tại sử dụng Web Speech API (browser built-in).
 * Sau này có thể thay thế bằng model TTS custom (Coqui, XTTS, VinAI...).
 * 
 * @author TBU AI Team
 * @version 1.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export type TTSStatus = 'idle' | 'loading' | 'speaking' | 'paused' | 'error';

export interface TTSOptions {
    /** Ngôn ngữ (mặc định: vi-VN) */
    lang?: string;
    /** Tốc độ đọc (0.1 - 10, mặc định: 1) */
    rate?: number;
    /** Cao độ giọng (0 - 2, mặc định: 1) */
    pitch?: number;
    /** Âm lượng (0 - 1, mặc định: 1) */
    volume?: number;
    /** Voice name (nếu có nhiều giọng) */
    voiceName?: string;
}

export interface UseTTSReturn {
    /** Trạng thái hiện tại */
    status: TTSStatus;
    /** Đang đọc hay không */
    isSpeaking: boolean;
    /** Đang tải hay không */
    isLoading: boolean;
    /** Lỗi nếu có */
    error: string | null;
    /** Danh sách voices có sẵn */
    voices: SpeechSynthesisVoice[];
    /** Bắt đầu đọc văn bản */
    speak: (text: string, options?: TTSOptions) => void;
    /** Dừng đọc */
    stop: () => void;
    /** Tạm dừng */
    pause: () => void;
    /** Tiếp tục đọc */
    resume: () => void;
    /** Kiểm tra TTS có được hỗ trợ không */
    isSupported: boolean;
}

/**
 * Custom hook để sử dụng Text-to-Speech
 * 
 * @example
 * ```tsx
 * const { speak, stop, isSpeaking, isSupported } = useTTS();
 * 
 * return (
 *   <button onClick={() => speak("Xin chào!")}>
 *     {isSpeaking ? "Đang đọc..." : "Đọc"}
 *   </button>
 * );
 * ```
 */
export function useTTS(defaultOptions?: TTSOptions): UseTTSReturn {
    const [status, setStatus] = useState<TTSStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

    // Kiểm tra browser có hỗ trợ không
    const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // Load voices khi component mount
    useEffect(() => {
        if (!isSupported || !synth) return;

        const loadVoices = () => {
            const availableVoices = synth.getVoices();
            setVoices(availableVoices);
        };

        // Voices có thể load async
        loadVoices();
        synth.onvoiceschanged = loadVoices;

        return () => {
            synth.onvoiceschanged = null;
        };
    }, [isSupported, synth]);

    // Cleanup khi unmount
    useEffect(() => {
        return () => {
            if (synth) {
                synth.cancel();
            }
        };
    }, [synth]);

    /**
     * Tìm voice phù hợp (ưu tiên tiếng Việt)
     */
    const findVoice = useCallback((lang: string = 'vi-VN', voiceName?: string): SpeechSynthesisVoice | null => {
        if (voices.length === 0) return null;

        // Nếu chỉ định voice name
        if (voiceName) {
            const namedVoice = voices.find(v => v.name.toLowerCase().includes(voiceName.toLowerCase()));
            if (namedVoice) return namedVoice;
        }

        // Tìm voice theo ngôn ngữ
        const langVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
        if (langVoice) return langVoice;

        // Fallback: voice đầu tiên
        return voices[0];
    }, [voices]);

    /**
     * Đọc văn bản
     */
    const speak = useCallback((text: string, options?: TTSOptions) => {
        if (!isSupported || !synth) {
            setError('Trình duyệt không hỗ trợ Text-to-Speech');
            setStatus('error');
            return;
        }

        // Dừng nếu đang đọc
        synth.cancel();

        const mergedOptions = { ...defaultOptions, ...options };
        const utterance = new SpeechSynthesisUtterance(text);

        // Cấu hình
        utterance.lang = mergedOptions.lang || 'vi-VN';
        utterance.rate = mergedOptions.rate || 1;
        utterance.pitch = mergedOptions.pitch || 1;
        utterance.volume = mergedOptions.volume || 1;

        // Tìm voice
        const voice = findVoice(utterance.lang, mergedOptions.voiceName);
        if (voice) {
            utterance.voice = voice;
        }

        // Event handlers
        utterance.onstart = () => {
            setStatus('speaking');
            setError(null);
        };

        utterance.onend = () => {
            setStatus('idle');
        };

        utterance.onerror = (event) => {
            console.error('[TTS] Error:', event.error);
            setError(`Lỗi TTS: ${event.error}`);
            setStatus('error');
        };

        utterance.onpause = () => {
            setStatus('paused');
        };

        utterance.onresume = () => {
            setStatus('speaking');
        };

        utteranceRef.current = utterance;
        setStatus('loading');

        // Bắt đầu đọc
        synth.speak(utterance);
    }, [isSupported, synth, defaultOptions, findVoice]);

    /**
     * Dừng đọc
     */
    const stop = useCallback(() => {
        if (synth) {
            synth.cancel();
            setStatus('idle');
        }
    }, [synth]);

    /**
     * Tạm dừng
     */
    const pause = useCallback(() => {
        if (synth && synth.speaking) {
            synth.pause();
        }
    }, [synth]);

    /**
     * Tiếp tục
     */
    const resume = useCallback(() => {
        if (synth && synth.paused) {
            synth.resume();
        }
    }, [synth]);

    return {
        status,
        isSpeaking: status === 'speaking',
        isLoading: status === 'loading',
        error,
        voices,
        speak,
        stop,
        pause,
        resume,
        isSupported,
    };
}

/**
 * Hàm tiện ích: Format lịch công tác thành văn bản đọc
 */
export function formatScheduleForTTS(schedule: {
    content?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    leader?: string;
    participants?: string[];
    date?: Date | string;
}): string {
    const parts: string[] = [];

    // Thời gian
    if (schedule.startTime) {
        const timeStr = schedule.endTime
            ? `Từ ${schedule.startTime} đến ${schedule.endTime}`
            : `Lúc ${schedule.startTime}`;
        parts.push(timeStr);
    }

    // Nội dung
    if (schedule.content) {
        parts.push(schedule.content);
    }

    // Địa điểm
    if (schedule.location) {
        parts.push(`tại ${schedule.location}`);
    }

    // Chủ trì
    if (schedule.leader) {
        parts.push(`do ${schedule.leader} chủ trì`);
    }

    // Thành phần tham dự
    if (schedule.participants && schedule.participants.length > 0) {
        parts.push(`với sự tham gia của ${schedule.participants.join(', ')}`);
    }

    return parts.join('. ') + '.';
}

export default useTTS;
