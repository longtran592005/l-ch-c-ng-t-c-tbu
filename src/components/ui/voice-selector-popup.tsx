/**
 * Popup chọn giọng đọc cho Text-to-Speech
 * Hỗ trợ 2 giọng: Nam miền Bắc và Nữ miền Bắc
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, UserRound, Volume2, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface VoiceSelectorPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectVoice: (voiceType: 'male' | 'female') => void;
    isLoading?: boolean;
}

export const VoiceSelectorPopup = memo(({
    isOpen,
    onClose,
    onSelectVoice,
    isLoading
}: VoiceSelectorPopupProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-md border-primary/20 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary text-xl">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Volume2 className="h-4 w-4" />
                        </div>
                        Chọn giọng đọc AI
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground pt-1">
                        Văn bản sẽ được chuyển đổi sang giọng nói tự nhiên sử dụng công nghệ XTTS v2.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-6">
                    {/* Giọng nam */}
                    <Button
                        variant="outline"
                        className={cn(
                            "h-32 flex-col gap-3 group transition-all duration-300",
                            "hover:bg-blue-50 hover:border-blue-300 hover:shadow-md",
                            "border-slate-100 bg-slate-50/50"
                        )}
                        onClick={() => onSelectVoice('male')}
                        disabled={isLoading}
                    >
                        <div className="relative">
                            <div className="p-3 rounded-2xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                                <User className="h-8 w-8 text-blue-700" />
                            </div>
                            <div className="absolute -top-1 -right-1">
                                <Sparkles className="h-3 w-3 text-blue-500 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-700">Giọng Nam</span>
                            <span className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Miền Bắc</span>
                        </div>
                    </Button>

                    {/* Giọng nữ */}
                    <Button
                        variant="outline"
                        className={cn(
                            "h-32 flex-col gap-3 group transition-all duration-300",
                            "hover:bg-pink-50 hover:border-pink-300 hover:shadow-md",
                            "border-slate-100 bg-slate-50/50"
                        )}
                        onClick={() => onSelectVoice('female')}
                        disabled={isLoading}
                    >
                        <div className="relative">
                            <div className="p-3 rounded-2xl bg-pink-100 group-hover:bg-pink-200 transition-colors">
                                <UserRound className="h-8 w-8 text-pink-700" />
                            </div>
                            <div className="absolute -top-1 -right-1">
                                <Sparkles className="h-3 w-3 text-pink-500 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-700">Giọng Nữ</span>
                            <span className="text-[10px] uppercase tracking-wider text-pink-600 font-semibold">Miền Bắc</span>
                        </div>
                    </Button>
                </div>

                {isLoading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-lg z-50">
                        <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                        <p className="text-sm font-medium text-primary animate-pulse">Đang yêu cầu AI tổng hợp...</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
});

VoiceSelectorPopup.displayName = 'VoiceSelectorPopup';
