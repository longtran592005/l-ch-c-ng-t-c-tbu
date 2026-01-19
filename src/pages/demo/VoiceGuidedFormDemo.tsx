/**
 * Demo page for Voice-Guided Schedule Form
 * Trang demo để test tính năng nhập liệu bằng giọng nói
 */

import { useState } from 'react';
import { VoiceGuidedScheduleForm, type ScheduleFormData } from '@/components/schedule/VoiceGuidedScheduleForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles } from 'lucide-react';

export default function VoiceGuidedFormDemo() {
    const { toast } = useToast();
    const [submittedData, setSubmittedData] = useState<ScheduleFormData | null>(null);

    const handleSubmit = (data: ScheduleFormData) => {
        console.log('📝 Form submitted:', data);
        setSubmittedData(data);

        toast({
            title: '✅ Đã lưu lịch công tác',
            description: `Nội dung: ${data.content}`,
        });
    };

    const handleCancel = () => {
        toast({
            title: 'Đã hủy',
            description: 'Không lưu thay đổi',
            variant: 'destructive'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Sparkles className="h-8 w-8 text-blue-600" />
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Voice-Guided Schedule Form
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Demo tính năng nhập liệu lịch công tác bằng giọng nói với hướng dẫn tuần tự
                    </p>
                </div>

                {/* Instructions */}
                <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            Hướng dẫn sử dụng
                        </CardTitle>
                        <CardDescription>
                            Làm theo các bước sau để nhập liệu bằng giọng nói
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                1
                            </span>
                            <p>Click nút <strong>"Bật giọng nói"</strong> để bắt đầu</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                2
                            </span>
                            <p>Hệ thống sẽ hướng dẫn từng trường một bằng giọng nói</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                3
                            </span>
                            <p>Nói nội dung và kết thúc bằng từ <strong>"hết"</strong></p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                4
                            </span>
                            <p>Trường hiện tại sẽ sáng lên màu xanh với icon loa nhấp nháy</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                5
                            </span>
                            <p>Sau khi hoàn thành, kiểm tra và click "Lưu lịch"</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Form nhập liệu</CardTitle>
                        <CardDescription>
                            Thử nghiệm tính năng Voice-Guided Form
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <VoiceGuidedScheduleForm
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                        />
                    </CardContent>
                </Card>

                {/* Result Display */}
                {submittedData && (
                    <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
                        <CardHeader>
                            <CardTitle className="text-green-700 dark:text-green-400">
                                ✅ Dữ liệu đã lưu
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-white dark:bg-slate-900 p-4 rounded-lg overflow-auto text-xs">
                                {JSON.stringify(submittedData, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {/* Examples */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ví dụ câu nói</CardTitle>
                        <CardDescription>
                            Tham khảo các ví dụ sau để nhập liệu chính xác
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Ngày:</h4>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>• "ngày 15 tháng 1 năm 2026 hết"</li>
                                <li>• "15 tháng 1 hết" (dùng năm hiện tại)</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Giờ:</h4>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>• "8 giờ sáng hết" → 08:00</li>
                                <li>• "2 giờ chiều hết" → 14:00</li>
                                <li>• "8 giờ 30 hết" → 08:30</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Nội dung:</h4>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>• "họp giao ban tuần hết" → Họp Giao Ban Tuần</li>
                                <li>• "họp ban giám hiệu hết" → Họp Ban Giám Hiệu</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Thành phần tham dự:</h4>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>• "ban giám hiệu, phòng đào tạo hết"</li>
                                <li>• "toàn thể cán bộ giáo viên hết"</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Loại sự kiện:</h4>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>• "cuộc họp hết"</li>
                                <li>• "hội nghị hết"</li>
                                <li>• "tạm ngưng hết"</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Bỏ qua trường (không bắt buộc):</h4>
                            <ul className="text-sm space-y-1 text-muted-foreground">
                                <li>• Chỉ cần nói "hết"</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
