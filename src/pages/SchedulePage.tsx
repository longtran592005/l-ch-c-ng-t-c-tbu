import React from 'react';
import { MainLayout } from '@/components/layout';
import { ScheduleViewer } from '@/components/schedule';
import { useSchedules, useAuth } from '@/contexts';
import { Calendar, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// Trang hiển thị lịch công tác tuần cho người dùng
export default function SchedulePage() {
  const { isAuthenticated } = useAuth();
  // Lấy lịch từ context
  const { getApprovedSchedules, schedules, isLoading, error, fetchSchedules } = useSchedules();
  
  // Tự động refresh khi focus vào trang (khi quay lại tab)
  React.useEffect(() => {
    const handleFocus = () => {
      // Refresh dữ liệu khi quay lại tab
      fetchSchedules();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchSchedules]);
  
  // Refresh khi vào trang
  React.useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);
  
  // Hiển thị tất cả lịch (bao gồm cả lịch chưa phân loại)
  // Nếu đã đăng nhập: hiển thị tất cả lịch
  // Nếu chưa đăng nhập: cũng hiển thị tất cả lịch
  const displaySchedules = schedules;

  // Debug logging
  React.useEffect(() => {
    if (!isLoading && !error) {
      console.log('SchedulePage - Total schedules:', schedules.length);
      console.log('SchedulePage - Display schedules:', displaySchedules.length);
      console.log('SchedulePage - Is authenticated:', isAuthenticated);
      console.log('SchedulePage - Schedules by eventType:', {
        cuoc_hop: schedules.filter(s => s.eventType === 'cuoc_hop').length,
        hoi_nghi: schedules.filter(s => s.eventType === 'hoi_nghi').length,
        tam_ngung: schedules.filter(s => s.eventType === 'tam_ngung').length,
        chua_phan_loai: schedules.filter(s => !s.eventType).length,
      });
    }
  }, [schedules, isLoading, error, displaySchedules, isAuthenticated, getApprovedSchedules]);

  return (
    <MainLayout>
      <title>Lịch Công Tác - Trường Đại học Thái Bình</title>
      <meta name="description" content="Lịch công tác tuần của Ban Giám hiệu Trường Đại học Thái Bình" />

      {/* Page Header */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
                  Lịch Công Tác
                </h1>
                <p className="text-primary-foreground/80">
                  Lịch công tác tuần của Ban Giám hiệu Trường Đại học Thái Bình
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchSchedules()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <section className="bg-secondary/50 py-3 border-b border-border">
        <div className="container mx-auto px-4">
          <nav className="text-sm text-muted-foreground">
            <a href="/" className="hover:text-primary">Trang chủ</a>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium">Lịch công tác</span>
          </nav>
        </div>
      </section>

      {/* Schedule Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-lg font-semibold text-destructive mb-2">Lỗi tải dữ liệu</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.
                </p>
              </div>
            </div>
          ) : displaySchedules.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-muted/50 border border-border rounded-lg p-8 max-w-md mx-auto">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-semibold text-foreground mb-2">
                  Chưa có lịch công tác
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Hiện tại chưa có lịch công tác nào đã được phân loại để hiển thị.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchSchedules()}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Đang tải...' : 'Làm mới dữ liệu'}
                </Button>
              </div>
            </div>
          ) : (
            <ScheduleViewer 
              schedules={displaySchedules}
              showStatus={isAuthenticated}
              showFilters={true}
            />
          )}
        </div>
      </section>

      {/* Legend - Ghi chú */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="bg-secondary/30 rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-4">Ghi chú:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                <span>Lịch công tác được cập nhật hàng tuần bởi Văn phòng Trường.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                <span>Thời gian và địa điểm có thể thay đổi theo thông báo của Ban Giám hiệu.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                <span>Liên hệ Phòng Hành chính - Tổng hợp để biết thêm chi tiết: 0227.3633.669</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
