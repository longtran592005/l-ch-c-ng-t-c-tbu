/**
 * TTS Button Component
 * 
 * Nút bấm để đọc văn bản thành giọng nói.
 * Có 3 trạng thái: idle, speaking, loading với animation tương ứng.
 * 
 * @author TBU AI Team
 * @version 1.0
 */

import { memo, useCallback } from 'react';
import { Volume2, VolumeX, Loader2, Volume1 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTTS, formatScheduleForTTS, TTSOptions } from '@/hooks/useTTS';
import { Schedule } from '@/types';

export interface TTSButtonProps {
    /** Văn bản cần đọc (ưu tiên hơn schedule) */
    text?: string;
    /** Lịch công tác (sẽ format thành văn bản) */
    schedule?: Schedule;
    /** Cấu hình TTS */
    options?: TTSOptions;
    /** Kích thước nút */
    size?: 'sm' | 'default' | 'lg' | 'icon';
    /** Variant của nút */
    variant?: 'default' | 'outline' | 'ghost' | 'secondary';
    /** ClassName bổ sung */
    className?: string;
    /** Hiển thị tooltip */
    showTooltip?: boolean;
    /** Callback khi bắt đầu đọc */
    onStart?: () => void;
    /** Callback khi kết thúc */
    onEnd?: () => void;
}

/**
 * Nút TTS với animation đẹp
 * 
 * @example
 * ```tsx
 * // Đọc văn bản trực tiếp
 * <TTSButton text="Xin chào các bạn!" />
 * 
 * // Đọc từ lịch công tác
 * <TTSButton schedule={scheduleItem} />
 * ```
 */
export const TTSButton = memo(({
    text,
    schedule,
    options,
    size = 'icon',
    variant = 'ghost',
    className,
    showTooltip = true,
    onStart,
    onEnd,
}: TTSButtonProps) => {
    const { speak, stop, isSpeaking, isLoading, isSupported, status } = useTTS(options);

    // Xác định văn bản cần đọc
    const getTextToSpeak = useCallback((): string => {
        if (text) return text;
        if (schedule) return formatScheduleForTTS(schedule);
        return '';
    }, [text, schedule]);

    // Xử lý click
    const handleClick = useCallback(() => {
        if (isSpeaking || isLoading) {
            stop();
            onEnd?.();
        } else {
            const textToSpeak = getTextToSpeak();
            if (textToSpeak) {
                speak(textToSpeak);
                onStart?.();
            }
        }
    }, [isSpeaking, isLoading, stop, speak, getTextToSpeak, onStart, onEnd]);

    // Không render nếu không hỗ trợ hoặc không có text
    if (!isSupported) {
        return null;
    }

    const textToSpeak = getTextToSpeak();
    if (!textToSpeak) {
        return null;
    }

    // Icon theo trạng thái
    const renderIcon = () => {
        if (isLoading) {
            return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
        }
        if (isSpeaking) {
            return (
                <div className="relative">
                    <Volume2 className="h-3.5 w-3.5" />
                    {/* Animation sóng âm */}
                    <span className="absolute -right-0.5 top-1/2 -translate-y-1/2">
                        <span className="flex space-x-0.5">
                            <span className="w-0.5 h-2 bg-current animate-[soundwave_0.5s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                            <span className="w-0.5 h-3 bg-current animate-[soundwave_0.5s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }} />
                            <span className="w-0.5 h-2 bg-current animate-[soundwave_0.5s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
                        </span>
                    </span>
                </div>
            );
        }
        return <Volume1 className="h-3.5 w-3.5" />;
    };

    // Tooltip text
    const tooltipText = isSpeaking ? 'Dừng đọc' : 'Đọc lịch công tác';

    const button = (
        <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className={cn(
                'transition-all duration-200',
                // Trạng thái idle
                !isSpeaking && !isLoading && 'text-muted-foreground hover:text-primary hover:bg-primary/10',
                // Trạng thái đang đọc
                isSpeaking && 'text-primary bg-primary/10 hover:bg-primary/20 ring-2 ring-primary/30',
                // Trạng thái loading
                isLoading && 'text-muted-foreground cursor-wait',
                // Size adjustments
                size === 'icon' && 'h-7 w-7',
                size === 'sm' && 'h-6 w-6 p-0',
                className
            )}
            title={tooltipText}
            aria-label={tooltipText}
        >
            {renderIcon()}
        </Button>
    );

    if (showTooltip) {
        return (
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {button}
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                        {tooltipText}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return button;
});

TTSButton.displayName = 'TTSButton';

export default TTSButton;
