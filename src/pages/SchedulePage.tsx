import { MainLayout } from '@/components/layout';
import { ScheduleViewer } from '@/components/schedule';
import { useSchedules, useAuth } from '@/contexts';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Trang hiển thị lịch công tác tuần cho người dùng
export default function SchedulePage() {
  const { isAuthenticated } = useAuth();
  // Lấy lịch từ context
  const { getApprovedSchedules, schedules, isLoading, error } = useSchedules();
  
  // Nếu đã đăng nhập, hiển thị tất cả lịch (approved + pending)
  // Nếu chưa đăng nhập, chỉ hiển thị lịch đã duyệt
  const displaySchedules = isAuthenticated 
    ? schedules.filter(s => s.status === 'approved' || s.status === 'pending')
    : getApprovedSchedules();

  return (
    <MainLayout>
      <title>Lịch Công Tác - Trường Đại học Thái Bình</title>
      <meta name="description" content="Lịch công tác tuần của Ban Giám hiệu Trường Đại học Thái Bình" />

      {/* Page Header */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
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
                <p className="text-sm text-muted-foreground">
                  {isAuthenticated 
                    ? 'Hiện tại chưa có lịch công tác nào để hiển thị.'
                    : 'Hiện tại chưa có lịch công tác nào đã được duyệt để hiển thị.'}
                </p>
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
