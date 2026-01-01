import { format } from 'date-fns';
import { MainLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnnouncements } from '@/contexts/AnnouncementsContext';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton component for loading state

const priorityConfig = {
  urgent: { label: 'Khẩn cấp', icon: AlertCircle, className: 'bg-red-100 text-red-700 border-red-200' },
  important: { label: 'Quan trọng', icon: AlertCircle, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  normal: { label: 'Thông thường', icon: Info, className: 'bg-blue-100 text-blue-700 border-blue-200' },
};

export default function AnnouncementsPage() {
  const { announcementsList, isLoading, error } = useAnnouncements();

  return (
    <MainLayout>
      <title>Thông báo - Trường Đại học Thái Bình</title>
      <meta name="description" content="Thông báo từ Trường Đại học Thái Bình" />

      {/* Page Header */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Bell className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
                Thông báo
              </h1>
              <p className="text-primary-foreground/80">
                Các thông báo chính thức từ Trường Đại học Thái Bình
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <section className="bg-secondary/50 py-3 border-b border-border">
        <div className="container mx-auto px-4">
          <nav className="text-sm text-muted-foreground">
            <a href="/" className="hover:text-primary">Trang chủ</a>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium">Thông báo</span>
          </nav>
        </div>
      </section>

      {/* Announcements List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {isLoading && (
              // Loading Skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="university-card p-6 flex items-start gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))
            )}

            {error && (
              <div className="text-center text-red-500">
                <p>Error: {error}</p>
                <p>Could not load announcements.</p>
              </div>
            )}

            {!isLoading && !error && announcementsList.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p>Không có thông báo nào vào lúc này.</p>
                <p>Vui lòng kiểm tra lại sau.</p>
              </div>
            )}

            {!isLoading && !error && announcementsList.length > 0 && announcementsList.map((announcement) => {
              const priority = priorityConfig[announcement.priority] || priorityConfig.normal;
              const PriorityIcon = priority.icon;
              
              return (
                <article key={announcement.id} className="university-card p-6 hover:border-primary/20 transition-colors cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
                      priority.className.includes('bg-red') ? 'bg-red-100 text-red-700' :
                      priority.className.includes('bg-yellow') ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700' // Default to blue if priority className doesn't match
                    )}>
                      <Bell className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className={cn('text-xs', priority.className)}>
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {priority.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(announcement.publishedAt), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <h2 className="font-serif text-lg font-bold text-foreground mb-2 hover:text-primary transition-colors">
                        {announcement.title}
                      </h2>
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

