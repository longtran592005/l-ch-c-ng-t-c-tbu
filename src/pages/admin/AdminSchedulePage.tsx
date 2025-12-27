import { AdminLayout } from '@/components/admin/AdminLayout';
import { ScheduleViewer } from '@/components/schedule';
import { useSchedules } from '@/contexts/ScheduleContext';

// Trang xem lịch công tác trong admin panel
export default function AdminSchedulePage() {
  const { getApprovedSchedules } = useSchedules();
  const approvedSchedules = getApprovedSchedules();

  return (
    <AdminLayout title="Lịch công tác">
      <ScheduleViewer schedules={approvedSchedules} />
    </AdminLayout>
  );
}
