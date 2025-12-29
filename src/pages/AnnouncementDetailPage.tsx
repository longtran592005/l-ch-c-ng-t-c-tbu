import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MainLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAnnouncements } from '@/contexts/AnnouncementsContext';
import { Calendar, User, ArrowLeft, Share2, Printer, Bell, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getAnnouncementById, announcementsList } = useAnnouncements();
  const announcement = id ? getAnnouncementById(id) : undefined;

  if (!announcement) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy thông báo</h1>
          <Link to="/thong-bao">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại danh sách
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const priorityConfig = {
    urgent: { label: 'Khẩn cấp', icon: AlertTriangle, className: 'bg-destructive text-destructive-foreground' },
    important: { label: 'Quan trọng', icon: Bell, className: 'bg-amber-500 text-white' },
    normal: { label: 'Thông thường', icon: Info, className: 'bg-secondary text-secondary-foreground' }
  };

  const config = priorityConfig[announcement.priority];
  const PriorityIcon = config.icon;

  // Get other announcements
  const otherAnnouncements = announcementsList
    .filter(a => a.id !== announcement.id)
    .slice(0, 5);

  return (
    <MainLayout>
      <title>{announcement.title} - Trường Đại học Thái Bình</title>
      <meta name="description" content={announcement.content.substring(0, 160)} />

      {/* Priority Banner for Urgent */}
      {announcement.priority === 'urgent' && (
        <div className="bg-destructive text-destructive-foreground py-2 text-center">
          <div className="container mx-auto px-4 flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Thông báo khẩn cấp - Vui lòng đọc kỹ nội dung</span>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <section className="bg-secondary/50 py-3 border-b border-border">
        <div className="container mx-auto px-4">
          <nav className="text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Trang chủ</Link>
            <span className="mx-2">/</span>
            <Link to="/thong-bao" className="hover:text-primary">Thông báo</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium line-clamp-1">{announcement.title}</span>
          </nav>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <header className="mb-8">
                <Badge className={cn("mb-4", config.className)}>
                  <PriorityIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
                  {announcement.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b border-border">
                  {announcement.createdBy && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{announcement.createdBy}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(announcement.publishedAt), "dd 'tháng' MM, yyyy", { locale: vi })}</span>
                  </div>
                </div>
              </header>

              {/* Content */}
              <div className={cn(
                "rounded-xl p-6 mb-8",
                announcement.priority === 'urgent' && "bg-destructive/5 border border-destructive/20",
                announcement.priority === 'important' && "bg-amber-50 border border-amber-200",
                announcement.priority === 'normal' && "bg-secondary/30"
              )}>
                <div className="prose prose-lg max-w-none">
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap text-lg">
                    {announcement.content}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 py-6 border-t border-b border-border mb-8">
                <span className="font-medium text-foreground">Chia sẻ:</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Sao chép
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    In
                  </Button>
                </div>
              </div>

              {/* Back Button */}
              <Link to="/thong-bao">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại danh sách thông báo
                </Button>
              </Link>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-4">
                <h3 className="font-serif text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">
                  Thông báo khác
                </h3>
                <div className="space-y-4">
                  {otherAnnouncements.map((item) => {
                    const itemConfig = priorityConfig[item.priority];
                    return (
                      <Link key={item.id} to={`/thong-bao/${item.id}`} className="block group">
                        <div className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors">
                          <Badge className={cn("mb-2 text-xs", itemConfig.className)}>
                            {itemConfig.label}
                          </Badge>
                          <h4 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(item.publishedAt), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </MainLayout>
  );
}
