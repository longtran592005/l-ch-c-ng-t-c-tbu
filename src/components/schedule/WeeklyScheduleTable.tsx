import { Schedule, ScheduleStatus } from '@/types';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Clock, MapPin, Users, User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface WeeklyScheduleTableProps {
  schedules: Schedule[];
  currentDate?: Date;
  showStatus?: boolean;
}

const statusConfig: Record<ScheduleStatus, { label: string; className: string }> = {
  approved: { label: 'Đã duyệt', className: 'bg-green-100 text-green-700 border-green-200' },
  pending: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  draft: { label: 'Bản nháp', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-700 border-red-200' },
};

const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

export function WeeklyScheduleTable({ schedules, currentDate = new Date(), showStatus = false }: WeeklyScheduleTableProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  // Tạo mảng 7 ngày trong tuần
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Nhóm lịch theo ngày
  const schedulesByDay = weekDays.map(day => ({
    date: day,
    dayName: dayNames[day.getDay() === 0 ? 6 : day.getDay() - 1],
    schedules: schedules.filter(s => isSameDay(new Date(s.date), day)),
  }));

  return (
    <div className="overflow-x-auto">
      <div className="mb-4 text-center">
        <h3 className="font-serif text-lg font-bold text-primary">
          Lịch công tác tuần từ ngày {format(weekStart, 'dd/MM/yyyy')} đến {format(weekEnd, 'dd/MM/yyyy')}
        </h3>
      </div>
      
      <table className="schedule-table min-w-full">
        <thead>
          <tr>
            <th className="w-28">Thứ/Ngày</th>
            <th className="w-24">Thời gian</th>
            <th className="min-w-[250px]">Nội dung</th>
            <th className="w-40">Thành phần tham dự</th>
            <th className="w-36">Địa điểm</th>
            <th className="w-36">Lãnh đạo chủ trì</th>
            <th className="w-36">Đơn vị chuẩn bị</th>
            {showStatus && <th className="w-28">Trạng thái</th>}
          </tr>
        </thead>
        <tbody>
          {schedulesByDay.map(({ date, dayName, schedules: daySchedules }) => (
            daySchedules.length > 0 ? (
              daySchedules.map((schedule, idx) => (
                <tr key={schedule.id} className={cn(isSameDay(date, new Date()) && 'bg-accent/5')}>
                  {idx === 0 && (
                    <td 
                      rowSpan={daySchedules.length}
                      className={cn(
                        'font-semibold text-center align-top border-r',
                        isSameDay(date, new Date()) && 'bg-primary text-primary-foreground'
                      )}
                    >
                      <div className="text-sm">{dayName}</div>
                      <div className="text-lg">{format(date, 'dd/MM')}</div>
                    </td>
                  )}
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{schedule.startTime}</span>
                    </div>
                    {schedule.endTime && (
                      <div className="text-xs text-muted-foreground">đến {schedule.endTime}</div>
                    )}
                  </td>
                  <td>
                    <p className="font-medium text-foreground">{schedule.content}</p>
                    {schedule.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{schedule.notes}</p>
                    )}
                  </td>
                  <td>
                    <div className="flex items-start gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <span>{schedule.participants.join(', ')}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-start gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <span>{schedule.location}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span>{schedule.leader}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-start gap-1.5 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <span>{schedule.preparingUnit}</span>
                    </div>
                  </td>
                  {showStatus && (
                    <td className="text-center">
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs', statusConfig[schedule.status].className)}
                      >
                        {statusConfig[schedule.status].label}
                      </Badge>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr key={date.toISOString()} className="bg-muted/30">
                <td className="font-semibold text-center border-r">
                  <div className="text-sm">{dayName}</div>
                  <div className="text-lg">{format(date, 'dd/MM')}</div>
                </td>
                <td colSpan={showStatus ? 7 : 6} className="text-center text-muted-foreground italic">
                  Không có lịch công tác
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  );
}
