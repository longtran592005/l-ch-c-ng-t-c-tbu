import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useAuth } from '@/contexts';
import {
    Bot,
    RefreshCcw,
    Database,
    Activity,
    CheckCircle2,
    XCircle,
    BarChart3,
    Clock,
    ShieldAlert,
    Search,
    MessageSquare,
    FileJson,
    Volume2,
    Mic,
    FileAudio,
    Plus,
    Trash2,
    Save,
    BookOpen,
    Download,
    Upload,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as sttService from '@/services/stt.service';
import type { STTProvidersInfo, VoiceFormProvider, MeetingTranscriptionProvider } from '@/services/stt.service';


interface AIStats {
    total: number;
    by_source: Record<string, number>;
}

interface AIHealth {
    status: string;
    service: string;
    models: {
        embedding: string;
        llm: string;
    };
    vector_store: {
        total?: number;
        error?: string;
    };
}

export default function AISettingsPage() {
    const { toast } = useToast();
    const { isAdmin, isBGH } = useAuth();
    const [stats, setStats] = useState<AIStats | null>(null);
    const [health, setHealth] = useState<AIHealth | null>(null);
    const [llmConfig, setLlmConfig] = useState<any>({
        active: 'ollama',
        providers: [
            { id: 'ollama', name: 'Ollama (Cục bộ)', model: 'qwen2.5:7b' },
            { id: 'gemini', name: 'Google Gemini (Cloud)', model: 'gemini-2.5-flash' }
        ]
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [syncProgress, setSyncProgress] = useState<{
        isSyncing: boolean;
        current: number;
        total: number;
        status: string;
    } | null>(null);
    const [abbreviations, setAbbreviations] = useState<{ id: string; phrase: string; replacement: string }[]>([]);
    const [isAbbrOpen, setIsAbbrOpen] = useState(false);

    // STT Configuration State
    const [sttProviders, setSTTProviders] = useState<STTProvidersInfo | null>(null);
    const [sttLoading, setSTTLoading] = useState(false);

    // Quyền truy cập: Chỉ Admin và BGH được vào trang này
    const canAccess = isAdmin || isBGH;

    // Fetch initial data
    useEffect(() => {
        if (canAccess) {
            fetchAIStatus();
            fetchLLMConfig();
            fetchSyncProgress();
            fetchSTTProviders();
            fetchAbbreviations();
        }
    }, [canAccess]);

    // Polling cho tiến độ đồng bộ TTS
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (syncProgress?.isSyncing) {
            interval = setInterval(fetchSyncProgress, 2000);
        }
        return () => clearInterval(interval);
    }, [syncProgress?.isSyncing]);

    // Fetch STT Providers configuration
    const fetchSTTProviders = async () => {
        try {
            const providers = await sttService.getSTTProviders();
            setSTTProviders(providers);
        } catch (error) {
            console.error('[AI Settings] Error fetching STT providers:', error);
        }
    };

    // Handle Voice Form Provider Change
    const handleVoiceFormProviderChange = async (provider: VoiceFormProvider) => {
        if (!isAdmin) return;
        setSTTLoading(true);
        try {
            await sttService.setVoiceFormProvider(provider);
            toast({
                title: 'Đã cập nhật',
                description: `Voice Form sẽ sử dụng ${provider === 'webspeech' ? 'Web Speech API' : 'Gemini 2.5 Flash'}`,
            });
            fetchSTTProviders();
        } catch (error: any) {
            toast({
                title: 'Lỗi',
                description: error.message || 'Không thể thay đổi cấu hình',
                variant: 'destructive'
            });
        } finally {
            setSTTLoading(false);
        }
    };

    // Handle Meeting Transcription Provider Change
    const handleMeetingProviderChange = async (provider: MeetingTranscriptionProvider) => {
        if (!isAdmin) return;
        setSTTLoading(true);
        try {
            await sttService.setMeetingProvider(provider);
            toast({
                title: 'Đã cập nhật',
                description: `Biên bản cuộc họp sẽ sử dụng ${provider === 'whisper' ? 'Whisper VinAI' : 'Gemini 2.5 Flash'}`,
            });
            fetchSTTProviders();
        } catch (error: any) {
            toast({
                title: 'Lỗi',
                description: error.message || 'Không thể thay đổi cấu hình',
                variant: 'destructive'
            });
        } finally {
            setSTTLoading(false);
        }
    };

    const fetchSyncProgress = async () => {
        try {
            const res = await api.get<{ success: boolean; data: any }>('/tts/sync-progress');
            if (res.success) {
                setSyncProgress(res.data);
            }
        } catch (e) {
            console.error('[TTS] Lỗi lấy tiến độ:', e);
        }
    };

    const fetchAbbreviations = async () => {
        try {
            const res = await api.get<{ success: boolean; data: any[] }>('/tts/abbreviations');
            if (res.success) setAbbreviations(res.data);
        } catch (e) {
            console.error('[Abbr] Lỗi lấy danh sách viết tắt:', e);
        }
    };

    const handleSaveAbbr = async (updatedAbbrs: { id: string; phrase: string; replacement: string }[]) => {
        try {
            const res = await api.post<{ success: boolean; message: string }>('/tts/abbreviations', {
                abbreviations: updatedAbbrs
            });
            if (res.success) {
                toast({ title: 'Thành công', description: res.message });
                setAbbreviations(updatedAbbrs);
                setIsAbbrOpen(false);
            }
        } catch (e: any) {
            toast({ title: 'Lỗi', description: e.message || 'Lỗi khi lưu', variant: 'destructive' });
        }
    };

    const fetchLLMConfig = async () => {
        try {
            const res = await api.get<{ success: boolean; data: any }>('/chatbot/llm/providers');
            if (res.success) {
                setLlmConfig(res.data);
            }
        } catch (e) {
            console.error('[AI] Lỗi lấy LLM config:', e);
        }
    };

    const handleSwitchLLM = async (provider: string) => {
        if (!canAccess) return;
        setIsLoading(true);
        try {
            const res = await api.post<{ success: boolean; data: any }>('/chatbot/llm/switch', { provider });
            if (res.success) {
                // Cập nhật trạng thái local ngay lập tức để giao diện thay đổi nhanh
                setLlmConfig((prev: any) => ({ ...prev, active: provider }));

                toast({
                    title: 'Đã chuyển đổi LLM',
                    description: `Hệ thống đã chuyển sang sử dụng ${provider === 'ollama' ? 'Ollama' : provider === 'gemini' ? 'Gemini' : 'Pollinations.ai'}.`,
                });
                fetchLLMConfig(); // Kiểm tra lại với server
                fetchAIStatus();  // Cập nhật trạng thái sức khỏe model
            }
        } catch (error: any) {
            toast({
                title: 'Lỗi chuyển đổi',
                description: error.message || 'Không thể thay đổi cấu hình LLM.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAIStatus = async () => {
        setIsRefreshing(true);
        try {
            // Bước 1: Lấy Health (Public - không cần auth quá khắt khe)
            try {
                const healthRes = await api.get<{ success: boolean; data: AIHealth }>('/chatbot/health');
                if (healthRes.success) setHealth(healthRes.data);
            } catch (e) {
                console.warn('[AI] Không thể lấy health:', e);
            }

            // Bước 2: Lấy Stats (Protected - yêu cầu admin/bgh)
            try {
                const statsRes = await api.get<{ success: boolean; data: AIStats }>('/chatbot/stats');
                if (statsRes.success) setStats(statsRes.data);
            } catch (e: any) {
                // Chỉ log lỗi nếu không phải là lỗi 401 (đã được api.ts xử lý)
                if (!e.message?.includes('hết hạn')) {
                    console.error('[AI] Lỗi lấy stats:', e);
                }
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleReindex = async (type: 'schedules' | 'news' | 'announcements' | 'document' | 'all') => {
        setIsLoading(true);
        const endpoint = type === 'all'
            ? '/chatbot/reindex-all'
            : `/chatbot/index/${type}`;

        toast({
            title: 'Đang xử lý...',
            description: `Đang bắt đầu quá trình đồng bộ hóa ${type === 'all' ? 'toàn bộ dữ liệu' : type}...`,
        });

        try {
            const res = await api.post<{ success: boolean; message: string }>(endpoint, {});
            if (res.success) {
                toast({
                    title: 'Thành công',
                    description: res.message || 'Dữ liệu đã được cập nhật thành công.',
                });
                fetchAIStatus(); // Refresh stats
            } else {
                throw new Error(res.message || 'Có lỗi xảy ra');
            }
        } catch (error: any) {
            toast({
                title: 'Lỗi đồng bộ',
                description: error.message || 'Không thể kết nối đến máy chủ AI.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!canAccess) {
        return (
            <AdminLayout title="Cấu hình Trợ lý AI">
                <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                    <ShieldAlert className="h-16 w-16 text-destructive opacity-50" />
                    <div className="text-center">
                        <h2 className="text-2xl font-bold">Truy cập bị từ chối</h2>
                        <p className="text-muted-foreground">Bạn không có quyền quản trị để cấu hình hệ thống AI.</p>
                    </div>
                    <Button onClick={() => window.history.back()}>Quay lại</Button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Cấu hình Trợ lý AI">
            <div className="space-y-6 max-w-5xl pb-10">
                {/* Status Section */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-2 overflow-hidden border-blue-100 dark:border-blue-900/50">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-blue-500" />
                                    Trạng thái Hệ thống RAG
                                </CardTitle>
                                <CardDescription>Giám sát kết nối và mô hình ngôn ngữ</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchAIStatus}
                                disabled={isRefreshing}
                                className="gap-2"
                            >
                                <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                                Làm mới
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                    <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Mô hình LLM</div>
                                    <div className="flex items-center gap-2 font-medium">
                                        <MessageSquare className="h-4 w-4 text-primary" />
                                        {health?.models.llm || 'Đang kiểm tra...'}
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                    <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Mô hình Nhúng</div>
                                    <div className="flex items-center gap-2 font-medium">
                                        <FileJson className="h-4 w-4 text-primary" />
                                        {health?.models.embedding || 'Đang kiểm tra...'}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 flex-1">
                                        {health?.status === 'ok' ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-destructive" />
                                        )}
                                        <span className="font-semibold text-green-700 dark:text-green-500 uppercase tracking-wider text-sm">
                                            {health?.status === 'ok' ? 'Dịch vụ ổn định' : 'Mất kết nối'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground italic">
                                        Python Service RAG Port: 8002
                                    </div>
                                </div>
                                {health?.status !== 'ok' && health?.vector_store?.error && (
                                    <div className="text-xs text-destructive border-t border-destructive/20 pt-2 mt-1">
                                        <strong>Lỗi chi tiết:</strong> {health.vector_store.error}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-orange-100 dark:border-orange-900/50">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-orange-500" />
                                Cơ sở dữ liệu
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-end justify-center py-2 h-20">
                                <div className="text-center">
                                    <div className="text-4xl font-black text-orange-500 tracking-tighter">
                                        {stats?.total || 0}
                                    </div>
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">
                                        Tổng số Vector
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {stats && Object.entries(stats.by_source).map(([source, count]) => (
                                    <div key={source} className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground capitalize">{source}</span>
                                        <Badge variant="secondary" className="font-mono">{count}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sync Controls */}
                <Card className="border-primary/20 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCcw className="h-5 w-5 text-primary" />
                            Công cụ Đồng bộ hóa Dữ liệu (Dành cho Admin/BGH)
                        </CardTitle>
                        <CardDescription>
                            Cập nhật dữ liệu từ SQL Server vào Vector Store để Chatbot có thông tin mới nhất.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        {/* Schedules Sync */}
                        <div className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                                    <Database className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold">Lịch công tác</div>
                                    <div className="text-xs text-muted-foreground">Đồng bộ tất cả lịch đã được duyệt.</div>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleReindex('schedules')}
                                    disabled={isLoading}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    Đồng bộ
                                </Button>
                            </div>
                        </div>

                        {/* Document Sync */}
                        <div className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                                    <Search className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold">Tài liệu hướng dẫn</div>
                                    <div className="text-xs text-muted-foreground">Đọc lại file info.docx trong hệ thống.</div>
                                </div>
                                {isAdmin ? (
                                    <Button
                                        size="sm"
                                        onClick={() => handleReindex('document')}
                                        disabled={isLoading}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        Xử lý
                                    </Button>
                                ) : (
                                    <Badge variant="outline">Admin only</Badge>
                                )}
                            </div>
                        </div>

                        {/* News Sync */}
                        <div className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/10 text-green-500 group-hover:scale-110 transition-transform">
                                    <Database className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold">Tin tức & Thông báo</div>
                                    <div className="text-xs text-muted-foreground">Đồng bộ các bài viết mới nhất.</div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleReindex('news')}
                                        disabled={isLoading}
                                    >
                                        Tin tức
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleReindex('announcements')}
                                        disabled={isLoading}
                                    >
                                        T.Báo
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Full Reindex */}
                        <div className="flex flex-col gap-4 p-4 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary text-primary-foreground group-hover:rotate-180 transition-transform duration-700">
                                    <RefreshCcw className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-black text-primary uppercase">Tổng kiểm tra</div>
                                    <div className="text-xs text-primary/70 font-medium">Khuyên dùng khi có thay đổi lớn.</div>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleReindex('all')}
                                    disabled={isLoading}
                                    className="font-bold shadow-lg shadow-primary/20"
                                >
                                    Chạy ngay
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t flex items-start gap-3 py-3 px-6">
                        <ShieldAlert className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                            Lưu ý: Quá trình đồng bộ hóa lớn có thể gây chậm phản hồi chatbot trong vài phút.
                            Mật khẩu và thông tin nhạy cảm của người dùng KHÔNG bao giờ được đồng bộ vào kho Vector Store.
                        </p>
                    </CardFooter>
                </Card>

                {/* TTS Sync Section */}
                <Card className="border-blue-100 dark:border-blue-900/50 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-600">
                            <Volume2 className="h-5 w-5" />
                            Cấu hình Phát loa & Giọng nói (TTS)
                        </CardTitle>
                        <CardDescription>
                            Quản lý các bản ghi âm giọng nói AI của lịch công tác.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {syncProgress?.isSyncing && (
                            <div className="space-y-2 mb-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div className="flex justify-between items-end mb-1">
                                    <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Tiền độ đồng bộ</div>
                                    <div className="text-sm font-black text-blue-600">
                                        {Math.round((syncProgress.current / syncProgress.total) * 100)}%
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-blue-100 rounded-full overflow-hidden border border-blue-200">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                        style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-blue-600/70 font-medium">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {syncProgress.status}
                                    </div>
                                    <div>{syncProgress.current} / {syncProgress.total} lịch</div>
                                </div>
                            </div>
                        )}

                        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 flex flex-col md:flex-row items-center gap-6">
                            <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                                <RefreshCcw className={cn("h-8 w-8", syncProgress?.isSyncing && "animate-spin")} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="font-bold text-blue-900 dark:text-blue-100">Đồng bộ hóa toàn bộ giọng nói</div>
                                <p className="text-xs text-blue-700/70 dark:text-blue-300/70 mt-1">
                                    Xóa và tạo lại bản phát loa cho 5 tuần gần nhất. Dùng để sửa lỗi giờ giấc hàng loạt.
                                </p>
                            </div>
                            <Button
                                onClick={async () => {
                                    if (!confirm('Bạn có chắc chắn muốn làm mới giọng nói cho 5 tuần gần nhất không?')) return;
                                    setIsLoading(true);
                                    try {
                                        const res = await api.post<{ success: boolean; message: string }>('/tts/sync-all', {});
                                        if (res.success) {
                                            toast({
                                                title: 'Bắt đầu đồng bộ TTS',
                                                description: res.message,
                                            });
                                            fetchSyncProgress(); // Cập nhật trạng thái ngay
                                        }
                                    } catch (e: any) {
                                        toast({
                                            title: 'Lỗi đồng bộ TTS',
                                            description: e.message || 'Không thể kết nối máy chủ',
                                            variant: 'destructive'
                                        });
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                disabled={isLoading || syncProgress?.isSyncing}
                                className="bg-blue-600 hover:bg-blue-700 font-bold whitespace-nowrap min-w-[140px]"
                            >
                                {syncProgress?.isSyncing ? (
                                    <>
                                        <RefreshCcw className="h-4 w-4 animate-spin mr-2" />
                                        Đang chạy...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCcw className="h-4 w-4 mr-2" />
                                        Đồng bộ ngay
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Abbreviation Management */}
                        <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 flex flex-col md:flex-row items-center gap-6">
                            <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-500">
                                <BookOpen className="h-8 w-8" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="font-bold text-indigo-900 dark:text-indigo-100">Từ điển viết tắt</div>
                                <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 mt-1">
                                    Cấu hình cách AI đọc các từ viết tắt (VD: DU {"->"} Đảng ủy).
                                    Sau khi sửa, hãy nhấn <b>Đồng bộ ngay</b> phía trên để cập nhật audio.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setIsAbbrOpen(true)}
                                className="border-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Quản lý từ điển
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* STT Configuration Card - Voice Form */}
                {isAdmin && (
                    <Card className="border-emerald-100 dark:border-emerald-900/50 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Mic className="h-5 w-5 text-emerald-500" />
                                Cấu hình Giọng nói → Văn bản (Bài 1: Voice Form)
                            </CardTitle>
                            <CardDescription>
                                Chọn công nghệ để nhận diện giọng nói khi điền form lịch công tác bằng giọng nói.
                                <span className="block mt-1 text-xs text-muted-foreground italic">
                                    Audio ngắn (~5 giây), yêu cầu phản hồi nhanh {'<'} 1 giây
                                </span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                {sttProviders?.voiceForm.providers.map((provider) => (
                                    <div
                                        key={provider.id}
                                        onClick={() => !sttLoading && handleVoiceFormProviderChange(provider.id as VoiceFormProvider)}
                                        className={cn(
                                            "relative cursor-pointer flex flex-col p-4 rounded-xl border-2 transition-all group",
                                            sttProviders.voiceForm.active === provider.id
                                                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                                                : "border-border hover:border-emerald-200 dark:hover:border-emerald-800",
                                            provider.id === 'gemini' && !sttProviders.geminiAvailable && "opacity-50 cursor-not-allowed",
                                            provider.id === 'pollinations' && !sttProviders.pollinationsAvailable && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {sttProviders.voiceForm.active === provider.id && (
                                            <div className="absolute top-2 right-2">
                                                <Badge className="bg-emerald-500 hover:bg-emerald-600">Đang dùng</Badge>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                sttProviders.voiceForm.active === provider.id
                                                    ? "bg-emerald-500 text-white"
                                                    : "bg-muted text-muted-foreground group-hover:bg-emerald-100"
                                            )}>
                                                {provider.id === 'webspeech' ? <Mic className="h-5 w-5" /> : provider.id === 'pollinations' ? <Activity className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                            </div>
                                            <div className="font-bold text-lg">{provider.name}</div>
                                        </div>
                                        <div className="text-sm text-muted-foreground mb-3">
                                            {provider.description}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs font-semibold text-green-600">✓ Ưu điểm:</div>
                                            <ul className="text-xs text-muted-foreground space-y-0.5 ml-2">
                                                {provider.pros.slice(0, 2).map((pro, i) => (
                                                    <li key={i}>• {pro}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        {provider.id === 'gemini' && !sttProviders.geminiAvailable && (
                                            <div className="mt-2 text-xs text-red-500 font-medium">
                                                ⚠️ Cần cấu hình GEMINI_API_KEY trong backend/.env
                                            </div>
                                        )}
                                        {provider.id === 'pollinations' && !sttProviders.pollinationsAvailable && (
                                            <div className="mt-2 text-xs text-red-500 font-medium">
                                                ⚠️ Cần cấu hình POLLINATIONS_API_KEY trong backend/.env
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-emerald-500/5 border-t border-emerald-500/10 py-3 flex justify-between items-center text-xs text-emerald-700 dark:text-emerald-400">
                            <div className="flex items-center gap-1.5 font-medium">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Mặc định: Web Speech API (miễn phí, không cần cấu hình)
                            </div>
                            {sttLoading && (
                                <div className="flex items-center gap-2 animate-pulse">
                                    <RefreshCcw className="h-3 w-3 animate-spin" />
                                    Đang lưu...
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                )}

                {/* STT Configuration Card - Meeting Transcription */}
                {isAdmin && (
                    <Card className="border-amber-100 dark:border-amber-900/50 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <FileAudio className="h-5 w-5 text-amber-500" />
                                Cấu hình Giọng nói → Văn bản (Bài 2: Biên bản Cuộc họp)
                            </CardTitle>
                            <CardDescription>
                                Chọn công nghệ để chuyển đổi ghi âm cuộc họp (1-2 tiếng) thành văn bản.
                                <span className="block mt-1 text-xs text-muted-foreground italic">
                                    Audio dài (1-2 tiếng), yêu cầu xử lý {'<'} 10 phút
                                </span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                {sttProviders?.meetingTranscription.providers.map((provider) => (
                                    <div
                                        key={provider.id}
                                        onClick={() => !sttLoading && handleMeetingProviderChange(provider.id as MeetingTranscriptionProvider)}
                                        className={cn(
                                            "relative cursor-pointer flex flex-col p-4 rounded-xl border-2 transition-all group",
                                            sttProviders.meetingTranscription.active === provider.id
                                                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-900/20"
                                                : "border-border hover:border-amber-200 dark:hover:border-amber-800",
                                            provider.id === 'gemini' && !sttProviders.geminiAvailable && "opacity-50 cursor-not-allowed",
                                            provider.id === 'pollinations' && !sttProviders.pollinationsAvailable && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {sttProviders.meetingTranscription.active === provider.id && (
                                            <div className="absolute top-2 right-2">
                                                <Badge className="bg-amber-500 hover:bg-amber-600">Đang dùng</Badge>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                sttProviders.meetingTranscription.active === provider.id
                                                    ? "bg-amber-500 text-white"
                                                    : "bg-muted text-muted-foreground group-hover:bg-amber-100"
                                            )}>
                                                {provider.id === 'whisper' ? <FileAudio className="h-5 w-5" /> : provider.id === 'pollinations' ? <Activity className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                            </div>
                                            <div className="font-bold text-lg">{provider.name}</div>
                                        </div>
                                        <div className="text-sm text-muted-foreground mb-3">
                                            {provider.description}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs font-semibold text-green-600">✓ Ưu điểm:</div>
                                            <ul className="text-xs text-muted-foreground space-y-0.5 ml-2">
                                                {provider.pros.slice(0, 2).map((pro, i) => (
                                                    <li key={i}>• {pro}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        {provider.id === 'gemini' && !sttProviders.geminiAvailable && (
                                            <div className="mt-2 text-xs text-red-500 font-medium">
                                                ⚠️ Cần cấu hình GEMINI_API_KEY trong backend/.env
                                            </div>
                                        )}
                                        {provider.id === 'pollinations' && !sttProviders.pollinationsAvailable && (
                                            <div className="mt-2 text-xs text-red-500 font-medium">
                                                ⚠️ Cần cấu hình POLLINATIONS_API_KEY trong backend/.env
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-amber-500/5 border-t border-amber-500/10 py-3 flex justify-between items-center text-xs text-amber-700 dark:text-amber-400">
                            <div className="flex items-center gap-1.5 font-medium">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Mặc định: Whisper VinAI (bảo mật, không mất phí cloud)
                            </div>
                            {sttLoading && (
                                <div className="flex items-center gap-2 animate-pulse">
                                    <RefreshCcw className="h-3 w-3 animate-spin" />
                                    Đang lưu...
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                )}

                {/* LLM Selection Card */}
                {isAdmin && (
                    <Card className="border-indigo-100 dark:border-indigo-900/50 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Bot className="h-5 w-5 text-indigo-500" />
                                Cấu hình Mô hình Ngôn ngữ (LLM)
                            </CardTitle>
                            <CardDescription>
                                Chọn Model sẽ xử lý câu trả lời cho Chatbot. Ollama dùng local CPU/GPU, Gemini dùng Google Cloud API, Pollinations.ai dùng Cloud đa model.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                {llmConfig?.providers.map((provider: any) => (
                                    <div
                                        key={provider.id}
                                        onClick={() => !isLoading && handleSwitchLLM(provider.id)}
                                        className={cn(
                                            "relative cursor-pointer flex flex-col p-4 rounded-xl border-2 transition-all group",
                                            llmConfig.active === provider.id
                                                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20"
                                                : "border-border hover:border-indigo-200 dark:hover:border-indigo-800"
                                        )}
                                    >
                                        {llmConfig.active === provider.id && (
                                            <div className="absolute top-2 right-2">
                                                <Badge className="bg-indigo-500 hover:bg-indigo-600">Đang hoạt động</Badge>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                llmConfig.active === provider.id ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground group-hover:bg-indigo-100"
                                            )}>
                                                {provider.id === 'ollama' ? <Database className="h-5 w-5" /> : provider.id === 'pollinations' ? <Activity className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                            </div>
                                            <div className="font-bold text-lg">{provider.name}</div>
                                        </div>
                                        <div className="text-sm text-muted-foreground mb-3">
                                            Model: <code className="bg-muted px-1 rounded">{provider.model}</code>
                                        </div>
                                        <div className="mt-auto text-xs italic opacity-70">
                                            {provider.id === 'ollama'
                                                ? "Phù hợp để bảo mật dữ liệu nội bộ, không phụ thuộc internet."
                                                : provider.id === 'pollinations'
                                                ? "Cloud LLM qua Pollinations.ai – hỗ trợ nhiều model (OpenAI, Gemini, Qwen...)."
                                                : "Phù hợp để trả lời thông minh, đa dạng và tốc độ phản hồi nhanh."
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-indigo-500/5 border-t border-indigo-500/10 py-3 flex justify-between items-center text-xs text-indigo-700 dark:text-indigo-400">
                            <div className="flex items-center gap-1.5 font-medium">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Chỉ Admin mới có quyền thay đổi cấu hình này.
                            </div>
                            {isLoading && (
                                <div className="flex items-center gap-2 animate-pulse">
                                    <RefreshCcw className="h-3 w-3 animate-spin" />
                                    Đang chuyển đổi...
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                )}

                {/* Chatbot Features */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            Tính năng Trợ lý ảo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-bold flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        Tự động đồng bộ lịch mới
                                    </div>
                                    <div className="text-xs text-muted-foreground">Khi Admin duyệt lịch, Chatbot sẽ tự động được cập nhật.</div>
                                </div>
                                <Badge className="bg-green-500">Đã kích hoạt</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-bold flex items-center gap-2">
                                        <Database className="h-4 w-4 text-primary" />
                                        SQL RAG Hybrid
                                    </div>
                                    <div className="text-xs text-muted-foreground">Phối hợp tìm kiếm SQL trực tiếp cho kết quả ngày chính xác 100%.</div>
                                </div>
                                <Badge className="bg-green-500">Đã kích hoạt</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AbbreviationEditorDialog
                open={isAbbrOpen}
                onOpenChange={setIsAbbrOpen}
                abbreviations={abbreviations}
                onSave={handleSaveAbbr}
            />
        </AdminLayout>
    );
}

function AbbreviationEditorDialog({
    open,
    onOpenChange,
    abbreviations,
    onSave
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    abbreviations: { id: string; phrase: string; replacement: string }[];
    onSave: (abbrs: any[]) => void;
}) {
    const [localAbbrs, setLocalAbbrs] = useState(abbreviations);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newPhrase, setNewPhrase] = useState('');
    const [newReplacement, setNewReplacement] = useState('');
    const [sortBy, setSortBy] = useState<'phrase' | 'replacement'>('phrase');
    const [sortAsc, setSortAsc] = useState(true);

    useEffect(() => {
        setLocalAbbrs(abbreviations);
    }, [abbreviations]);

    // Filter và sort
    const filteredAbbrs = useMemo(() => {
        let result = localAbbrs.filter(a => 
            a.phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.replacement.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        result.sort((a, b) => {
            const valA = a[sortBy].toLowerCase();
            const valB = b[sortBy].toLowerCase();
            return sortAsc ? valA.localeCompare(valB, 'vi') : valB.localeCompare(valA, 'vi');
        });
        
        return result;
    }, [localAbbrs, searchTerm, sortBy, sortAsc]);

    const addRow = () => {
        if (!newPhrase.trim()) return;
        const newAbbr = { 
            id: Date.now().toString(), 
            phrase: newPhrase.trim(), 
            replacement: newReplacement.trim() 
        };
        setLocalAbbrs([...localAbbrs, newAbbr]);
        setNewPhrase('');
        setNewReplacement('');
    };

    const removeRow = (id: string) => {
        setLocalAbbrs(localAbbrs.filter(a => a.id !== id));
    };

    const updateRow = (id: string, field: 'phrase' | 'replacement', value: string) => {
        setLocalAbbrs(localAbbrs.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const handleSort = (field: 'phrase' | 'replacement') => {
        if (sortBy === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortBy(field);
            setSortAsc(true);
        }
    };

    const exportData = () => {
        const data = localAbbrs.map(a => `${a.phrase}\t${a.replacement}`).join('\n');
        const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tu-dien-viet-tat.txt';
        link.click();
        URL.revokeObjectURL(url);
    };

    const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            const newAbbrs = lines.map((line, idx) => {
                // Hỗ trợ cả tab và nhiều khoảng trắng làm dấu phân cách
                const parts = line.split(/\t+|\s{2,}/);
                const phrase = parts[0]?.trim() || '';
                const replacement = parts.slice(1).join(' ').trim() || '';
                return {
                    id: `import-${Date.now()}-${idx}`,
                    phrase,
                    replacement
                };
            }).filter(a => a.phrase);
            
            setLocalAbbrs([...localAbbrs, ...newAbbrs]);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-950 border-indigo-200 dark:border-indigo-900 border-2 shadow-2xl">
                {/* Header */}
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
                    <DialogHeader className="space-y-2">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-2xl font-black text-indigo-600 flex items-center gap-2">
                                <BookOpen className="h-6 w-6" />
                                TỪ ĐIỂN VIẾT TẮT TTS
                            </DialogTitle>
                            <Badge variant="secondary" className="text-lg px-3 py-1 bg-indigo-100 text-indigo-700">
                                {localAbbrs.length} từ
                            </Badge>
                        </div>
                        <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                            Cấu hình cách AI đọc các từ viết tắt. Không phân biệt hoa thường.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-3 mt-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Tìm kiếm từ viết tắt..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-white dark:bg-slate-900 border-slate-200"
                            />
                        </div>
                        
                        {/* Import/Export */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportData}
                                className="text-xs"
                            >
                                <Download className="h-3 w-3 mr-1" />
                                Xuất file
                            </Button>
                            <label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs cursor-pointer"
                                    asChild
                                >
                                    <span>
                                        <Upload className="h-3 w-3 mr-1" />
                                        Nhập file
                                    </span>
                                </Button>
                                <input
                                    type="file"
                                    accept=".txt,.csv"
                                    onChange={importData}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Add new row - compact form */}
                <div className="flex-shrink-0 px-6 py-3 bg-green-50/50 dark:bg-green-950/20 border-b border-green-100 dark:border-green-900/30">
                    <div className="flex gap-2 items-center">
                        <div className="text-green-600 font-bold text-xs uppercase tracking-wide whitespace-nowrap">
                            <Plus className="h-4 w-4 inline mr-1" />
                            Thêm mới:
                        </div>
                        <Input
                            placeholder="Từ viết tắt (VD: bgh)"
                            value={newPhrase}
                            onChange={(e) => setNewPhrase(e.target.value)}
                            className="flex-1 h-9 text-sm font-bold bg-white dark:bg-slate-900"
                            onKeyDown={(e) => e.key === 'Enter' && addRow()}
                        />
                        <Input
                            placeholder="Cách đọc (VD: ban giám hiệu)"
                            value={newReplacement}
                            onChange={(e) => setNewReplacement(e.target.value)}
                            className="flex-[2] h-9 text-sm bg-white dark:bg-slate-900"
                            onKeyDown={(e) => e.key === 'Enter' && addRow()}
                        />
                        <Button
                            size="sm"
                            onClick={addRow}
                            disabled={!newPhrase.trim()}
                            className="bg-green-600 hover:bg-green-700 h-9"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="w-12 px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                                        #
                                    </th>
                                    <th 
                                        className="w-1/3 px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600 select-none"
                                        onClick={() => handleSort('phrase')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Từ viết tắt
                                            {sortBy === 'phrase' && (
                                                <span className="text-indigo-500">{sortAsc ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600 select-none"
                                        onClick={() => handleSort('replacement')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Cách đọc đầy đủ
                                            {sortBy === 'replacement' && (
                                                <span className="text-indigo-500">{sortAsc ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="w-16 px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">
                                        Xóa
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredAbbrs.map((abbr, idx) => (
                                    <tr 
                                        key={abbr.id} 
                                        className={cn(
                                            "group hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors",
                                            editingId === abbr.id && "bg-yellow-50 dark:bg-yellow-950/30"
                                        )}
                                    >
                                        <td className="px-4 py-2 text-xs text-slate-400 font-mono">
                                            {idx + 1}
                                        </td>
                                        <td className="px-4 py-2">
                                            {editingId === abbr.id ? (
                                                <Input
                                                    value={abbr.phrase}
                                                    onChange={(e) => updateRow(abbr.id, 'phrase', e.target.value)}
                                                    className="h-8 text-sm font-bold"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div 
                                                    className="font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer hover:underline"
                                                    onClick={() => setEditingId(abbr.id)}
                                                >
                                                    {abbr.phrase || <span className="text-red-400 italic">Trống</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            {editingId === abbr.id ? (
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={abbr.replacement}
                                                        onChange={(e) => updateRow(abbr.id, 'replacement', e.target.value)}
                                                        className="h-8 text-sm flex-1"
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setEditingId(null)}
                                                        className="h-8 px-2 text-green-600"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div 
                                                    className="text-slate-600 dark:text-slate-300 cursor-pointer hover:text-indigo-600"
                                                    onClick={() => setEditingId(abbr.id)}
                                                >
                                                    {abbr.replacement || <span className="text-slate-300 italic">Chưa có</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeRow(abbr.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}

                                {filteredAbbrs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-slate-400">
                                            {searchTerm ? (
                                                <div>
                                                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                    <p>Không tìm thấy kết quả cho "{searchTerm}"</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                    <p>Chưa có từ viết tắt nào</p>
                                                    <p className="text-xs mt-1">Thêm từ mới ở phía trên</p>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400">
                            {searchTerm && `Hiển thị ${filteredAbbrs.length}/${localAbbrs.length} từ`}
                            {!searchTerm && `Tổng cộng ${localAbbrs.length} từ viết tắt`}
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={() => onSave(localAbbrs)}
                                className="bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Lưu {localAbbrs.length} từ
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
