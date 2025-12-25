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
import { mockSchedules, mockNews, mockAnnouncements } from '@/data/mockData';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const stats = [
    { 
      label: 'Lịch công tác tuần này', 
      value: mockSchedules.length,
      icon: Calendar,
      color: 'bg-primary/10 text-primary',
      change: '+3 so với tuần trước',
    },
    { 
      label: 'Chờ duyệt', 
      value: mockSchedules.filter(s => s.status === 'pending').length,
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-700',
      change: 'Cần xử lý',
    },
    { 
      label: 'Đã duyệt', 
      value: mockSchedules.filter(s => s.status === 'approved').length,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700',
      change: 'Hoàn thành',
    },
    { 
      label: 'Tin tức & Thông báo', 
      value: mockNews.length + mockAnnouncements.length,
      icon: FileText,
      color: 'bg-blue-100 text-blue-700',
      change: 'Đang hoạt động',
    },
  ];

  const recentSchedules = mockSchedules.slice(0, 5);

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
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
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
              {recentSchedules.map((schedule) => (
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          schedule.status === 'approved' 
                            ? 'bg-green-100 text-green-700'
                            : schedule.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {schedule.status === 'approved' ? 'Đã duyệt' : schedule.status === 'pending' ? 'Chờ duyệt' : 'Nháp'}
                        </span>
                      </div>
                      <p className="font-medium text-foreground line-clamp-1">{schedule.content}</p>
                      <p className="text-sm text-muted-foreground">{schedule.location}</p>
                    </div>
                  </div>
                </div>
              ))}
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
              Cần xử lý
            </h3>
            <div className="space-y-3">
              {mockSchedules.filter(s => s.status === 'pending').slice(0, 3).map((schedule) => (
                <div key={schedule.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="font-medium text-foreground text-sm line-clamp-1">{schedule.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(schedule.date), 'dd/MM/yyyy')} - {schedule.startTime}
                  </p>
                </div>
              ))}
              {mockSchedules.filter(s => s.status === 'pending').length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Không có mục nào cần xử lý
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
