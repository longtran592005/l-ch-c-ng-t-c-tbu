/**
 * Voice-Guided Schedule Form v6.0 - WebSpeech + OpenCode.ai / Pollinations
 * - WebSpeech + OpenCode.ai: WebSpeech API for STT → OpenCode.ai LLM for text processing
 * - WebSpeech + Pollinations: WebSpeech API for STT → Pollinations LLM for text processing  
 * - Gemini: One-shot audio → value (unchanged)
 * - Toggle mic on/off interaction model (no keywords)
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
    tryLocalParse,
    SCHEDULE_FIELDS,
    type ScheduleField,
    type VoiceProcessingResult
} from '@/services/voiceAI.service';
import { ScheduleEventType } from '@/types';
import * as sttService from '@/services/stt.service';

interface VoiceGuidedScheduleFormProps {
    onSubmit: (data: ScheduleFormData) => void;
    onCancel: () => void;
    initialData?: Partial<ScheduleFormData>;
    autoStartVoice?: boolean;
}

export interface ScheduleFormData {
    date: Date;
    startTime: string;
    endTime?: string;
    content: string;
    location: string;
    leader: string;
    participants: string;
    preparingUnit: string;
    cooperatingUnits: string; // Đơn vị/cá nhân phối hợp
    eventType: ScheduleEventType | '';
    isSupplementary: boolean; // Lịch bổ sung (highlight vàng trong Excel)
}

export function VoiceGuidedScheduleForm({ onSubmit, onCancel, initialData, autoStartVoice = false }: VoiceGuidedScheduleFormProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState<ScheduleFormData>({
        date: initialData?.date || new Date(),
        startTime: initialData?.startTime || '08:00',
        endTime: initialData?.endTime || '',
        content: initialData?.content || '',
        location: initialData?.location || '',
        leader: initialData?.leader || '',
        participants: initialData?.participants || '',
        preparingUnit: initialData?.preparingUnit || '',
        cooperatingUnits: initialData?.cooperatingUnits || '',
        eventType: (initialData?.eventType as ScheduleEventType) || '',
        isSupplementary: initialData?.isSupplementary || false,
    });

    const [isVoiceMode, setIsVoiceMode] = useState(autoStartVoice);
    const [isListening, setIsListening] = useState(false);
    const [currentField, setCurrentField] = useState<ScheduleField>('date');
    const [transcript, setTranscript] = useState('');
    const [completedFields, setCompletedFields] = useState<Set<ScheduleField>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    
    // STT Provider state
    const [sttProvider, setSTTProvider] = useState<'webspeech' | 'gemini' | 'pollinations' | 'viettel'>('webspeech');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const recognitionRef = useRef<any>(null);
    const isVoiceModeRef = useRef(isVoiceMode);
    const currentFieldRef = useRef(currentField);
    const isProcessingLockRef = useRef(false);
    const accumulatedTranscriptRef = useRef<string>('');

    // Load STT provider preference on mount
    useEffect(() => {
        const loadSTTProvider = async () => {
            try {
                const config = await sttService.getSTTConfig();
                setSTTProvider(config.voiceForm.provider);
            } catch (error) {
                // Fallback to cached value or default
                setSTTProvider(sttService.getCurrentVoiceFormProvider());
            }
        };
        loadSTTProvider();
    }, []);

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
                        const dateStr = value.replace(/[.,!?]+$/g, '').trim();
                        // Handle YYYY-MM-DD format
                        if (dateStr.includes('-')) {
                            const [y, m, d] = dateStr.split('-').map(Number);
                            if (y && m && d) {
                                next.date = new Date(y, m - 1, d);
                            }
                        } else if (dateStr.includes('/')) {
                            // Handle DD/MM/YYYY or DD/MM format
                            const parts = dateStr.split('/').map(Number);
                            if (parts.length >= 2) {
                                const d = parts[0], m = parts[1], y = parts[2] || new Date().getFullYear();
                                if (y && m && d) {
                                    next.date = new Date(y, m - 1, d);
                                }
                            }
                        }
                    } else if (value instanceof Date) {
                        next.date = value;
                    }
                    break;
                case 'startTime':
                case 'endTime':
                    if (typeof value === 'string') {
                        let timeValue = value.replace(/[.,!?]+$/g, '').trim();
                        if (timeValue.includes(':')) {
                            const [h, m] = timeValue.split(':');
                            (next as any)[field] = `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
                        } else if (/^\d{3,4}$/.test(timeValue)) {
                            // Handle format like "0800" or "800"
                            const padded = timeValue.padStart(4, '0');
                            (next as any)[field] = `${padded.slice(0, 2)}:${padded.slice(2)}`;
                        } else {
                            // Handle "9h30", "14h", "8h30 sáng", "2h chiều", "8 giờ 30"
                            const hmMatch = timeValue.match(/(\d{1,2})\s*(?:h|giờ)\s*(\d{1,2})?/i);
                            if (hmMatch) {
                                let h = parseInt(hmMatch[1], 10);
                                const min = hmMatch[2] ? parseInt(hmMatch[2], 10) : 0;
                                if (/chiều|tối/.test(timeValue) && h < 12) h += 12;
                                (next as any)[field] = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                            } else {
                                // Fallback: extract first number as hour
                                const hourMatch = timeValue.match(/(\d{1,2})/);
                                if (hourMatch) {
                                    (next as any)[field] = `${hourMatch[1].padStart(2, '0')}:00`;
                                }
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
        if (isProcessingLockRef.current || !text.trim()) return;
        isProcessingLockRef.current = true;
        setIsProcessing(true);

        try {
            const fieldAtCall = currentFieldRef.current;
            // Map sttProvider → backend provider
            const provider = sttProvider === 'pollinations' ? 'pollinations' : 'opencode';
            const providerLabel = provider === 'pollinations' ? 'Pollinations' : 'OpenCode';
            
            const t0 = performance.now();
            const result: VoiceProcessingResult = await processVoiceInput(text, fieldAtCall, provider);
            const duration = ((performance.now() - t0) / 1000).toFixed(2);
            console.log(`⏱️ [WebSpeech+${providerLabel}] parse "${fieldAtCall}": ${duration}s | input="${text}" | output="${result.value}"`);

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
    }, [updateFormField, toast, sttProvider]);

    // ==================== Web Speech API Recording (for OpenCode + Pollinations) ====================
    const startWebSpeechRecording = useCallback(() => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            toast({ 
                title: 'Trình duyệt không hỗ trợ', 
                description: 'Vui lòng sử dụng Chrome hoặc Edge để dùng Web Speech API',
                variant: 'destructive'
            });
            return;
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'vi-VN';
        recognition.continuous = true;
        recognition.interimResults = true;

        accumulatedTranscriptRef.current = '';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            if (isProcessingLockRef.current) return;
            // Accumulate all results (final + interim) for live display
            let fullText = '';
            for (let i = 0; i < event.results.length; i++) {
                fullText += event.results[i][0].transcript;
            }
            setTranscript(fullText);
            accumulatedTranscriptRef.current = fullText;
        };

        recognition.onend = () => {
            // Do NOT auto-restart — user controls via toggle button
            setIsListening(false);
        };

        recognition.onerror = (e: any) => {
            console.warn('STT Error:', e.error);
            if (e.error !== 'no-speech') setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [toast]);

    // ==================== Gemini STT Recording ====================
    const startGeminiRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Chọn codec phù hợp nhất được browser hỗ trợ
            // Gemini hỗ trợ: audio/wav, audio/mp3, audio/webm, audio/ogg, audio/flac
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                'audio/wav'
            ];
            
            let selectedMimeType = 'audio/webm';
            for (const mimeType of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedMimeType = mimeType;
                    break;
                }
            }
            
            const providerTag = sttProvider === 'viettel' ? 'Viettel' : 'Gemini';
            console.log(`[${providerTag} Recording] Using mime type:`, selectedMimeType);
            
            const mediaRecorder = new MediaRecorder(stream, { 
                mimeType: selectedMimeType,
                audioBitsPerSecond: 32000  // 32kbps - đủ cho speech, giảm ~60% so với default
            });
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                // Lấy mime type từ blob thực tế (có thể khác với requested)
                const actualMimeType = mediaRecorder.mimeType || selectedMimeType;
                const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
                
                console.log(`[${providerTag} Recording] Audio blob size:`, audioBlob.size, 'bytes, type:', actualMimeType);
                
                // Kiểm tra kích thước audio
                if (audioBlob.size < 1000) {
                    toast({
                        title: 'Audio quá ngắn',
                        description: 'Vui lòng nói dài hơn',
                        variant: 'destructive'
                    });
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                
                // Gemini one-shot: gửi audio + field info → nhận giá trị chuẩn trực tiếp
                const fieldAtCall = currentFieldRef.current;
                const fieldMeta = getFieldMetadata(fieldAtCall);
                
                setTranscript(sttProvider === 'viettel' ? 'Đang gửi đến Viettel AI...' : 'Đang gửi đến Gemini...');
                setIsProcessing(true);
                isProcessingLockRef.current = true;
                
                try {
                    // Truyền fieldInfo để Gemini xử lý one-shot (audio → giá trị chuẩn)
                    const fieldInfo: sttService.STTFieldInfo = {
                        name: fieldAtCall,
                        type: fieldMeta?.type || 'string',
                        label: fieldMeta?.label || fieldAtCall,
                        enumValues: fieldMeta?.enumValues,
                    };
                    
                    const t0 = performance.now();
                    const result = await sttService.transcribeShortAudioWithGemini(audioBlob, fieldInfo);
                    const geminiDuration = ((performance.now() - t0) / 1000).toFixed(2);
                    
                    console.log(`⏱️ [${providerTag} One-Shot] field="${fieldAtCall}" | total=${geminiDuration}s | serverDuration=${result.duration?.toFixed(2)}s | parsedValue="${result.parsedValue}" | rawText="${result.text}"`);
                    
                    if (result.success && (result.parsedValue || result.text)) {
                        const rawText = result.text || result.parsedValue;
                        // Viettel trả raw text — dùng client-side parser cho date/time/enum
                        const fieldMetaForParse = getFieldMetadata(fieldAtCall);
                        let value = result.parsedValue || rawText;
                        if (sttProvider === 'viettel' && fieldMetaForParse) {
                            const localParsed = tryLocalParse(rawText, fieldMetaForParse);
                            value = localParsed !== null ? localParsed : rawText;
                        }
                        setTranscript(typeof value === 'string' ? value : rawText);
                        
                        // Áp dụng trực tiếp, KHÔNG cần gọi Ollama nữa
                        updateFormField(fieldAtCall, value);
                        
                        const next = getNextField(fieldAtCall);
                        if (next) {
                            setCurrentField(next);
                            setTranscript('');
                        } else {
                            toast({ title: 'Hoàn thành nhập liệu giọng nói' });
                        }
                    } else {
                        setTranscript('');
                        toast({
                            title: 'Lỗi nhận dạng',
                            description: result.error || 'Không thể nhận dạng giọng nói',
                            variant: 'destructive'
                        });
                    }
                } catch (error: any) {
                    console.error('[Gemini STT] Error:', error);
                    setTranscript('');
                    toast({
                        title: 'Lỗi Gemini',
                        description: error.message || 'Không thể kết nối đến Gemini',
                        variant: 'destructive'
                    });
                } finally {
                    setIsProcessing(false);
                    isProcessingLockRef.current = false;
                }
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsListening(true);
            setTranscript('Đang ghi âm... (nói xong nhấn nút để dừng)');
            
        } catch (error: any) {
            console.error('[Gemini Recording] Error accessing microphone:', error);
            toast({
                title: 'Không thể truy cập microphone',
                description: 'Vui lòng cho phép truy cập microphone trong trình duyệt',
                variant: 'destructive'
            });
        }
    }, [updateFormField, toast]);

    const stopGeminiRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsListening(false);
    }, []);

    // ==================== Unified Recording Control ====================
    const startRecording = useCallback(() => {
        if (sttProvider === 'gemini' || sttProvider === 'viettel') {
            // Gemini and Viettel use MediaRecorder (one-shot audio)
            startGeminiRecording();
        } else {
            // Both 'webspeech' and 'pollinations' use WebSpeech API for STT
            startWebSpeechRecording();
        }
    }, [sttProvider, startGeminiRecording, startWebSpeechRecording]);

    const stopRecording = useCallback(() => {
        if (sttProvider === 'gemini' || sttProvider === 'viettel') {
            stopGeminiRecording();
        } else {
            // Stop WebSpeech recognition for both 'webspeech' and 'pollinations'
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            }
            setIsListening(false);

            // Process accumulated transcript
            const text = accumulatedTranscriptRef.current?.trim();
            accumulatedTranscriptRef.current = '';
            if (text) {
                processFinalResult(text);
            }
        }
    }, [sttProvider, stopGeminiRecording, processFinalResult]);

    const toggleVoice = useCallback(() => {
        if (isProcessing) return;

        if (isListening) {
            // Currently listening → stop and process
            stopRecording();
        } else {
            // Not listening → start listening
            if (!isVoiceMode) setIsVoiceMode(true);
            setTranscript('');
            startRecording();
        }
    }, [isVoiceMode, isListening, isProcessing, startRecording, stopRecording]);

    useEffect(() => () => stopRecording(), [stopRecording]);

    const renderField = (fieldName: ScheduleField) => {
        const meta = getFieldMetadata(fieldName);
        if (!meta) return null;
        const isActive = isVoiceMode && currentField === fieldName;
        const isCompleted = completedFields.has(fieldName);

        const handleFieldClick = () => {
            if (isVoiceMode && currentField !== fieldName) {
                // Stop current recording if active, then switch field
                if (isListening) stopRecording();
                setCurrentField(fieldName);
                setTranscript('');
            }
        };

        return (
            <div
                className={cn(
                    'relative p-4 rounded-xl border transition-all duration-300',
                    isActive ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-card shadow-sm',
                    isCompleted && !isActive && 'border-green-500/50 bg-green-50/10',
                    isVoiceMode && !isActive && 'cursor-pointer hover:border-primary/40 hover:bg-primary/5'
                )}
                onClick={handleFieldClick}
            >
                <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground/80">
                    {meta.label} {meta.required && <span className="text-red-500">*</span>}
                    {isCompleted && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    {isActive && <Volume2 className="h-3 w-3 text-primary animate-bounce" />}
                </Label>

                {fieldName === 'date' ? (
                    <Popover><PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start h-10', isActive && 'border-primary')} onClick={() => setCurrentField('date')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.date ? format(formData.date, 'dd/MM/yyyy', { locale: vi }) : 'Chọn ngày'}
                        </Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[120]"><Calendar mode="single" selected={formData.date} onSelect={(d) => d && updateFormField('date', d)} /></PopoverContent>
                    </Popover>
                ) : meta.type === 'time' ? (
                    <Input type="time" value={(formData as any)[fieldName] || ''} onChange={(e) => updateFormField(fieldName, e.target.value)} className={cn('h-10 text-base font-bold', isActive && 'border-primary')} readOnly={isVoiceMode && !isActive} onClick={() => setCurrentField(fieldName)} />
                ) : fieldName === 'content' ? (
                    <Textarea value={formData.content} onChange={(e) => updateFormField('content', e.target.value)} className={cn('min-h-[80px] text-sm leading-relaxed', isActive && 'border-primary')} readOnly={isVoiceMode && !isActive} onClick={() => setCurrentField('content')} />
                ) : fieldName === 'eventType' ? (
                    <Select value={formData.eventType} onValueChange={(v) => updateFormField('eventType', v)}>
                        <SelectTrigger className={cn('h-10', isActive && 'border-primary')} onClick={() => setCurrentField('eventType')}><SelectValue placeholder="Chọn loại..." /></SelectTrigger>
                        <SelectContent className="z-[120]">
                            {meta.enumValues?.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                ) : (
                    <Input value={(formData as any)[fieldName] || ''} onChange={(e) => updateFormField(fieldName, e.target.value)} className={cn('h-10 text-sm', isActive && 'border-primary')} readOnly={isVoiceMode && !isActive} onClick={() => setCurrentField(fieldName)} />
                )}

                {isActive && (
                    <div className="absolute inset-x-0 -bottom-3 flex justify-center z-[110]">
                        <div className="bg-primary text-primary-foreground text-[10px] px-3 py-1.5 rounded-full shadow-2xl border border-white/20 animate-in fade-in slide-in-from-top-1">
                            {isProcessing 
                                ? (sttProvider === 'webspeech' ? "OpenCode đang xử lý..." : sttProvider === 'gemini' ? "Gemini đang xử lý..." : sttProvider === 'viettel' ? "Viettel AI đang xử lý..." : "Pollinations đang xử lý...") 
                                : `${sttProvider === 'gemini' ? '🌟 Gemini' : sttProvider === 'pollinations' ? '☁️ Pollinations' : sttProvider === 'viettel' ? '🇻🇳 Viettel AI' : '🎤 OpenCode'}: ${transcript || "..."}`
                            }
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="relative min-h-[500px] mb-6">
            {/* Provider Indicator */}
            <div className="mb-4 flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">Nhận diện giọng nói:</span>
                    <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold",
                        sttProvider === 'gemini' 
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
                            : sttProvider === 'pollinations'
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : sttProvider === 'viettel'
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    )}>
                        {sttProvider === 'gemini' ? '🌟 Gemini 2.5 Flash (one-shot)' : sttProvider === 'pollinations' ? '☁️ WebSpeech + Pollinations' : sttProvider === 'viettel' ? '🇻🇳 Viettel AI ASR' : '🎤 WebSpeech + OpenCode.ai'}
                    </span>
                </div>
                <div className="text-xs text-muted-foreground italic">
                    Thay đổi trong Cấu hình AI
                </div>
            </div>

            <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">{renderField('date')}<div className="grid grid-cols-2 gap-2">{renderField('startTime')}{renderField('endTime')}</div></div>
                {renderField('content')}
                {renderField('participants')}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderField('location')}{renderField('leader')}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderField('preparingUnit')}{renderField('cooperatingUnits')}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('eventType')}
                    <div className="flex items-center gap-3 pt-6">
                        <input
                            type="checkbox"
                            id="isSupplementary"
                            checked={formData.isSupplementary}
                            onChange={(e) => setFormData(prev => ({ ...prev, isSupplementary: e.target.checked }))}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="isSupplementary" className="text-sm font-medium cursor-pointer select-none">
                            Lịch bổ sung <span className="text-xs text-muted-foreground">(highlight vàng trong Excel)</span>
                        </Label>
                    </div>
                </div>
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
                            <span className="text-[11px] font-black uppercase tracking-widest text-primary/70">
                                {isProcessing 
                                    ? (sttProvider === 'webspeech' ? "OpenCode Processing" : sttProvider === 'gemini' ? "Gemini Processing" : sttProvider === 'viettel' ? "Viettel AI Processing" : "Pollinations Processing")
                                    : (sttProvider === 'webspeech' ? "WebSpeech Recording" : sttProvider === 'gemini' ? "Gemini Recording" : sttProvider === 'viettel' ? "Viettel AI Recording" : "WebSpeech Recording")
                                }
                            </span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed italic text-foreground/80">
                            "{isProcessing 
                                ? (sttProvider === 'webspeech' ? "Đang nhờ OpenCode chuẩn hóa dữ liệu..." : sttProvider === 'gemini' ? "Đang chờ Gemini phiên âm..." : sttProvider === 'viettel' ? "Đang chờ Viettel AI phiên âm..." : "Đang nhờ Pollinations chuẩn hóa dữ liệu...") 
                                : (transcript || "Tôi đang nghe...")
                            }"
                        </p>
                        {(sttProvider === 'gemini' || sttProvider === 'viettel') && isListening && !isProcessing && (
                            <p className="text-[10px] text-muted-foreground mt-2">
                                💡 Nhấn nút để dừng ghi và gửi lên {sttProvider === 'viettel' ? 'Viettel AI' : 'Gemini'}
                            </p>
                        )}
                        {(sttProvider === 'webspeech' || sttProvider === 'pollinations') && isListening && !isProcessing && (
                            <p className="text-[10px] text-muted-foreground mt-2">
                                💡 Nhấn nút để dừng và xử lý văn bản
                            </p>
                        )}
                    </div>
                )}
                <div className="pointer-events-auto relative">
                    {isListening && !isProcessing && <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping -z-10" />}
                    <Button size="icon" disabled={isProcessing} onClick={toggleVoice} className={cn(
                        "h-20 w-20 rounded-full shadow-2xl transition-all duration-700 transform hover:scale-105 active:scale-95", 
                        isVoiceMode 
                            ? (isListening ? (sttProvider === 'gemini' ? "bg-amber-500" : sttProvider === 'pollinations' ? "bg-blue-500" : "bg-primary") : "bg-orange-500") 
                            : "bg-gradient-to-tr from-indigo-700 via-violet-600 to-fuchsia-500"
                    )}>
                        {isProcessing ? <Loader2 className="h-10 w-10 animate-spin text-white" /> : isVoiceMode ? <Mic className="h-10 w-10 text-white" /> : <MicOff className="h-10 w-10 text-white" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
