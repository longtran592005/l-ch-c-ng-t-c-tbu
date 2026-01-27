/**
 * Voice-Guided Schedule Form v3.1 - Standard Production Edition
 * Fully synchronized with CamelCase Backend & Qwen-2.5.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Mic, MicOff, Loader2, CalendarIcon, CheckCircle2, Volume2, Trash2 } from 'lucide-react';

import {
    processVoiceInput,
    getNextField,
    getFieldMetadata,
    SCHEDULE_FIELDS,
    type ScheduleField,
    type VoiceProcessingResult
} from '@/services/voiceAI.service';
import { ScheduleEventType } from '@/types';

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
    cooperatingUnits: string; // Đơn vị/cá nhân phối hợp
    eventType: ScheduleEventType | '';
}

export function VoiceGuidedScheduleForm({ onSubmit, onCancel, initialData, autoStartVoice = false }: VoiceGuidedScheduleFormProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState<ScheduleFormData>({
        date: initialData?.date || new Date(),
        startTime: initialData?.startTime || '08:00',
        endTime: initialData?.endTime || '10:00',
        content: initialData?.content || '',
        location: initialData?.location || '',
        leader: initialData?.leader || '',
        participants: initialData?.participants || '',
        preparingUnit: initialData?.preparingUnit || '',
        cooperatingUnits: initialData?.cooperatingUnits || '',
        eventType: (initialData?.eventType as ScheduleEventType) || '',
    });

    const [isVoiceMode, setIsVoiceMode] = useState(autoStartVoice);
    const [isListening, setIsListening] = useState(false);
    const [currentField, setCurrentField] = useState<ScheduleField>('date');
    const [transcript, setTranscript] = useState('');
    const [completedFields, setCompletedFields] = useState<Set<ScheduleField>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);

    const recognitionRef = useRef<any>(null);
    const isVoiceModeRef = useRef(isVoiceMode);
    const currentFieldRef = useRef(currentField);
    const isProcessingLockRef = useRef(false);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { isVoiceModeRef.current = isVoiceMode; }, [isVoiceMode]);
    useEffect(() => { currentFieldRef.current = currentField; }, [currentField]);

    const updateFormField = useCallback((field: ScheduleField, value: any) => {
        console.log('[VoiceForm] updateFormField called with:', field, value);
        setFormData(prev => {
            const next = { ...prev };
            if (value === null) {
                if (field === 'date') next.date = new Date();
                else (next as any)[field] = '';
                return next;
            }

            switch (field) {
                case 'date':
                    if (typeof value === 'string') {
                        // Handle YYYY-MM-DD format
                        if (value.includes('-')) {
                            const [y, m, d] = value.split('-').map(Number);
                            if (y && m && d) {
                                next.date = new Date(y, m - 1, d);
                            }
                        } else if (value.includes('/')) {
                            // Handle DD/MM/YYYY format
                            const [d, m, y] = value.split('/').map(Number);
                            if (y && m && d) {
                                next.date = new Date(y, m - 1, d);
                            }
                        }
                    } else if (value instanceof Date) {
                        next.date = value;
                    }
                    break;
                case 'startTime':
                case 'endTime':
                    if (typeof value === 'string') {
                        let timeValue = value.trim();
                        if (timeValue.includes(':')) {
                            const [h, m] = timeValue.split(':');
                            (next as any)[field] = `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
                        } else if (/^\d{3,4}$/.test(timeValue)) {
                            // Handle format like "0800" or "800"
                            const padded = timeValue.padStart(4, '0');
                            (next as any)[field] = `${padded.slice(0, 2)}:${padded.slice(2)}`;
                        } else {
                            // Try to extract hours from text like "8 giờ"
                            const hourMatch = timeValue.match(/(\d{1,2})/);
                            if (hourMatch) {
                                (next as any)[field] = `${hourMatch[1].padStart(2, '0')}:00`;
                            }
                        }
                    }
                    break;
                case 'participants':
                    next.participants = Array.isArray(value) ? value.join(', ') : String(value);
                    break;
                default:
                    (next as any)[field] = String(value);
            }
            console.log('[VoiceForm] Updated formData:', next);
            return next;
        });
        if (value !== null) setCompletedFields(prev => new Set(prev).add(field));
    }, []);

    const processFinalResult = useCallback(async (text: string) => {
        if (isProcessingLockRef.current) return;
        isProcessingLockRef.current = true;
        setIsProcessing(true);

        try {
            const fieldAtCall = currentFieldRef.current;
            const result: VoiceProcessingResult = await processVoiceInput(text, fieldAtCall);

            if (result.status === 'DONE') {
                if (result.value !== undefined) {
                    updateFormField(fieldAtCall, result.value);
                }
                const next = getNextField(fieldAtCall);
                if (next) {
                    setCurrentField(next);
                    setTranscript('');
                } else {
                    toast({ title: 'Hoàn thành nhập liệu giọng nói' });
                }
            }
        } catch (err) {
            console.error('Processing Failure:', err);
        } finally {
            setIsProcessing(false);
            isProcessingLockRef.current = false;
        }
    }, [updateFormField, toast]);

    const startRecording = useCallback(() => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'vi-VN';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            if (isProcessingLockRef.current) return;
            const index = event.resultIndex;
            const text = event.results[index][0].transcript;
            setTranscript(text);

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            if (/(hết|xong|kết thúc)/i.test(text)) {
                processFinalResult(text);
            } else {
                silenceTimerRef.current = setTimeout(() => {
                    processFinalResult(text + " xong"); // Add implicit keyword
                }, 3000);
            }
        };

        recognition.onend = () => {
            if (isVoiceModeRef.current) {
                setTimeout(() => {
                    try { recognitionRef.current?.start(); } catch { }
                }, 100);
            } else {
                setIsListening(false);
            }
        };

        recognition.onerror = (e: any) => {
            console.warn('STT Error:', e.error);
            if (e.error !== 'no-speech') setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [processFinalResult]);

    const stopRecording = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
        }
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }, []);

    const toggleVoice = useCallback(() => {
        if (isVoiceMode) {
            stopRecording();
            setIsVoiceMode(false);
        } else {
            setIsVoiceMode(true);
            startRecording();
        }
    }, [isVoiceMode, startRecording, stopRecording]);

    useEffect(() => () => stopRecording(), [stopRecording]);

    const renderField = (fieldName: ScheduleField) => {
        const meta = getFieldMetadata(fieldName);
        if (!meta) return null;
        const isActive = isVoiceMode && currentField === fieldName;
        const isCompleted = completedFields.has(fieldName);

        return (
            <div className={cn(
                'relative p-4 rounded-xl border transition-all duration-300',
                isActive ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-card shadow-sm',
                isCompleted && !isActive && 'border-green-500/50 bg-green-50/10'
            )}>
                <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground/80">
                    {meta.label} {meta.required && <span className="text-red-500">*</span>}
                    {isCompleted && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    {isActive && <Volume2 className="h-3 w-3 text-primary animate-bounce" />}
                </Label>

                {fieldName === 'date' ? (
                    <Popover><PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start h-10', isActive && 'border-primary')} disabled={isVoiceMode && !isActive} onClick={() => setCurrentField('date')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.date ? format(formData.date, 'dd/MM/yyyy', { locale: vi }) : 'Chọn ngày'}
                        </Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[120]"><Calendar mode="single" selected={formData.date} onSelect={(d) => d && updateFormField('date', d)} /></PopoverContent>
                    </Popover>
                ) : meta.type === 'time' ? (
                    <Input type="time" value={(formData as any)[fieldName]} onChange={(e) => updateFormField(fieldName, e.target.value)} className={cn('h-10 text-base font-bold', isActive && 'border-primary')} disabled={isVoiceMode && !isActive} onClick={() => setCurrentField(fieldName)} />
                ) : fieldName === 'content' ? (
                    <Textarea value={formData.content} onChange={(e) => updateFormField('content', e.target.value)} className={cn('min-h-[80px] text-sm leading-relaxed', isActive && 'border-primary')} disabled={isVoiceMode && !isActive} onClick={() => setCurrentField('content')} />
                ) : fieldName === 'eventType' ? (
                    <Select value={formData.eventType} onValueChange={(v) => updateFormField('eventType', v)} disabled={isVoiceMode && !isActive}>
                        <SelectTrigger className={cn('h-10', isActive && 'border-primary')} onClick={() => setCurrentField('eventType')}><SelectValue placeholder="Chọn loại..." /></SelectTrigger>
                        <SelectContent className="z-[120]">
                            {meta.enumValues?.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                ) : (
                    <Input value={(formData as any)[fieldName] || ''} onChange={(e) => updateFormField(fieldName, e.target.value)} className={cn('h-10 text-sm', isActive && 'border-primary')} disabled={isVoiceMode && !isActive} onClick={() => setCurrentField(fieldName)} />
                )}

                {isActive && (
                    <div className="absolute inset-x-0 -bottom-3 flex justify-center z-[110]">
                        <div className="bg-primary text-primary-foreground text-[10px] px-3 py-1.5 rounded-full shadow-2xl border border-white/20 animate-in fade-in slide-in-from-top-1">
                            {isProcessing ? "Qwen đang xử lý..." : `Ghi âm: ${transcript || "..."}`}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="relative min-h-[500px] mb-6">
            <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">{renderField('date')}<div className="grid grid-cols-2 gap-2">{renderField('startTime')}{renderField('endTime')}</div></div>
                {renderField('content')}
                {renderField('participants')}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderField('location')}{renderField('leader')}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderField('preparingUnit')}{renderField('cooperatingUnits')}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderField('eventType')}</div>
            </div>

            <div className="mt-10 flex flex-col md:flex-row justify-end gap-3 pt-6 border-t border-border/50">
                <Button variant="ghost" size="lg" onClick={onCancel} className="px-10 h-12 order-2 md:order-1" disabled={isProcessing}>Hủy bỏ</Button>
                <Button size="lg" onClick={() => {
                    // Validate required fields before submit
                    const requiredFields = [
                        { field: 'content', label: 'Nội dung' },
                        { field: 'location', label: 'Địa điểm' },
                    ];

                    for (const { field, label } of requiredFields) {
                        if (!(formData as any)[field]?.trim()) {
                            toast({
                                title: 'Thiếu thông tin',
                                description: `Vui lòng nhập ${label}`,
                                variant: 'destructive'
                            });
                            return;
                        }
                    }

                    onSubmit(formData);
                }} disabled={isProcessing} className="px-12 h-12 bg-primary hover:bg-primary/90 shadow-indigo-500/20 shadow-xl order-1 md:order-2">Lưu lịch công tác</Button>
            </div>

            <div className="fixed bottom-10 right-10 z-[200] flex flex-col items-end gap-3 pointer-events-none text-right">
                {isVoiceMode && (isListening || transcript) && (
                    <div className="mb-2 max-w-[280px] bg-card/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-primary/20 pointer-events-auto animate-in slide-in-from-right-8 fade-in">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={cn("h-2 w-2 rounded-full", isProcessing ? "bg-orange-500 animate-spin" : "bg-primary animate-pulse")} />
                            <span className="text-[11px] font-black uppercase tracking-widest text-primary/70">{isProcessing ? "Qwen Processing" : "Recording Continuously"}</span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed italic text-foreground/80">"{isProcessing ? "Đang nhờ Qwen chuẩn hóa dữ liệu..." : (transcript || "Tôi đang nghe...")}"</p>
                    </div>
                )}
                <div className="pointer-events-auto relative">
                    {isListening && !isProcessing && <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping -z-10" />}
                    <Button size="icon" disabled={isProcessing} onClick={toggleVoice} className={cn("h-20 w-20 rounded-full shadow-2xl transition-all duration-700 transform hover:scale-105 active:scale-95", isVoiceMode ? (isListening ? "bg-primary" : "bg-orange-500") : "bg-gradient-to-tr from-indigo-700 via-violet-600 to-fuchsia-500")}>
                        {isProcessing ? <Loader2 className="h-10 w-10 animate-spin text-white" /> : isVoiceMode ? <Mic className="h-10 w-10 text-white" /> : <MicOff className="h-10 w-10 text-white" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
