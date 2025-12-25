import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { mockSchedules, mockLeaders, mockDepartments } from '@/data/mockData';
import { Schedule, ScheduleStatus } from '@/types';
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
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusConfig: Record<ScheduleStatus, { label: string; className: string; icon: React.ElementType }> = {
  approved: { label: 'Đã duyệt', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
  draft: { label: 'Bản nháp', className: 'bg-gray-100 text-gray-700', icon: Edit },
  cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState<Schedule[]>(mockSchedules);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();

  // Form state
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
  });

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          schedule.leader.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.content || !formData.location || !formData.leader) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin bắt buộc.',
        variant: 'destructive',
      });
      return;
    }

    const newSchedule: Schedule = {
      id: editingSchedule?.id || Date.now().toString(),
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
      status: editingSchedule?.status || 'draft',
      createdBy: 'admin',
      createdAt: editingSchedule?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (editingSchedule) {
      setSchedules(schedules.map(s => s.id === editingSchedule.id ? newSchedule : s));
      toast({ title: 'Đã cập nhật lịch công tác' });
    } else {
      setSchedules([newSchedule, ...schedules]);
      toast({ title: 'Đã thêm lịch công tác mới' });
    }

    setIsDialogOpen(false);
  };

  const handleApprove = (id: string) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, status: 'approved' as ScheduleStatus, approvedAt: new Date(), approvedBy: 'admin' } : s
    ));
    toast({ title: 'Đã duyệt lịch công tác' });
  };

  const handleDelete = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id));
    toast({ title: 'Đã xóa lịch công tác' });
  };

  return (
    <AdminLayout title="Quản lý Lịch Công Tác">
      <title>Quản lý Lịch Công Tác - Trường Đại học Thái Bình</title>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo nội dung, lãnh đạo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="pending">Chờ duyệt</SelectItem>
              <SelectItem value="draft">Bản nháp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Thêm lịch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                {/* Date */}
                <div className="space-y-2">
                  <Label>Ngày *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.date, 'dd/MM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => date && setFormData({ ...formData, date })}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time */}
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

              {/* Content */}
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
                {/* Leader */}
                <div className="space-y-2">
                  <Label>Lãnh đạo chủ trì *</Label>
                  <Select 
                    value={formData.leader}
                    onValueChange={(value) => setFormData({ ...formData, leader: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn lãnh đạo" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockLeaders.map(leader => (
                        <SelectItem key={leader.id} value={leader.name}>
                          {leader.name} - {leader.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label>Địa điểm *</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Phòng họp, địa điểm..."
                  />
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-2">
                <Label>Thành phần tham dự</Label>
                <Input
                  value={formData.participants}
                  onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                  placeholder="Ban Giám hiệu, Phòng Đào tạo, ... (phân cách bằng dấu phẩy)"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Preparing Unit */}
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
                      {mockDepartments.map(dept => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ghi chú thêm..."
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSubmit} className="btn-primary">
                {editingSchedule ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedule Table */}
      <div className="university-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-4 py-3 text-left font-semibold">Ngày</th>
                <th className="px-4 py-3 text-left font-semibold">Thời gian</th>
                <th className="px-4 py-3 text-left font-semibold min-w-[250px]">Nội dung</th>
                <th className="px-4 py-3 text-left font-semibold">Địa điểm</th>
                <th className="px-4 py-3 text-left font-semibold">Chủ trì</th>
                <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-center font-semibold w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((schedule) => {
                const StatusIcon = statusConfig[schedule.status].icon;
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
                    <td className="px-4 py-3">
                      <Badge className={cn('gap-1', statusConfig[schedule.status].className)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig[schedule.status].label}
                      </Badge>
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
                          {schedule.status !== 'approved' && (
                            <DropdownMenuItem onClick={() => handleApprove(schedule.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Duyệt
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDelete(schedule.id)}
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

        {filteredSchedules.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Không tìm thấy lịch công tác nào</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
