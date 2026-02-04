/**
 * TTSButton Component
 * Biểu tượng loa cho phép nghe lịch công tác bằng AI
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Loader2, User, UserCheck } from 'lucide-react';
import { Button } from './button';
import { Schedule } from '@prisma/client';
import { api } from '@/services/api';
import { getBackendRootUrl } from '@/lib/utils';
import { toast } from 'sonner';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// Fallback local TTS
class LocalTTS {
    speak(text: string, rate: number = 1) {
        window.speechSynthesis?.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = rate;
        window.speechSynthesis?.speak(utterance);
    }
}

const localTTS = new LocalTTS();

// Quản lý âm thanh toàn cục (Singleton)
// Đảm bảo tại một thời điểm chỉ có 1 âm thanh duy nhất được phát
let globalActiveAudio: HTMLAudioElement | null = null;
let currentPlaybackRate = 1;

const stopAllTTS = () => {
    if (globalActiveAudio) {
        globalActiveAudio.pause();
        globalActiveAudio.src = "";
        globalActiveAudio = null;
    }
    window.speechSynthesis?.cancel();
};

interface TTSButtonProps {
    schedule: Schedule;
    onStart?: () => void;
    onEnd?: () => void;
}

const SPEED_OPTIONS = [
    { label: '1.0x', value: 1.0 },
    { label: '1.2x', value: 1.2 },
    { label: '1.5x', value: 1.5 },
];

export const TTSButton: React.FC<TTSButtonProps> = ({ schedule, onStart, onEnd }) => {
    const [isAILoading, setIsAILoading] = useState(false);
    const [isAIPlaying, setIsAIPlaying] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(currentPlaybackRate);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Cập nhật tốc độ toàn cục khi thay đổi
    useEffect(() => {
        currentPlaybackRate = playbackSpeed;
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    // Tự động dọn dẹp khi component bị hủy (unmount)
    useEffect(() => {
        return () => {
            if (audioRef.current && globalActiveAudio === audioRef.current) {
                stopAllTTS();
            }
        };
    }, []);

    const getTextToSpeak = () => {
        const d = new Date(schedule.date);
        const dateStr = `Ngày ${d.getDate()} tháng ${d.getMonth() + 1}`;
        const timeStr = schedule.startTime ? `Lúc ${schedule.startTime}` : "";

        return `${timeStr}, ${dateStr}. Nội dung: ${schedule.content}. Tại ${schedule.location}. Do ${schedule.leader} chủ trì.`;
    };

    // Xử lý chọn giọng "Chỉ thẳng đường dẫn"
    const handleSelectVoice = async (voiceType: 'male' | 'female', speed?: number) => {
        if (!schedule?.id) return;

        const targetSpeed = speed || playbackSpeed;
        setShowPopup(false);
        setIsAILoading(true);

        try {
            // TẮT TẤT CẢ âm thanh khác đang phát
            stopAllTTS();

            const fileName = `schedule_${schedule.id}.mp3`;
            const voiceDir = voiceType === 'male' ? 'male' : 'female';
            const directAudioUrl = `${getBackendRootUrl()}/uploads/tts/${voiceDir}/${fileName}?t=${Date.now()}`;

            console.log(`[TTS] Requesting voice from: ${directAudioUrl} at ${targetSpeed}x`);

            // 1. Kiểm tra và nạp file
            const audio = new Audio();
            audio.crossOrigin = "anonymous";
            audio.src = directAudioUrl;
            audio.playbackRate = targetSpeed;

            const canPlay = await new Promise((resolve) => {
                audio.oncanplaythrough = () => resolve(true);
                audio.onerror = () => resolve(false);
                setTimeout(() => resolve(false), 2500); // 2.5s timeout
            });

            if (canPlay) {
                globalActiveAudio = audio;
                audioRef.current = audio;

                audio.onplay = () => {
                    audio.playbackRate = targetSpeed;
                    setIsAIPlaying(true);
                    setIsAILoading(false);
                    onStart?.();
                };

                audio.onended = () => {
                    if (globalActiveAudio === audio) globalActiveAudio = null;
                    setIsAIPlaying(false);
                    onEnd?.();
                };

                await audio.play();
                return;
            }

            // 2. Nếu file chưa có, yêu cầu AI tạo mới
            console.log(`[TTS] File not found, generating...`);
            const genRes = await api.post<{ success: boolean; audioUrl?: string }>(
                `/tts/generate/${schedule.id}`,
                { voiceType }
            );

            if (genRes.success && genRes.audioUrl) {
                const newUrl = `${getBackendRootUrl()}${genRes.audioUrl}?t=${Date.now()}`;
                const newAudio = new Audio(newUrl);
                newAudio.crossOrigin = "anonymous";
                newAudio.playbackRate = targetSpeed;

                globalActiveAudio = newAudio;
                audioRef.current = newAudio;

                newAudio.onplay = () => {
                    newAudio.playbackRate = targetSpeed;
                    setIsAIPlaying(true);
                    setIsAILoading(false);
                    onStart?.();
                };

                newAudio.onended = () => {
                    if (globalActiveAudio === newAudio) globalActiveAudio = null;
                    setIsAIPlaying(false);
                    onEnd?.();
                };

                await newAudio.play();
            } else {
                throw new Error('AI Server is busy');
            }

        } catch (error: any) {
            console.error('[TTS] Error:', error);
            setIsAILoading(false);
            toast.error('Đang phát giọng đọc dự phòng...');
            localTTS.speak(getTextToSpeak(), targetSpeed);
        }
    };

    const handleStop = (e: React.MouseEvent) => {
        e.stopPropagation();
        stopAllTTS();
        setIsAIPlaying(false);
        onEnd?.();
    };

    return (
        <div className="flex items-center justify-center min-w-[32px]">
            {isAIPlaying ? (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 animate-pulse bg-blue-50 hover:bg-blue-100"
                    onClick={handleStop}
                    title="Dừng phát"
                >
                    <VolumeX className="h-5 w-5" />
                </Button>
            ) : (
                <Popover open={showPopup} onOpenChange={setShowPopup}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-all shadow-sm sm:shadow-none"
                            disabled={isAILoading}
                            title="Nghe lịch công tác (AI)"
                        >
                            {isAILoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            ) : (
                                <Volume2 className="h-5 w-5" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3 shadow-xl border-blue-100" align="start" side="right" sideOffset={10}>
                        <div className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <p className="text-[10px] uppercase font-bold text-slate-400 px-1">Tốc độ đọc</p>
                                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                                    {SPEED_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setPlaybackSpeed(opt.value);
                                            }}
                                            className={`flex-1 h-7 text-[11px] rounded-md transition-all ${playbackSpeed === opt.value
                                                ? "bg-white text-blue-600 shadow-sm font-bold scale-105"
                                                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 px-1">Giọng AI miền Bắc</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start gap-2 h-9 text-blue-700 hover:bg-blue-50 w-full"
                                    onClick={() => handleSelectVoice('male')}
                                >
                                    <User className="h-4 w-4" />
                                    <span>Nam Minh (Miền Bắc)</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start gap-2 h-9 text-pink-700 hover:bg-pink-50 w-full"
                                    onClick={() => handleSelectVoice('female')}
                                >
                                    <UserCheck className="h-4 w-4" />
                                    <span>Hoài My (Miền Bắc)</span>
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
};
