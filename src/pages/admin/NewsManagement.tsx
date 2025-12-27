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
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { News } from '@/types';

// Dữ liệu mẫu tin tức
const initialNews: News[] = [
  {
    id: '1',
    title: 'Trường Đại học Thái Bình tổ chức Lễ khai giảng năm học 2024-2025',
    summary: 'Sáng ngày 05/09/2024, Trường Đại học Thái Bình long trọng tổ chức Lễ khai giảng năm học mới.',
    content: 'Nội dung chi tiết...',
    image: '/placeholder.svg',
    category: 'news',
    publishedAt: new Date(),
    author: 'Admin',
    views: 150,
  },
  {
    id: '2',
    title: 'Hội nghị khoa học cấp trường lần thứ X',
    summary: 'Hội nghị khoa học được tổ chức nhằm tổng kết hoạt động NCKH trong năm học.',
    content: 'Nội dung chi tiết...',
    image: '/placeholder.svg',
    category: 'event',
    publishedAt: new Date(),
    author: 'Admin',
    views: 89,
  },
];

// Trang quản lý tin tức cho admin
export default function NewsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [newsList, setNewsList] = useState<News[]>(initialNews);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    image: '',
  });

  const filteredNews = newsList.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mở dialog thêm/sửa
  const handleOpenDialog = (news?: News) => {
    if (news) {
      setEditingNews(news);
      setFormData({
        title: news.title,
        summary: news.summary,
        content: news.content,
        image: news.image || '',
      });
    } else {
      setEditingNews(null);
      setFormData({ title: '', summary: '', content: '', image: '' });
    }
    setIsDialogOpen(true);
  };

  // Submit form
  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.summary.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền tiêu đề và tóm tắt.',
        variant: 'destructive',
      });
      return;
    }

    if (editingNews) {
      setNewsList(prev => prev.map(n => 
        n.id === editingNews.id 
          ? { ...n, ...formData }
          : n
      ));
      toast({ title: 'Đã cập nhật tin tức' });
    } else {
      const newNews: News = {
        id: Date.now().toString(),
        title: formData.title,
        summary: formData.summary,
        content: formData.content,
        image: formData.image || '/placeholder.svg',
        category: 'news',
        publishedAt: new Date(),
        author: 'Admin',
        views: 0,
      };
      setNewsList(prev => [newNews, ...prev]);
      toast({ title: 'Đã thêm tin tức mới' });
    }
    setIsDialogOpen(false);
  };

  // Xóa tin tức
  const handleDelete = (id: string) => {
    setNewsList(prev => prev.filter(n => n.id !== id));
    setDeleteConfirmId(null);
    toast({ title: 'Đã xóa tin tức' });
  };

  return (
    <AdminLayout title="Quản lý Tin tức">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tin tức..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4" />
            Thêm tin tức
          </Button>
        </div>

        {/* News List */}
        <div className="grid gap-4">
          {filteredNews.map((news) => (
            <Card key={news.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {news.image && (
                    <img
                      src={news.image}
                      alt={news.title}
                      className="w-full md:w-32 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold text-foreground line-clamp-2">{news.title}</h3>
                      <Badge variant="default">Đã đăng</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{news.summary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(news.publishedAt).toLocaleDateString('vi-VN')}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" title="Xem">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(news)} title="Sửa">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive"
                          onClick={() => setDeleteConfirmId(news.id)}
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredNews.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Không tìm thấy tin tức nào
          </div>
        )}
      </div>

      {/* Dialog thêm/sửa tin tức */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingNews ? 'Chỉnh sửa tin tức' : 'Thêm tin tức mới'}</DialogTitle>
            <DialogDescription>Điền thông tin chi tiết cho tin tức</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Tiêu đề *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nhập tiêu đề tin tức..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tóm tắt *</Label>
              <Textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Nhập tóm tắt..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Nội dung</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Nhập nội dung chi tiết..."
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Đường dẫn ảnh</Label>
              <Input
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit}>{editingNews ? 'Cập nhật' : 'Thêm mới'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tin tức này? Hành động này không thể hoàn tác.
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
