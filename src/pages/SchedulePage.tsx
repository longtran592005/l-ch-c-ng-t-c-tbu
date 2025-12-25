import { MainLayout } from '@/components/layout';
import { ScheduleViewer } from '@/components/schedule';
import { mockSchedules } from '@/data/mockData';
import { Calendar } from 'lucide-react';

export default function SchedulePage() {
  // Chỉ hiển thị lịch đã được duyệt cho public
  const approvedSchedules = mockSchedules.filter(s => s.status === 'approved');

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
          <ScheduleViewer 
            schedules={approvedSchedules}
            showStatus={false}
            showFilters={true}
          />
        </div>
      </section>

      {/* Legend */}
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
