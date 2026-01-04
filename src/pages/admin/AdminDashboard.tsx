import { AdminLayout } from '@/components/admin/AdminLayout';
import { 
  Calendar, 
  Users, 
  FileText, 
  Bell, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useSchedules } from '@/contexts/ScheduleContext';
import { useAnnouncements } from '@/contexts/AnnouncementsContext';
import { useNews } from '@/contexts/NewsContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const { schedules, isLoading: isLoadingSchedules, error: errorSchedules } = useSchedules();
  const { announcementsList, isLoading: isLoadingAnnouncements, error: errorAnnouncements } = useAnnouncements();
  const { newsList, isLoading: isLoadingNews, error: errorNews } = useNews();

  const stats = [
    { 
      label: 'Lịch công tác tuần này', 
      value: isLoadingSchedules ? '...' : schedules.length,
      icon: Calendar,
      color: 'bg-primary/10 text-primary',
      change: '+3 so với tuần trước', // This can be dynamic in future
    },
    { 
      label: 'Cuộc họp', 
      value: isLoadingSchedules ? '...' : schedules.filter(s => s.eventType === 'cuoc_hop').length,
      icon: Clock,
      color: 'bg-blue-100 text-blue-700',
      change: 'Đã phân loại',
    },
    { 
      label: 'Hội nghị', 
      value: isLoadingSchedules ? '...' : schedules.filter(s => s.eventType === 'hoi_nghi').length,
      icon: CheckCircle,
      color: 'bg-purple-100 text-purple-700',
      change: 'Đã phân loại',
    },
    { 
      label: 'Tin tức & Thông báo', 
      value: isLoadingNews || isLoadingAnnouncements ? '...' : newsList.length + announcementsList.length,
      icon: FileText,
      color: 'bg-blue-100 text-blue-700',
      change: 'Đang hoạt động',
    },
  ];

  const recentSchedules = schedules.filter(s => s.eventType).slice(0, 5);
  const unclassifiedSchedules = schedules.filter(s => !s.eventType).slice(0, 3);

  return (
    <AdminLayout title="Tổng quan">
      <title>Quản trị - Trường Đại học Thái Bình</title>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="university-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                {isLoadingSchedules || isLoadingNews || isLoadingAnnouncements ? (
                  <Skeleton className="h-8 w-20 mb-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Schedules */}
        <div className="lg:col-span-2">
          <div className="university-card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-foreground">Lịch công tác gần đây</h2>
              <Link to="/quan-tri/quan-ly-lich" className="text-sm text-primary hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {isLoadingSchedules ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="p-4 flex items-start gap-4">
                    <Skeleton className="w-16 h-10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))
              ) : errorSchedules ? (
                <div className="p-4 text-center text-red-500">Error loading recent schedules.</div>
              ) : recentSchedules.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Không có lịch công tác gần đây.
                </div>
              ) : (
                recentSchedules.map((schedule) => (
                  <div key={schedule.id} className="p-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="text-center min-w-[60px]">
                        <div className="text-xs text-muted-foreground">{schedule.dayOfWeek}</div>
                        <div className="text-lg font-bold text-primary">
                          {format(new Date(schedule.date), 'dd/MM')}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{schedule.startTime}</span>
                          {schedule.eventType && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              schedule.eventType === 'cuoc_hop'
                                ? 'bg-blue-100 text-blue-700'
                                : schedule.eventType === 'hoi_nghi'
                                ? 'bg-purple-100 text-purple-700'
                                : schedule.eventType === 'tam_ngung'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {schedule.eventType === 'cuoc_hop' ? 'Cuộc họp' : schedule.eventType === 'hoi_nghi' ? 'Hội nghị' : schedule.eventType === 'tam_ngung' ? 'Tạm ngưng' : 'Chưa phân loại'}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-foreground line-clamp-1">{schedule.content}</p>
                        <p className="text-sm text-muted-foreground">{schedule.location}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Pending */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="university-card p-4">
            <h3 className="font-serif text-lg font-bold text-foreground mb-4">Thao tác nhanh</h3>
            <div className="space-y-2">
              <Link to="/quan-tri/quan-ly-lich">
                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Thêm lịch công tác</span>
                </button>
              </Link>
              <Link to="/quan-tri/tin-tuc">
                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">Đăng tin tức</span>
                </button>
              </Link>
              <Link to="/quan-tri/thong-bao">
                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="font-medium">Thêm thông báo</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Pending Items */}
          <div className="university-card p-4">
            <h3 className="font-serif text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Chưa phân loại
            </h3>
            <div className="space-y-3">
              {isLoadingSchedules ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))
              ) : errorSchedules ? (
                <div className="text-center text-red-500">Error loading unclassified schedules.</div>
              ) : unclassifiedSchedules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tất cả lịch đã được phân loại
                </p>
              ) : (
                unclassifiedSchedules.map((schedule) => (
                  <div key={schedule.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="font-medium text-foreground text-sm line-clamp-1">{schedule.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(schedule.date), 'dd/MM/yyyy')} - {schedule.startTime}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
