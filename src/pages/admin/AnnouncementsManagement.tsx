import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Eye, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Announcement } from '@/types';
import { useAuth, useAnnouncements, useNotifications } from '@/contexts';

interface ExtendedAnnouncement extends Announcement {
  createdBy?: string;
}


// Trang quản lý thông báo cho admin
export default function AnnouncementsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const { announcementsList, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useAnnouncements();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<ExtendedAnnouncement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'normal' | 'important' | 'urgent',
  });

  const filteredAnnouncements = announcementsList.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Khẩn cấp</Badge>;
      case 'important':
        return <Badge className="bg-amber-500">Quan trọng</Badge>;
      default:
        return <Badge variant="secondary">Thông thường</Badge>;
    }
  };

  // Mở dialog thêm/sửa
  const handleOpenDialog = (announcement?: ExtendedAnnouncement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({ title: '', content: '', priority: 'normal' });
    }
    setIsDialogOpen(true);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền tiêu đề và nội dung.',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Submitting announcement:', { title: formData.title, priority: formData.priority });
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, { ...editingAnnouncement, ...formData });
        toast({ title: 'Đã cập nhật thông báo' });
        // Thêm thông báo vào notification
        addNotification({
          title: 'Cập nhật thông báo',
          message: `Thông báo "${formData.title}" đã được cập nhật`,
          type: 'announcement',
          linkedId: editingAnnouncement.id,
        });
      } else {
        const newAnnouncement = await addAnnouncement({
          title: formData.title,
          content: formData.content,
          priority: formData.priority,
        });
        toast({ title: 'Đã thêm thông báo mới' });
        // Thêm thông báo vào notification
        addNotification({
          title: 'Thông báo mới',
          message: `Thông báo mới: ${formData.title}`,
          type: 'announcement',
          linkedId: newAnnouncement?.id,
        });
      }
      // Reset form state
      setFormData({ title: '', content: '', priority: 'normal' });
      setEditingAnnouncement(null);
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error('Announcement submit error:', err);
      toast({ title: 'Lỗi', description: err?.message || 'Không thể lưu thông báo', variant: 'destructive' });
    }
  };

  // Xóa thông báo
  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      setDeleteConfirmId(null);
      toast({ title: 'Đã xóa thông báo' });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err?.message || 'Không thể xóa thông báo', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Quản lý Thông báo">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm thông báo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4" />
            Thêm thông báo
          </Button>
        </div>

        {/* Announcements List */}
        <div className="grid gap-4">
          {filteredAnnouncements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPriorityBadge(announcement.priority)}
                    </div>
                    <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {announcement.createdBy || 'Không xác định'}
                      </span>
                      <span>•</span>
                      <span>{new Date(announcement.publishedAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" title="Xem">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(announcement)} title="Sửa">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteConfirmId(announcement.id)}
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Không tìm thấy thông báo nào
          </div>
        )}
      </div>

      {/* Dialog thêm/sửa thông báo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? 'Chỉnh sửa thông báo' : 'Thêm thông báo mới'}</DialogTitle>
            <DialogDescription>Điền thông tin chi tiết cho thông báo</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Tiêu đề *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nhập tiêu đề thông báo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Mức độ ưu tiên</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'normal' | 'important' | 'urgent') =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Thông thường</SelectItem>
                  <SelectItem value="important">Quan trọng</SelectItem>
                  <SelectItem value="urgent">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nội dung *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Nhập nội dung thông báo..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit}>{editingAnnouncement ? 'Cập nhật' : 'Thêm mới'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác.
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
