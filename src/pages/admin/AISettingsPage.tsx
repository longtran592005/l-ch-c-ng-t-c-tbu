import { useState, useEffect } from 'react';
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
    Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

    // Quyền truy cập: Chỉ Admin và BGH được vào trang này
    const canAccess = isAdmin || isBGH;

    // Fetch initial data
    useEffect(() => {
        if (canAccess) {
            fetchAIStatus();
            fetchLLMConfig();
            fetchSyncProgress();
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
                    description: `Hệ thống đã chuyển sang sử dụng ${provider === 'ollama' ? 'Ollama' : 'Gemini'}.`,
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
                    </CardContent>
                </Card>

                {/* LLM Selection Card */}
                {isAdmin && (
                    <Card className="border-indigo-100 dark:border-indigo-900/50 shadow-md">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Bot className="h-5 w-5 text-indigo-500" />
                                Cấu hình Mô hình Ngôn ngữ (LLM)
                            </CardTitle>
                            <CardDescription>
                                Chọn Model sẽ xử lý câu trả lời cho Chatbot. Ollama dùng local CPU/GPU, Gemini dùng Google Cloud API.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
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
                                                {provider.id === 'ollama' ? <Database className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                            </div>
                                            <div className="font-bold text-lg">{provider.name}</div>
                                        </div>
                                        <div className="text-sm text-muted-foreground mb-3">
                                            Model: <code className="bg-muted px-1 rounded">{provider.model}</code>
                                        </div>
                                        <div className="mt-auto text-xs italic opacity-70">
                                            {provider.id === 'ollama'
                                                ? "Phù hợp để bảo mật dữ liệu nội bộ, không phụ thuộc internet."
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
        </AdminLayout>
    );
}
