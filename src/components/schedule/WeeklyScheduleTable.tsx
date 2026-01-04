import { Schedule, ScheduleEventType } from '@/types';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Clock, MapPin, Users, User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { memo, useMemo } from 'react';

/**
 * Props for the WeeklyScheduleTable component.
 */
interface WeeklyScheduleTableProps {
  /**
   * An array of schedule objects to display.
   */
  schedules: Schedule[];
  /**
   * The current date to determine which week to display. Defaults to the current date.
   */
  currentDate?: Date;
  /**
   * Whether to show the status column (e.g., 'Approved', 'Pending'). Defaults to false.
   */
  showStatus?: boolean;
}

const eventTypeConfig: Record<ScheduleEventType, { label: string; className: string }> = {
  cuoc_hop: { label: 'Cuộc họp', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  hoi_nghi: { label: 'Hội nghị', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  tam_ngung: { label: 'Tạm ngưng', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

/**
 * A component that displays a list of schedules in a weekly table format.
 * It groups schedules by day and renders them in a structured table.
 * The component is memoized for performance.
 */
export const WeeklyScheduleTable = memo(({ schedules, currentDate = new Date(), showStatus = false }: WeeklyScheduleTableProps) => {
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  // Tạo mảng 7 ngày trong tuần
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Nhóm lịch theo ngày
  const schedulesByDay = useMemo(() => weekDays.map(day => ({
    date: day,
    dayName: dayNames[day.getDay() === 0 ? 6 : day.getDay() - 1],
    schedules: schedules.filter(s => isSameDay(new Date(s.date), day)),
  })), [weekDays, schedules]);

  // Check if there are any schedules in the week
  const hasSchedulesInWeek = useMemo(() => schedulesByDay.some(day => day.schedules.length > 0), [schedulesByDay]);

  return (
    <div className="overflow-x-auto">
      <div className="mb-4 text-center">
        <h3 className="font-serif text-lg font-bold text-primary">
          Lịch công tác tuần từ ngày {format(weekStart, 'dd/MM/yyyy')} đến {format(weekEnd, 'dd/MM/yyyy')}
        </h3>
      </div>
      
      {!hasSchedulesInWeek && schedules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">Không có lịch công tác trong tuần này.</p>
          <p className="text-sm">Vui lòng chọn tuần khác hoặc thêm lịch mới.</p>
        </div>
      ) : (
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
            {showStatus && <th className="w-28">Loại sự kiện</th>}
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
                      {schedule.eventType && eventTypeConfig[schedule.eventType] ? (
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', eventTypeConfig[schedule.eventType].className)}
                        >
                          {eventTypeConfig[schedule.eventType].label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">
                          Chưa phân loại
                        </Badge>
                      )}
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
      )}
    </div>
  );
});

WeeklyScheduleTable.displayName = 'WeeklyScheduleTable';
