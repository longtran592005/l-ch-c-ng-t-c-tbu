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
    speak(text: string) {
        window.speechSynthesis?.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        window.speechSynthesis?.speak(utterance);
    }
}

const localTTS = new LocalTTS();

// Quản lý âm thanh toàn cục (Singleton)
// Đảm bảo tại một thời điểm chỉ có 1 âm thanh duy nhất được phát
let globalActiveAudio: HTMLAudioElement | null = null;

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

export const TTSButton: React.FC<TTSButtonProps> = ({ schedule, onStart, onEnd }) => {
    const [isAILoading, setIsAILoading] = useState(false);
    const [isAIPlaying, setIsAIPlaying] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Tự động dọn dẹp khi component bị hủy (unmount)
    useEffect(() => {
        return () => {
            if (audioRef.current && globalActiveAudio === audioRef.current) {
                stopAllTTS();
            }
        };
    }, []);

    const getTextToSpeak = () => {
        return `${schedule.content}. Tại ${schedule.location}. Do ${schedule.leader} chủ trì.`;
    };

    // Xử lý chọn giọng "Chỉ thẳng đường dẫn"
    const handleSelectVoice = async (voiceType: 'male' | 'female') => {
        if (!schedule?.id) return;

        setShowPopup(false);
        setIsAILoading(true);

        try {
            // TẮT TẤT CẢ âm thanh khác đang phát
            stopAllTTS();

            const fileName = `schedule_${schedule.id}.mp3`;
            const voiceDir = voiceType === 'male' ? 'male' : 'female';
            const directAudioUrl = `${getBackendRootUrl()}/uploads/tts/${voiceDir}/${fileName}?t=${Date.now()}`;

            console.log(`[TTS] Requesting voice from: ${directAudioUrl}`);

            // 1. Kiểm tra và nạp file
            const audio = new Audio();
            audio.crossOrigin = "anonymous";
            audio.src = directAudioUrl;

            const canPlay = await new Promise((resolve) => {
                audio.oncanplaythrough = () => resolve(true);
                audio.onerror = () => resolve(false);
                setTimeout(() => resolve(false), 2500); // 2.5s timeout
            });

            if (canPlay) {
                globalActiveAudio = audio;
                audioRef.current = audio;

                audio.onplay = () => {
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

                globalActiveAudio = newAudio;
                audioRef.current = newAudio;

                newAudio.onplay = () => {
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
            localTTS.speak(getTextToSpeak());
        }
    };

    const handleStop = (e: React.MouseEvent) => {
        e.stopPropagation();
        stopAllTTS();
        setIsAIPlaying(false);
        onEnd?.();
    };

    return (
        <div className="flex items-center gap-1 group">
            {isAIPlaying ? (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 animate-pulse bg-blue-50"
                    onClick={handleStop}
                    title="Dừng phát"
                >
                    <VolumeX className="h-4 w-4" />
                </Button>
            ) : (
                <Popover open={showPopup} onOpenChange={setShowPopup}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 group-hover:text-blue-600 transition-colors"
                            disabled={isAILoading}
                            title="Nghe lịch công tác chuyên nghiệp"
                        >
                            {isAILoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Chọn giọng AI miền Bắc</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start gap-2 h-9 text-blue-700 hover:bg-blue-50"
                                onClick={() => handleSelectVoice('male')}
                            >
                                <User className="h-4 w-4" />
                                <span>Nam Minh (Miền Bắc)</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start gap-2 h-9 text-pink-700 hover:bg-pink-50"
                                onClick={() => handleSelectVoice('female')}
                            >
                                <UserCheck className="h-4 w-4" />
                                <span>Hoài My (Miền Bắc)</span>
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
};
