/**
 * Voice-Guided Schedule Form v2.1 - Floating Premium Edition
 * Form nhập lịch công tác bằng giọng nói với giao diện Floating FAB cao cấp
 * 
 * Features:
 * - Floating Mic Button: Nút nổi cố định ở góc form
 * - Ghi âm liên tục, tự động chuyển ô khi nghe "hết"
 * - Nút dừng/tiếp tục ghi âm & Xóa ô
 * - Wave animation cực đẹp khi đang nghe
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    Mic,
    MicOff,
    Loader2,
    CalendarIcon,
    CheckCircle2,
    Volume2,
    Pause,
    Play,
    Trash2,
    X,
    Keyboard
} from 'lucide-react';

import {
    processVoiceInput,
    getNextField,
    getFieldMetadata,
    SCHEDULE_FIELDS,
    type ScheduleField,
    type VoiceProcessingResult
} from '@/services/voiceAI.service';
import { ScheduleEventType } from '@/types';

// ========================
// TYPES
// ========================

interface VoiceGuidedScheduleFormProps {
    onSubmit: (data: ScheduleFormData) => void;
    onCancel: () => void;
    initialData?: Partial<ScheduleFormData>;
    autoStartVoice?: boolean;
}

export interface ScheduleFormData {
    date: Date;
    startTime: string;
    endTime: string;
    content: string;
    location: string;
    leader: string;
    participants: string;
    preparingUnit: string;
    eventType: ScheduleEventType | '';
    notes: string;
}

// ========================
// COMPONENT
// ========================

export function VoiceGuidedScheduleForm({
    onSubmit,
    onCancel,
    initialData,
    autoStartVoice = false // Mặc định không tự bật để người dùng chủ động bấm nút Mic nổi
}: VoiceGuidedScheduleFormProps) {
    const { toast } = useToast();

    // Form data
    const [formData, setFormData] = useState<ScheduleFormData>({
        date: initialData?.date || new Date(),
        startTime: initialData?.startTime || '08:00',
        endTime: initialData?.endTime || '10:00',
        content: initialData?.content || '',
        location: initialData?.location || '',
        leader: initialData?.leader || '',
        participants: initialData?.participants || '',
        preparingUnit: initialData?.preparingUnit || '',
        eventType: (initialData?.eventType as ScheduleEventType) || '',
        notes: initialData?.notes || ''
    });

    // Voice state
    const [isVoiceMode, setIsVoiceMode] = useState(autoStartVoice);
    const [isListening, setIsListening] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentField, setCurrentField] = useState<ScheduleField>('date');
    const [transcript, setTranscript] = useState('');
    const [completedFields, setCompletedFields] = useState<Set<ScheduleField>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [showControls, setShowControls] = useState(autoStartVoice);

    // Refs
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ========================
    // VOICE SYNTHESIS
    // ========================

    const speak = useCallback((text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            synthRef.current = utterance;
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    // ========================
    // VOICE RECOGNITION
    // ========================

    const startListening = useCallback(() => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            toast({
                title: 'Không hỗ trợ',
                description: 'Trình duyệt không hỗ trợ nhận dạng giọng nói',
                variant: 'destructive'
            });
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'vi-VN';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsListening(true);
            setIsPaused(false);
            const fieldMeta = getFieldMetadata(currentField);
            if (fieldMeta) {
                speak(fieldMeta.hint);
            }
        };

        recognition.onresult = (event: any) => {
            const current = event.resultIndex;
            const transcriptResult = event.results[current];
            const transcriptText = transcriptResult[0].transcript;

            setTranscript(transcriptText);

            if (transcriptResult.isFinal) {
                handleVoiceResult(transcriptText);
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.error('[Voice] Recognition error:', event.error);
                setIsListening(false);
            }
        };

        recognition.onend = () => {
            if (isVoiceMode && !isPaused) {
                setTimeout(() => {
                    if (recognitionRef.current && isVoiceMode && !isPaused) {
                        try {
                            recognitionRef.current.start();
                        } catch (e) { }
                    }
                }, 300);
            } else {
                setIsListening(false);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [currentField, toast, speak, isVoiceMode, isPaused]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
        setIsPaused(false);
        window.speechSynthesis.cancel();
    }, []);

    const pauseListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsPaused(true);
        setIsListening(false);
        window.speechSynthesis.cancel();
    }, []);

    const resumeListening = useCallback(() => {
        setIsPaused(false);
        startListening();
    }, [startListening]);

    // ========================
    // VOICE PROCESSING
    // ========================

    const handleVoiceResult = useCallback(async (transcriptText: string) => {
        const normalized = transcriptText.toLowerCase().trim();

        if (normalized.includes('xóa')) {
            updateFormField(currentField, null);
            setTranscript('');
            speak('Đã xóa. Vui lòng nói lại.');
            return;
        }

        setIsProcessing(true);

        try {
            const result: VoiceProcessingResult = await processVoiceInput(
                transcriptText,
                currentField
            );

            if (result.status === 'WAIT') return;

            if (result.status === 'DONE') {
                if (result.error) {
                    speak('Tôi không nghe rõ. Vui lòng nói lại.');
                    return;
                }

                if (result.field && result.value !== undefined) {
                    updateFormField(result.field, result.value);
                    setCompletedFields(prev => new Set(prev).add(result.field!));

                    const nextField = getNextField(currentField);
                    if (nextField) {
                        setCurrentField(nextField);
                        setTranscript('');
                        const nextFieldMeta = getFieldMetadata(nextField);
                        if (nextFieldMeta) {
                            speak(`Đã lưu. Tiếp theo: ${nextFieldMeta.label}`);
                        }
                    } else {
                        speak('Đã hoàn thành nhập liệu. Cảm ơn bạn.');
                        toast({
                            title: 'Hoàn thành',
                            description: 'Đã nhập xong tất cả thông tin bằng giọng nói'
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[Voice] Processing error:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [currentField, toast, speak]);

    const updateFormField = useCallback((field: ScheduleField, value: any) => {
        setFormData(prev => {
            const updated = { ...prev };
            switch (field) {
                case 'date':
                    if (value) {
                        const [year, month, day] = value.split('-').map(Number);
                        updated.date = new Date(year, month - 1, day);
                    }
                    break;
                case 'startTime':
                case 'endTime':
                    if (value) updated[field] = value.substring(0, 5);
                    else updated[field] = '';
                    break;
                case 'participants':
                    if (Array.isArray(value)) updated.participants = value.join(', ');
                    else if (value) updated.participants = value;
                    else updated.participants = '';
                    break;
                case 'eventType':
                    updated.eventType = value as ScheduleEventType || '';
                    break;
                default:
                    if (value !== null) (updated as any)[field] = value;
                    else (updated as any)[field] = '';
            }
            return updated;
        });
    }, []);

    const toggleVoiceMode = useCallback(() => {
        if (isVoiceMode) {
            stopListening();
            setIsVoiceMode(false);
            setShowControls(false);
        } else {
            setIsVoiceMode(true);
            setShowControls(true);
            speak('Đã bật trợ lý giọng nói. Hãy bắt đầu nói.');
            setTimeout(() => startListening(), 1000);
        }
    }, [isVoiceMode, stopListening, speak, startListening]);

    // ========================
    // RENDER FIELD
    // ========================

    const renderField = (fieldName: ScheduleField) => {
        const fieldMeta = getFieldMetadata(fieldName);
        if (!fieldMeta) return null;

        const isActive = isVoiceMode && currentField === fieldName;
        const isCompleted = completedFields.has(fieldName);

        return (
            <div className={cn(
                'group relative p-4 rounded-xl border transition-all duration-300',
                isActive ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-card shadow-sm hover:border-primary/50',
                isCompleted && !isActive && 'border-green-500/50 bg-green-50/30'
            )}>
                <Label className="flex items-center gap-2 mb-3 text-sm font-medium">
                    {fieldMeta.label} {fieldMeta.required && <span className="text-red-500">*</span>}
                    {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {isActive && <Volume2 className="h-4 w-4 text-primary animate-bounce" />}
                </Label>

                {fieldName === 'date' ? (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn('w-full justify-start text-left font-normal h-11 bg-background', isActive && 'border-primary')}
                                disabled={isVoiceMode && !isActive}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                {format(formData.date, 'dd/MM/yyyy', { locale: vi })}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={formData.date}
                                onSelect={(date) => date && setFormData({ ...formData, date })}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                ) : fieldName === 'startTime' || fieldName === 'endTime' ? (
                    <Input
                        type="time"
                        value={formData[fieldName]}
                        onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
                        className={cn('h-11 bg-background', isActive && 'border-primary')}
                        disabled={isVoiceMode && !isActive}
                    />
                ) : fieldName === 'content' ? (
                    <Textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder={fieldMeta.placeholder}
                        className={cn('min-h-[100px] bg-background resize-none', isActive && 'border-primary')}
                        disabled={isVoiceMode && !isActive}
                    />
                ) : fieldName === 'eventType' ? (
                    <Select
                        value={formData.eventType}
                        onValueChange={(value) => setFormData({ ...formData, eventType: value as ScheduleEventType })}
                        disabled={isVoiceMode && !isActive}
                    >
                        <SelectTrigger className={cn('h-11 bg-background', isActive && 'border-primary')}>
                            <SelectValue placeholder="Chọn loại sự kiện" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cuoc_hop">Cuộc họp</SelectItem>
                            <SelectItem value="hoi_nghi">Hội nghị</SelectItem>
                            <SelectItem value="tam_ngung">Tạm ngưng</SelectItem>
                        </SelectContent>
                    </Select>
                ) : (
                    <Input
                        value={(formData as any)[fieldName] || ''}
                        onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
                        placeholder={fieldMeta.placeholder}
                        className={cn('h-11 bg-background', isActive && 'border-primary')}
                        disabled={isVoiceMode && !isActive}
                    />
                )}

                {isActive && (
                    <div className="absolute inset-x-0 -bottom-2 flex justify-center">
                        <div className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-primary-foreground/20 animate-in fade-in slide-in-from-top-1">
                            Đang nghe: {transcript || "..."}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div ref={containerRef} className="relative min-h-[500px] pb-24">
            {/* Form Fields Header */}
            <div className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-6">
                    {renderField('date')}
                    <div className="grid grid-cols-2 gap-3">
                        {renderField('startTime')}
                        {renderField('endTime')}
                    </div>
                </div>

                {renderField('content')}

                <div className="grid md:grid-cols-2 gap-6">
                    {renderField('leader')}
                    {renderField('location')}
                </div>

                {renderField('participants')}

                <div className="grid md:grid-cols-2 gap-6">
                    {renderField('preparingUnit')}
                    {renderField('eventType')}
                </div>

                {renderField('notes')}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
                <div className="max-w-2xl mx-auto flex justify-end gap-3 pointer-events-auto">
                    <Button variant="outline" size="lg" onClick={onCancel} className="px-8">
                        Hủy
                    </Button>
                    <Button
                        size="lg"
                        onClick={() => onSubmit(formData)}
                        disabled={!formData.date || !formData.startTime || !formData.content || !formData.location || !formData.leader || !formData.eventType}
                        className="px-8 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all"
                    >
                        Lưu lịch công tác
                    </Button>
                </div>
            </div>

            {/* ========================
          VOICE FAB (STICKY/FIXED)
          ======================== */}
            <div className="fixed bottom-24 right-8 z-[100] flex flex-col items-end gap-3 pointer-events-none">
                {/* Voice Transcript Bubble */}
                {isVoiceMode && (isListening || transcript) && (
                    <div className="mb-2 max-w-[250px] bg-card/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-primary/20 pointer-events-auto animate-in slide-in-from-right-4 fade-in">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Live Voice</span>
                        </div>
                        <p className="text-sm italic leading-tight text-foreground/80">
                            "{transcript || "Đang lắng nghe..."}"
                        </p>
                    </div>
                )}

                {/* Voice Control Bar (Expanded when active) */}
                {showControls && (
                    <div className="flex items-center gap-2 bg-background/80 backdrop-blur-lg p-2 rounded-full shadow-2xl border border-border pointer-events-auto animate-in slide-in-from-bottom-8">
                        {isListening ? (
                            <Button variant="ghost" size="icon" onClick={pauseListening} className="rounded-full h-10 w-10 text-orange-500 hover:text-orange-600 hover:bg-orange-50">
                                <Pause className="h-5 w-5" />
                            </Button>
                        ) : (
                            <Button variant="ghost" size="icon" onClick={resumeListening} className="rounded-full h-10 w-10 text-green-500 hover:text-green-600 hover:bg-green-50">
                                <Play className="h-5 w-5" />
                            </Button>
                        )}

                        <Button variant="ghost" size="icon" onClick={() => updateFormField(currentField, null)} className="rounded-full h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-50">
                            <Trash2 className="h-5 w-5" />
                        </Button>

                        <div className="w-[1px] h-6 bg-border mx-1" />

                        <Button variant="ghost" size="icon" onClick={() => setShowControls(false)} className="rounded-full h-10 w-10 text-muted-foreground">
                            <Keyboard className="h-5 w-5" />
                        </Button>
                    </div>
                )}

                {/* The Main FAB Button */}
                <div className="pointer-events-auto relative">
                    {isListening && !isPaused && (
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    )}

                    <Button
                        size="icon"
                        onClick={isVoiceMode ? toggleVoiceMode : toggleVoiceMode}
                        className={cn(
                            "h-16 w-16 rounded-full shadow-2xl transition-all duration-500 transform hover:scale-105 active:scale-95",
                            isVoiceMode
                                ? (isListening ? "bg-primary scale-110" : "bg-orange-500")
                                : "bg-gradient-to-br from-indigo-600 to-violet-700"
                        )}
                    >
                        {isProcessing ? (
                            <Loader2 className="h-8 w-8 animate-spin" />
                        ) : isVoiceMode ? (
                            isListening ? <Mic className="h-8 w-8 text-white" /> : <MicOff className="h-8 w-8 text-white" />
                        ) : (
                            <Mic className="h-8 w-8 text-white" />
                        )}
                    </Button>

                    {/* Premium Mic Wave Effect (when listening) */}
                    {isListening && !isPaused && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-0.5 h-8">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-primary rounded-full animate-pulse"
                                    style={{
                                        height: `${20 + Math.random() * 80}%`,
                                        animationDelay: `${i * 0.1}s`,
                                        animationDuration: '0.5s'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
