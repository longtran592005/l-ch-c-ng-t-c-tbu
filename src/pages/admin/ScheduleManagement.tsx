
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useSchedules, useAuth, useNotifications } from '@/contexts';
import { Schedule, ScheduleStatus, ScheduleEventType } from '@/types';
import { format, isToday, isBefore, isAfter, startOfDay } from 'date-fns';
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  Dot
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
  const { addNotification } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();

  const [leaderOptions, setLeaderOptions] = useState<string[]>([]);

  // Pagination state
  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);

  // Lọc và sắp xếp lịch - ngày hôm nay ở giữa
  const { filteredSchedules, todayIndex, pastCount, futureCount } = useMemo(() => {
    const today = startOfDay(new Date());

    // Lọc theo search và eventType
    const filtered = schedules.filter(schedule => {
      const matchesSearch = schedule.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.leader.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEventType = eventTypeFilter === 'all' || schedule.eventType === eventTypeFilter;
      return matchesSearch && matchesEventType;
    });

    // Sắp xếp theo ngày (tăng dần)
    const sorted = [...filtered].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Tìm index của ngày hôm nay hoặc ngày gần nhất
    let todayIdx = sorted.findIndex(s => {
      const scheduleDate = startOfDay(new Date(s.date));
      return scheduleDate.getTime() >= today.getTime();
    });

    // Nếu không tìm thấy (tất cả đều là quá khứ), đặt ở cuối
    if (todayIdx === -1) todayIdx = sorted.length;

    // Đếm số lịch quá khứ và tương lai
    const past = sorted.filter(s => isBefore(startOfDay(new Date(s.date)), today)).length;
    const future = sorted.filter(s => isAfter(startOfDay(new Date(s.date)), today)).length;

    return {
      filteredSchedules: sorted,
      todayIndex: todayIdx,
      pastCount: past,
      futureCount: future
    };
  }, [schedules, searchTerm, eventTypeFilter]);

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredSchedules.length / ITEMS_PER_PAGE);

  // Tính trang chứa ngày hôm nay
  const todayPage = useMemo(() => {
    if (todayIndex === 0) return 1;
    return Math.ceil((todayIndex + 1) / ITEMS_PER_PAGE);
  }, [todayIndex]);

  // Reset về trang chứa ngày hôm nay khi filter thay đổi
  useEffect(() => {
    setCurrentPage(Math.min(todayPage, totalPages) || 1);
  }, [searchTerm, eventTypeFilter, todayPage, totalPages]);

  // Lấy items cho trang hiện tại
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredSchedules.slice(startIndex, endIndex);
  }, [filteredSchedules, currentPage]);

  // Xác định vị trí ngày hôm nay trong trang hiện tại
  const todayPositionInPage = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    if (todayIndex >= startIndex && todayIndex < endIndex) {
      return todayIndex - startIndex;
    }
    return -1;
  }, [currentPage, todayIndex]);

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
      date: format(data.date, 'yyyy-MM-dd'), // Send as YYYY-MM-DD string to avoid timezone issues
      dayOfWeek: format(data.date, 'EEEE', { locale: vi }),
      startTime: data.startTime,
      endTime: data.endTime,
      content: data.content,
      location: data.location,
      leader: data.leader,
      participants: data.participants.split(',').map(p => p.trim()).filter(Boolean),
      preparingUnit: data.preparingUnit,
      cooperatingUnits: data.cooperatingUnits ? data.cooperatingUnits.split(',').map(u => u.trim()).filter(Boolean) : [],
      notes: data.notes,
      eventType: data.eventType as ScheduleEventType,
      status: 'draft' as ScheduleStatus,
      createdBy: user?.id || 'admin',
    };

    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, scheduleData);
        toast({ title: 'Đã cập nhật lịch công tác' });
        // Thêm thông báo cho việc cập nhật lịch
        addNotification({
          title: 'Lịch công tác đã được cập nhật',
          message: `${data.content} - ${format(data.date, 'dd/MM/yyyy')}`,
          time: 'Vừa xong',
          type: 'schedule',
          linkedId: editingSchedule.id,
        });
      } else {
        await addSchedule(scheduleData);
        toast({ title: 'Đã thêm lịch công tác mới' });
        // Thêm thông báo cho lịch mới
        addNotification({
          title: 'Có lịch công tác mới',
          message: `${data.content} - ${format(data.date, 'dd/MM/yyyy')} lúc ${data.startTime}`,
          time: 'Vừa xong',
          type: 'schedule',
        });
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
                      cooperatingUnits: editingSchedule.cooperatingUnits?.join(', ') || '',
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
        {/* Timeline indicator */}
        {filteredSchedules.length > 0 && (
          <div className="px-4 py-3 bg-gradient-to-r from-muted/50 via-background to-muted/50 border-b flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ArrowUp className="h-3.5 w-3.5" />
                <span>{pastCount} lịch đã qua</span>
              </div>
              <div className="flex items-center gap-1.5 text-primary font-medium">
                <CalendarDays className="h-4 w-4" />
                <span>Hôm nay</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ArrowDown className="h-3.5 w-3.5" />
                <span>{futureCount} lịch sắp tới</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(todayPage)}
              className="gap-1.5"
              disabled={currentPage === todayPage}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Về hôm nay
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20 w-24">Ngày</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20 w-20">Thời gian</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20 min-w-[180px]">Nội dung</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20 w-36">Thành phần tham dự</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20 w-28">Địa điểm</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20 w-28">Lãnh đạo chủ trì</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20 w-28">Đơn vị chuẩn bị</th>
                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20 w-28">Đơn vị phối hợp</th>
                <th className="px-3 py-2.5 text-center font-semibold border border-primary-foreground/20 w-16">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((schedule, index) => {
                const scheduleDate = startOfDay(new Date(schedule.date));
                const today = startOfDay(new Date());
                const isPast = isBefore(scheduleDate, today);
                const isTodaySchedule = isToday(new Date(schedule.date));
                const isFuture = isAfter(scheduleDate, today);

                return (
                  <tr
                    key={schedule.id}
                    className={cn(
                      "border-b border-border transition-colors",
                      isTodaySchedule && "bg-primary/5 ring-2 ring-inset ring-primary/20",
                      isPast && "bg-muted/30 text-muted-foreground",
                      isFuture && "bg-background hover:bg-secondary/30",
                      !isTodaySchedule && !isPast && !isFuture && "hover:bg-secondary/30"
                    )}
                  >
                    <td className="px-3 py-2 border border-border align-top">
                      <div className="flex items-start gap-1.5">
                        {isTodaySchedule && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary">
                            Hôm nay
                          </Badge>
                        )}
                        <div>
                          <div className={cn("text-xs", isTodaySchedule && "text-primary font-medium")}>{schedule.dayOfWeek}</div>
                          <div className={cn("text-sm font-medium", isTodaySchedule && "text-primary")}>{format(new Date(schedule.date), 'dd/MM/yyyy')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 border border-border text-xs align-top">
                      <div className={cn(isTodaySchedule && "font-medium text-primary")}>{schedule.startTime}</div>
                      {schedule.endTime && <div className="text-muted-foreground">- {schedule.endTime}</div>}
                    </td>
                    <td className="px-3 py-2 border border-border align-top">
                      <p className={cn("text-sm", isTodaySchedule && "font-medium")}>{schedule.content}</p>
                      {schedule.notes && <p className="text-xs text-muted-foreground mt-1 italic">{schedule.notes}</p>}
                    </td>
                    <td className="px-3 py-2 border border-border text-xs align-top">
                      {schedule.participants?.join(', ') || '-'}
                    </td>
                    <td className="px-3 py-2 border border-border text-xs align-top">{schedule.location || '-'}</td>
                    <td className="px-3 py-2 border border-border text-xs font-medium align-top">{schedule.leader || '-'}</td>
                    <td className="px-3 py-2 border border-border text-xs align-top">{schedule.preparingUnit || '-'}</td>
                    <td className="px-3 py-2 border border-border text-xs align-top">{schedule.cooperatingUnits?.join(', ') || '-'}</td>
                    <td className="px-3 py-2 border border-border text-center align-top">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t bg-muted/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Info */}
              <div className="text-sm text-muted-foreground">
                Hiển thị <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                {' - '}
                <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredSchedules.length)}</span>
                {' '}trong tổng số{' '}
                <span className="font-medium text-foreground">{filteredSchedules.length}</span> lịch
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-1">
                {/* First page */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                {/* Previous page */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show: first, last, current, and 1 page around current
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, idx, arr) => {
                      // Add ellipsis
                      const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsisBefore && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="icon"
                            className={cn(
                              "h-8 w-8 font-medium",
                              page === todayPage && currentPage !== page && "ring-2 ring-primary/50"
                            )}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                {/* Next page */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Last page */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

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
