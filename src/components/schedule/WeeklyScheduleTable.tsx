import { Schedule, ScheduleEventType } from '@/types';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TTSButton } from '@/components/ui/tts-button';
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
  /**
   * Whether to show TTS (Text-to-Speech) button. Defaults to true.
   */
  showTTS?: boolean;
}

const eventTypeConfig: Record<ScheduleEventType, { label: string; className: string }> = {
  cuoc_hop: { label: 'Cuộc họp', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  hoi_nghi: { label: 'Hội nghị', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  tam_ngung: { label: 'Tạm ngưng', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

// Phân loại thời gian: Sáng/Chiều/Tối
const getTimeSlot = (time: string): string => {
  if (!time) return '';
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'Sáng';
  if (hour < 18) return 'Chiều';
  return 'Tối';
};

/**
 * A component that displays a list of schedules in a weekly table format.
 * It groups schedules by day and renders them in a structured table.
 * The component is memoized for performance.
 */
export const WeeklyScheduleTable = memo(({ schedules, currentDate = new Date(), showStatus = false, showTTS = true }: WeeklyScheduleTableProps) => {
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
        <h3 className="font-serif text-lg font-bold text-primary uppercase">
          LỊCH CÔNG TÁC TUẦN
        </h3>
        <p className="text-sm text-muted-foreground">
          (Từ ngày {format(weekStart, 'dd/MM/yyyy')} đến ngày {format(weekEnd, 'dd/MM/yyyy')})
        </p>
      </div>

      {!hasSchedulesInWeek && schedules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">Không có lịch công tác trong tuần này.</p>
          <p className="text-sm">Vui lòng chọn tuần khác hoặc thêm lịch mới.</p>
        </div>
      ) : (
        <table className="schedule-table min-w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {showTTS && <th className="w-10 border border-border px-1 py-2 text-center" title="Đọc lịch">🔊</th>}
              <th className="w-24 border border-border px-2 py-2 text-center">Ngày</th>
              <th className="w-16 border border-border px-2 py-2 text-center">Thời gian</th>
              <th className="min-w-[200px] border border-border px-2 py-2">Nội dung</th>
              <th className="w-40 border border-border px-2 py-2">Thành phần tham dự</th>
              <th className="w-32 border border-border px-2 py-2">Địa điểm</th>
              <th className="w-28 border border-border px-2 py-2">Lãnh đạo chủ trì</th>
              <th className="w-28 border border-border px-2 py-2">Đơn vị chuẩn bị</th>
              <th className="w-32 border border-border px-2 py-2">Đơn vị phối hợp</th>
              {showStatus && <th className="w-24 border border-border px-2 py-2 text-center">Loại</th>}
            </tr>
          </thead>
          <tbody>
            {schedulesByDay.map(({ date, dayName, schedules: daySchedules }) => (
              daySchedules.length > 0 ? (
                daySchedules.map((schedule, idx) => (
                  <tr key={schedule.id} className={cn(
                    isSameDay(date, new Date()) && 'bg-primary/5'
                  )}>
                    {/* TTS Button Cell */}
                    {showTTS && (
                      <td className="border border-border px-1 py-1 text-center align-middle bg-background">
                        <TTSButton
                          schedule={schedule}
                          size="sm"
                          showTooltip={true}
                        />
                      </td>
                    )}
                    {idx === 0 && (
                      <td
                        rowSpan={daySchedules.length}
                        className={cn(
                          'border border-border px-2 py-2 text-center align-top font-medium',
                          isSameDay(date, new Date()) && 'bg-accent text-slate-900'
                        )}
                      >
                        <div className="text-xs">{dayName}</div>
                        <div className="text-sm font-semibold">ngày {format(date, 'dd/MM')}</div>
                      </td>
                    )}
                    <td className="border border-border px-2 py-2 text-center align-top bg-background">
                      <div className="text-xs font-medium text-slate-900">{getTimeSlot(schedule.startTime)}</div>
                      <div className="text-xs text-slate-600">
                        {schedule.startTime}
                        {schedule.endTime && <> - {schedule.endTime}</>}
                      </div>
                    </td>
                    <td className="border border-border px-2 py-2 align-top bg-background">
                      <p className="text-sm text-slate-900">{schedule.content}</p>
                      {schedule.notes && (
                        <p className="text-xs text-slate-500 mt-1 italic">{schedule.notes}</p>
                      )}
                    </td>
                    <td className="border border-border px-2 py-2 align-top bg-background">
                      <p className="text-xs text-slate-900">{schedule.participants?.join(', ') || '-'}</p>
                    </td>
                    <td className="border border-border px-2 py-2 align-top bg-background">
                      <p className="text-xs text-slate-900">{schedule.location || '-'}</p>
                    </td>
                    <td className="border border-border px-2 py-2 align-top bg-background">
                      <p className="text-xs font-medium text-slate-900">{schedule.leader || '-'}</p>
                    </td>
                    <td className="border border-border px-2 py-2 align-top bg-background">
                      <p className="text-xs text-slate-900">{schedule.preparingUnit || '-'}</p>
                    </td>
                    <td className="border border-border px-2 py-2 align-top bg-background">
                      <p className="text-xs text-slate-900">{schedule.cooperatingUnits?.join(', ') || '-'}</p>
                    </td>
                    {showStatus && (
                      <td className="border border-border px-2 py-2 text-center align-top">
                        {schedule.eventType && eventTypeConfig[schedule.eventType] ? (
                          <Badge
                            variant="outline"
                            className={cn('text-xs', eventTypeConfig[schedule.eventType].className)}
                          >
                            {eventTypeConfig[schedule.eventType].label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr key={date.toISOString()} className="bg-muted/20">
                  {showTTS && <td className="border border-border"></td>}
                  <td className="border border-border px-2 py-2 text-center font-medium">
                    <div className="text-xs">{dayName}</div>
                    <div className="text-sm font-semibold">ngày {format(date, 'dd/MM')}</div>
                  </td>
                  <td colSpan={showStatus ? 8 : 7} className="border border-border px-2 py-3 text-center text-sm text-muted-foreground italic">
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
