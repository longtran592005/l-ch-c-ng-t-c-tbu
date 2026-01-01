import { AdminLayout } from '@/components/admin/AdminLayout';
import { ScheduleViewer } from '@/components/schedule';
import { useSchedules } from '@/contexts/ScheduleContext';

// Trang xem lịch công tác trong admin panel
export default function AdminSchedulePage() {
  const { schedules } = useSchedules();

  return (
    <AdminLayout title="Quản lý Lịch công tác">
      <ScheduleViewer schedules={schedules} showStatus={true} hideViewModeTabs={true} defaultViewMode="week" />
    </AdminLayout>
  );
}
