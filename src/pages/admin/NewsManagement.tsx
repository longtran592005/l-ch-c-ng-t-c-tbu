import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { mockNews } from '@/data/mockData';

// Trang quản lý tin tức cho admin
export default function NewsManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNews = mockNews.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Button className="gap-2">
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
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
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
    </AdminLayout>
  );
}
