import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts';
import { useToast } from '@/hooks/use-toast';

interface RoomItem {
  id: string;
  name: string;
  description?: string | null;
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface RoomFormData {
  name: string;
  description: string;
  priority: string;
}

const defaultFormData: RoomFormData = {
  name: '',
  description: '',
  priority: '1',
};

export default function RoomsManagement() {
  const { canManageSchedule } = useAuth();
  const { toast } = useToast();

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(defaultFormData);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchRooms = async () => {
    if (!canManageSchedule) return;

    setIsLoading(true);
    try {
      const data = await api.get<RoomItem[]>('/rooms');
      setRooms(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: 'Không thể tải danh sách phòng',
        description: error.message || 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [canManageSchedule]);

  const filteredRooms = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rooms;

    return rooms.filter((room) => {
      const name = room.name.toLowerCase();
      const description = (room.description || '').toLowerCase();
      return name.includes(q) || description.includes(q);
    });
  }, [rooms, searchTerm]);

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (room: RoomItem) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description || '',
      priority: String(room.priority || 1),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const trimmedName = formData.name.trim();
    const parsedPriority = Number(formData.priority);

    if (!trimmedName) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Tên phòng là bắt buộc.',
        variant: 'destructive',
      });
      return;
    }

    if (![1, 2, 3].includes(parsedPriority)) {
      toast({
        title: 'Độ ưu tiên không hợp lệ',
        description: 'Độ ưu tiên phòng phải từ 1 đến 3.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      name: trimmedName,
      description: formData.description.trim() || null,
      priority: parsedPriority,
      isActive: true,
    };

    try {
      if (editingRoom) {
        await api.put(`/rooms/${editingRoom.id}`, payload);
        toast({ title: 'Cập nhật thành công', description: `Đã cập nhật phòng ${trimmedName}.` });
      } else {
        await api.post('/rooms', payload);
        toast({ title: 'Tạo phòng thành công', description: `Đã thêm phòng ${trimmedName}.` });
      }

      setIsDialogOpen(false);
      fetchRooms();
    } catch (error: any) {
      toast({
        title: 'Thao tác thất bại',
        description: error.message || 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (roomId: string) => {
    try {
      await api.delete(`/rooms/${roomId}`);
      toast({ title: 'Đã xóa phòng', description: 'Phòng đã được chuyển sang trạng thái không hoạt động.' });
      fetchRooms();
    } catch (error: any) {
      toast({
        title: 'Không thể xóa phòng',
        description: error.message || 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  if (!canManageSchedule) {
    return (
      <AdminLayout title="Quản lý phòng">
        <div className="py-16 text-center text-muted-foreground">Bạn không có quyền quản lý phòng.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Quản lý phòng">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm phòng theo tên hoặc mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="gap-2" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" /> Thêm phòng
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên phòng</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Ưu tiên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredRooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Chưa có phòng nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{room.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{room.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={room.isActive ? 'secondary' : 'destructive'}>
                          {room.isActive ? 'Hoạt động' : 'Không hoạt động'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="outline" onClick={() => handleOpenEdit(room)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => setDeleteConfirmId(room.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Cập nhật phòng' : 'Thêm phòng mới'}</DialogTitle>
            <DialogDescription>
              {editingRoom
                ? 'Chỉnh sửa thông tin phòng để dùng trong lập lịch.'
                : 'Tạo phòng mới để sử dụng cho lịch họp nội bộ.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomName">Tên phòng</Label>
              <Input
                id="roomName"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ví dụ: Phòng họp A1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomDescription">Mô tả</Label>
              <Input
                id="roomDescription"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Thiết bị, sức chứa..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomPriority">Độ ưu tiên (1-3)</Label>
              <Input
                id="roomPriority"
                type="number"
                min={1}
                max={3}
                value={formData.priority}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit}>{editingRoom ? 'Lưu thay đổi' : 'Tạo phòng'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa phòng này?</AlertDialogTitle>
            <AlertDialogDescription>
              Phòng sẽ không còn hiển thị để chọn khi tạo lịch mới. Dữ liệu lịch cũ vẫn được giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Xóa phòng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
