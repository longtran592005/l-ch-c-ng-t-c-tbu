
import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ShieldAlert
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VoiceGuidedScheduleForm, type ScheduleFormData } from '@/components/schedule/VoiceGuidedScheduleForm';

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
    } else {
      setEditingSchedule(null);
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

  // Xử lý lưu lịch từ Voice-Guided Form
  const handleFormSubmit = async (data: ScheduleFormData) => {
    const scheduleData = {
      date: data.date,
      dayOfWeek: format(data.date, 'EEEE', { locale: vi }),
      startTime: data.startTime,
      endTime: data.endTime,
      content: data.content,
      location: data.location,
      leader: data.leader,
      participants: data.participants.split(',').map(p => p.trim()).filter(Boolean),
      preparingUnit: data.preparingUnit,
      notes: data.notes,
      eventType: data.eventType as ScheduleEventType,
      status: 'draft' as ScheduleStatus,
      createdBy: user?.id || 'admin',
    };

    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, scheduleData);
        toast({ title: 'Đã cập nhật lịch công tác' });
      } else {
        await addSchedule(scheduleData);
        toast({ title: 'Đã thêm lịch công tác mới' });
      }
      setEditingSchedule(null);
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error('❌ [Schedule] Submit error:', err);
      const errorMessage = err?.message || 'Không thể lưu lịch. Vui lòng thử lại.';
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
          {/* Voice Input Button - Mở dialog với voice mode */}

          {/* Dialog thêm/sửa lịch */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4" />
                Thêm lịch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
              <div className="bg-background rounded-xl shadow-2xl border flex flex-col h-full max-h-[95vh]">
                <DialogHeader className="p-6 border-b bg-muted/30">
                  <DialogTitle className="font-serif text-2xl text-primary">
                    {editingSchedule ? 'Chỉnh sửa lịch công tác' : 'Thêm lịch công tác mới'}
                  </DialogTitle>
                  <DialogDescription>
                    Bạn có thể nhập liệu bằng tay hoặc nhấn vào biểu tượng <span className="font-bold text-primary">Microphone nổi</span> ở góc dưới để bắt đầu trợ lý giọng nói.
                  </DialogDescription>
                </DialogHeader>

                <div className="p-6 overflow-y-auto">
                  <VoiceGuidedScheduleForm
                    onSubmit={handleFormSubmit}
                    onCancel={() => {
                      setIsDialogOpen(false);
                      setEditingSchedule(null);
                    }}
                    initialData={editingSchedule ? {
                      date: new Date(editingSchedule.date),
                      startTime: editingSchedule.startTime,
                      endTime: editingSchedule.endTime,
                      content: editingSchedule.content,
                      location: editingSchedule.location,
                      leader: editingSchedule.leader,
                      participants: editingSchedule.participants.join(', '),
                      preparingUnit: editingSchedule.preparingUnit,
                      eventType: editingSchedule.eventType || '',
                      notes: editingSchedule.notes || ''
                    } : undefined}
                  />
                </div>
              </div>
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
