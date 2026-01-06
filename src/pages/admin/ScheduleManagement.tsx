
import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { useSchedules, useAuth } from '@/contexts';
import { Schedule, ScheduleStatus, ScheduleEventType } from '@/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  CalendarIcon,
  MoreHorizontal,
  ShieldAlert,
  Mic,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { parseVoiceCommand } from '@/utils/voiceParser';

// Cấu hình hiển thị trạng thái
const statusConfig: Record<ScheduleStatus, { label: string; className: string; icon: React.ElementType }> = {
  approved: { label: 'Đã duyệt', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
  draft: { label: 'Chưa duyệt', className: 'bg-orange-100 text-orange-700', icon: Clock },
  cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-700', icon: XCircle },
};

// Cấu hình hiển thị loại sự kiện
const eventTypeConfig: Record<ScheduleEventType, { label: string; className: string }> = {
  cuoc_hop: { label: 'Cuộc họp', className: 'bg-blue-100 text-blue-700' },
  hoi_nghi: { label: 'Hội nghị', className: 'bg-purple-100 text-purple-700' },
  tam_ngung: { label: 'Tạm ngưng', className: 'bg-gray-100 text-gray-700' },
};

export default function ScheduleManagement() {
  // Sử dụng context để quản lý lịch
  const { schedules, addSchedule, updateSchedule, deleteSchedule, approveSchedule } = useSchedules();
  const { user, canManageSchedule } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
    }
  }, []);

  // Form state definition needs to count before handleVoiceInput to address potential scoping issues if any
  const [formData, setFormData] = useState({
    date: new Date(),
    startTime: '08:00',
    endTime: '10:00',
    content: '',
    location: '',
    leader: '',
    participants: '',
    preparingUnit: '',
    notes: '',
    eventType: '' as ScheduleEventType | '',
  });

  const handleVoiceInput = useCallback(() => {
    if (!voiceSupported) {
      toast({
        title: "Không hỗ trợ",
        description: "Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.",
        variant: "destructive"
      });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: "Đang nghe...",
        description: "Hãy nói câu lệnh của bạn (VD: Tạo cuộc họp 8 giờ ngày 7-1, do thầy Nam chủ trì)",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      toast({
        title: "Lỗi",
        description: "Không thể nhận dạng giọng nói. Vui lòng thử lại.",
        variant: "destructive"
      });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("Voice Transcript:", transcript);

      try {
        const parsedData = parseVoiceCommand(transcript);
        console.log("Parsed Data:", parsedData);

        // Pre-fill form and open dialog
        setFormData(prev => ({
          ...prev,
          date: parsedData.date || new Date(),
          startTime: parsedData.startTime || '08:00',
          endTime: parsedData.endTime || '10:00',
          content: parsedData.content || transcript,
          leader: parsedData.leader || '',
          eventType: parsedData.eventType || '',
          location: '',
          participants: '',
          preparingUnit: '',
          notes: ''
        }));

        setEditingSchedule(null); // Ensure add mode
        setIsDialogOpen(true);

        toast({
          title: "Đã nhận dạng",
          description: `"${transcript}"`,
        });

      } catch (e) {
        console.error("Parsing error", e);
        toast({
          title: "Lỗi xử lý",
          description: "Không thể xử lý thông tin từ giọng nói.",
          variant: "destructive"
        });
      }
    };

    recognition.start();
  }, [voiceSupported, toast]);

  const [leaderOptions, setLeaderOptions] = useState<string[]>([]);

  // Lọc lịch theo search và eventType
  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.leader.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEventType = eventTypeFilter === 'all' || schedule.eventType === eventTypeFilter;
    return matchesSearch && matchesEventType;
  });

  // Mở dialog thêm/sửa
  const handleOpenDialog = (schedule?: Schedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        date: new Date(schedule.date),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        content: schedule.content,
        location: schedule.location,
        leader: schedule.leader,
        participants: schedule.participants.join(', '),
        preparingUnit: schedule.preparingUnit,
        notes: schedule.notes || '',
        eventType: schedule.eventType || '',
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        date: new Date(),
        startTime: '08:00',
        endTime: '10:00',
        content: '',
        location: '',
        leader: '',
        participants: '',
        preparingUnit: '',
        notes: '',
        eventType: '', // Reset
      });
    }
    setIsDialogOpen(true);
  };

  // Load suggested leaders from localStorage users (roles 'bgh' or 'ban_giam_hieu')
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tbu_users');
      if (!stored) return;
      const users = JSON.parse(stored) as Array<any>;
      const leaders = users
        .filter(u => u.role === 'bgh' || u.role === 'ban_giam_hieu')
        .map(u => u.name)
        .filter(Boolean);
      setLeaderOptions(Array.from(new Set(leaders)));
    } catch (e) {
      console.error('Failed to load leader suggestions', e);
    }
  }, []);

  // Submit form
  const handleSubmit = async () => {
    console.log('handleSubmit called - Current formData:', formData);

    // Validate form - check all required fields
    if (!formData.date || !formData.startTime || !formData.endTime || !formData.content || !formData.location || !formData.leader || !formData.eventType) {
      const errorMsg = 'Vui lòng điền đầy đủ các trường bắt buộc: Ngày, giờ bắt đầu, nội dung, địa điểm, lãnh đạo chủ trì, và loại sự kiện.';
      console.error('Validation failed:', errorMsg, {
        date: !!formData.date,
        startTime: !!formData.startTime,
        endTime: !!formData.endTime,
        content: !!formData.content,
        location: !!formData.location,
        leader: !!formData.leader,
        eventType: !!formData.eventType
      });
      toast({
        title: 'Lỗi',
        description: errorMsg,
        variant: 'destructive',
      });
      return;
    }

    const scheduleData = {
      date: formData.date,
      dayOfWeek: format(formData.date, 'EEEE', { locale: vi }),
      startTime: formData.startTime,
      endTime: formData.endTime,
      content: formData.content,
      location: formData.location,
      leader: formData.leader,
      participants: formData.participants.split(',').map(p => p.trim()).filter(Boolean),
      preparingUnit: formData.preparingUnit,
      notes: formData.notes,
      eventType: formData.eventType as ScheduleEventType,
      status: 'draft' as ScheduleStatus,
      createdBy: user?.id || 'admin',
    };

    try {
      console.log('🔵 [Schedule] Submitting schedule:', scheduleData);
      console.log('🔵 [Schedule] User info:', { userId: user?.id, userName: user?.name, userRole: user?.role });
      console.log('🔵 [Schedule] Auth token exists:', !!localStorage.getItem('tbu_auth_token'));

      if (editingSchedule) {
        console.log('🔵 [Schedule] Updating existing schedule:', editingSchedule.id);
        await updateSchedule(editingSchedule.id, scheduleData);
        toast({ title: 'Đã cập nhật lịch công tác' });
      } else {
        console.log('🔵 [Schedule] Creating new schedule');
        await addSchedule(scheduleData);
        toast({ title: 'Đã thêm lịch công tác mới' });
      }
      console.log('✅ [Schedule] Success! Dialog closing and form resetting');
      // Reset form state
      setFormData({
        date: new Date(),
        startTime: '08:00',
        endTime: '10:00',
        content: '',
        location: '',
        leader: '',
        participants: '',
        preparingUnit: '',
        notes: '',
        eventType: '',
      });
      setEditingSchedule(null);
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error('❌ [Schedule] Submit error:', {
        message: err?.message,
        status: err?.status,
        fullError: err,
        stack: err?.stack
      });
      const errorMessage = err?.message || 'Không thể lưu lịch. Vui lòng kiểm tra kết nối mạng và thử lại.';
      toast({
        title: 'Lỗi',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Duyệt lịch
  const handleApprove = async (id: string) => {
    try {
      await approveSchedule(id, user?.name || 'admin');
      toast({ title: 'Đã duyệt lịch công tác' });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err?.message || 'Không thể duyệt lịch', variant: 'destructive' });
    }
  };

  // Xóa lịch
  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      setDeleteConfirmId(null);
      toast({ title: 'Đã xóa lịch công tác' });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err?.message || 'Không thể xóa lịch', variant: 'destructive' });
    }
  };

  // Kiểm tra quyền
  if (!canManageSchedule) {
    return (
      <AdminLayout title="Quản lý Lịch Công Tác">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Không có quyền truy cập</h2>
          <p className="text-muted-foreground">
            Bạn cần đăng nhập với tài khoản Admin hoặc BGH để quản lý lịch công tác.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Quản lý Lịch Công Tác">
      <title>Quản lý Lịch Công Tác - Trường Đại học Thái Bình</title>

      {/* Toolbar - Thanh công cụ */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-4">
          {/* Tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo nội dung, lãnh đạo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Lọc loại sự kiện */}
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Loại sự kiện" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="cuoc_hop">Cuộc họp</SelectItem>
              <SelectItem value="hoi_nghi">Hội nghị</SelectItem>
              <SelectItem value="tam_ngung">Tạm ngưng</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {/* Voice Input Button */}
          {voiceSupported && (
            <Button
              variant={isListening ? "destructive" : "outline"}
              onClick={handleVoiceInput}
              title="Tạo lịch bằng giọng nói"
              className={cn("gap-2", isListening && "animate-pulse")}
            >
              {isListening ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang nghe...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Giọng nói
                </>
              )}
            </Button>
          )}

          {/* Dialog thêm/sửa lịch */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4" />
                Thêm lịch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* ... Dialog Content ... */}
              <DialogHeader>
                <DialogTitle className="font-serif">
                  {editingSchedule ? 'Chỉnh sửa lịch công tác' : 'Thêm lịch công tác mới'}
                </DialogTitle>
                <DialogDescription>
                  Điền thông tin chi tiết cho lịch công tác
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Chọn ngày */}
                  <div className="space-y-2">
                    <Label>Ngày *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          type="button"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.date, 'dd/MM/yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[100]" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({ ...formData, date });
                            }
                          }}
                          initialFocus
                          className="p-3"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Chọn thời gian */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Bắt đầu *</Label>
                      <Input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kết thúc</Label>
                      <Input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Nội dung */}
                <div className="space-y-2">
                  <Label>Nội dung công tác *</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Nhập nội dung cuộc họp, công tác..."
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Lãnh đạo chủ trì */}
                  <div className="space-y-2">
                    <Label>Lãnh đạo chủ trì *</Label>
                    <div className="relative">
                      <Input
                        list="leader-suggestions"
                        value={formData.leader}
                        onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                        placeholder="Nhập hoặc chọn lãnh đạo..."
                      />
                      <datalist id="leader-suggestions">
                        {leaderOptions.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Địa điểm */}
                  <div className="space-y-2">
                    <Label>Địa điểm *</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Phòng họp, địa điểm..."
                    />
                  </div>
                </div>

                {/* Thành phần tham dự */}
                <div className="space-y-2">
                  <Label>Thành phần tham dự</Label>
                  <Input
                    value={formData.participants}
                    onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                    placeholder="Ban Giám hiệu, Phòng Đào tạo, ... (phân cách bằng dấu phẩy)"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Đơn vị chuẩn bị */}
                  <div className="space-y-2">
                    <Label>Đơn vị chuẩn bị</Label>
                    <Select
                      value={formData.preparingUnit}
                      onValueChange={(value) => setFormData({ ...formData, preparingUnit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn đơn vị" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Department X">Phòng X</SelectItem>
                        <SelectItem value="Department Y">Phòng Y</SelectItem>
                        <SelectItem value="Department Z">Phòng Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Loại sự kiện */}
                  <div className="space-y-2">
                    <Label>Loại sự kiện *</Label>
                    <Select
                      value={formData.eventType}
                      onValueChange={(value) => setFormData({ ...formData, eventType: value as ScheduleEventType })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại sự kiện" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cuoc_hop">Cuộc họp</SelectItem>
                        <SelectItem value="hoi_nghi">Hội nghị</SelectItem>
                        <SelectItem value="tam_ngung">Tạm ngưng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Ghi chú */}
                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ghi chú thêm..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                {/* Disable submit until required fields (marked with *) are filled */}
                <Button
                  onClick={handleSubmit}
                  className="btn-primary"
                  disabled={!(formData.date && formData.startTime && formData.content && formData.location && formData.leader && formData.eventType)}
                >
                  {editingSchedule ? 'Cập nhật' : 'Thêm mới'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bảng danh sách lịch */}
      <div className="university-card overflow-hidden">
        {/* ... Table ... */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-4 py-3 text-left font-semibold">Ngày</th>
                <th className="px-4 py-3 text-left font-semibold">Thời gian</th>
                <th className="px-4 py-3 text-left font-semibold min-w-[250px]">Nội dung</th>
                <th className="px-4 py-3 text-left font-semibold">Địa điểm</th>
                <th className="px-4 py-3 text-left font-semibold">Chủ trì</th>
                <th className="px-4 py-3 text-left font-semibold">Người tạo</th>
                <th className="px-4 py-3 text-left font-semibold">Loại sự kiện</th>
                <th className="px-4 py-3 text-center font-semibold w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((schedule) => {
                const eventType = schedule.eventType;
                return (
                  <tr key={schedule.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{format(new Date(schedule.date), 'dd/MM/yyyy')}</div>
                      <div className="text-sm text-muted-foreground">{schedule.dayOfWeek}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {schedule.startTime} - {schedule.endTime}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium line-clamp-2">{schedule.content}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{schedule.location}</td>
                    <td className="px-4 py-3 text-sm font-medium">{schedule.leader}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{(schedule as any).createdByName || schedule.createdBy || 'Không xác định'}</td>
                    <td className="px-4 py-3">
                      {eventType && eventTypeConfig[eventType] ? (
                        <Badge className={cn('gap-1', eventTypeConfig[eventType].className)}>
                          {eventTypeConfig[eventType].label}
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">
                          Chưa phân loại
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(schedule)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirmId(schedule.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredSchedules.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground mb-2">Không tìm thấy lịch công tác nào</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || eventTypeFilter !== 'all'
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                : 'Hãy thêm lịch công tác mới để bắt đầu'}
            </p>
          </div>
        )}
      </div>

      {/* Dialog xác nhận xóa */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa lịch công tác này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
