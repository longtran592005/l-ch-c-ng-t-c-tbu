import { Schedule, ScheduleEventType } from '@/types';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TTSButton } from '@/components/ui/tts-button';
import { memo, useMemo } from 'react';
import { useScheduleHighlight } from '@/contexts';
import { Clock, MapPin, User, Users, Building, CalendarDays } from 'lucide-react';

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

/** Mobile Card View for a single schedule */
const MobileScheduleCard = memo(({
  schedule,
  isToday,
  isHighlighted,
  showStatus,
  showTTS,
  highlightedRef
}: {
  schedule: Schedule;
  isToday: boolean;
  isHighlighted: boolean;
  showStatus: boolean;
  showTTS: boolean;
  highlightedRef?: React.RefObject<HTMLDivElement>;
}) => (
  <div
    ref={isHighlighted ? highlightedRef as React.RefObject<HTMLDivElement> : undefined}
    className={cn(
      'bg-card rounded-xl border p-4 mb-3 shadow-sm transition-all duration-300',
      isToday && 'border-primary bg-primary/5',
      isHighlighted && 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/30',
      !isToday && !isHighlighted && 'border-border hover:border-primary/30'
    )}
  >
    {/* Header with day and time */}
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        <div className={cn(
          'flex flex-col items-center justify-center w-14 h-14 rounded-lg text-sm font-medium',
          isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
        )}>
          <span className="text-[10px] uppercase">{format(new Date(schedule.date), 'EEE', { locale: vi })}</span>
          <span className="text-lg font-bold">{format(new Date(schedule.date), 'dd')}</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{getTimeSlot(schedule.startTime)}</span>
            <span className="text-muted-foreground">•</span>
            <span>{schedule.startTime}</span>
            {schedule.endTime && <span>- {schedule.endTime}</span>}
          </div>
          {isToday && (
            <Badge variant="outline" className="mt-1 text-[10px] bg-primary/10 text-primary border-primary/20">
              Hôm nay
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {showTTS && <TTSButton schedule={schedule} />}
        {showStatus && schedule.eventType && eventTypeConfig[schedule.eventType] && (
          <Badge variant="outline" className={cn('text-[10px]', eventTypeConfig[schedule.eventType].className)}>
            {eventTypeConfig[schedule.eventType].label}
          </Badge>
        )}
      </div>
    </div>

    {/* Content */}
    <h4 className="font-medium text-foreground mb-3 leading-snug">{schedule.content}</h4>

    {/* Details grid */}
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-start gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground">{schedule.location || '-'}</span>
      </div>
      <div className="flex items-start gap-1.5">
        <User className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground">{schedule.leader || '-'}</span>
      </div>
      {schedule.participants && schedule.participants.length > 0 && (
        <div className="flex items-start gap-1.5 col-span-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground line-clamp-2">{schedule.participants.join(', ')}</span>
        </div>
      )}
      {schedule.preparingUnit && (
        <div className="flex items-start gap-1.5 col-span-2">
          <Building className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{schedule.preparingUnit}</span>
        </div>
      )}
    </div>

    {schedule.notes && (
      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border italic">
        {schedule.notes}
      </p>
    )}
  </div>
));
MobileScheduleCard.displayName = 'MobileScheduleCard';

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
    schedules: schedules
      .filter(s => isSameDay(new Date(s.date), day))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
  })), [weekDays, schedules]);

  // Check if there are any schedules in the week
  const hasSchedulesInWeek = useMemo(() => schedulesByDay.some(day => day.schedules.length > 0), [schedulesByDay]);

  // Handle highlighting from context/URL
  const { isHighlighted } = useScheduleHighlight();
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get('highlight');
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);
  const highlightedCardRef = useRef<HTMLDivElement>(null);

  // Track if we've already scrolled to this highlight
  const scrolledRef = useRef<string | null>(null);

  useEffect(() => {
    if (highlightedId && scrolledRef.current !== highlightedId) {
      // Delay một chút để đảm bảo DOM đã render xong
      const scrollTimer = setTimeout(() => {
        const targetRef = highlightedRowRef.current || highlightedCardRef.current;
        if (targetRef) {
          // Sử dụng requestAnimationFrame để scroll mượt hơn
          requestAnimationFrame(() => {
            targetRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          scrolledRef.current = highlightedId;
        }
      }, 300);
      return () => clearTimeout(scrollTimer);
    }
  }, [highlightedId]);

  // Flatten all schedules for mobile view (sorted by date and time)
  const allSchedulesSorted = useMemo(() => {
    return schedules
      .filter(s => {
        const scheduleDate = new Date(s.date);
        return scheduleDate >= weekStart && scheduleDate <= weekEnd;
      })
      .sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
  }, [schedules, weekStart, weekEnd]);

  return (
    <div>
      {/* Header */}
      <div className="mb-4 text-center">
        <h3 className="font-serif text-base sm:text-lg font-bold text-primary uppercase">
          LỊCH CÔNG TÁC TUẦN
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          (Từ ngày {format(weekStart, 'dd/MM/yyyy')} đến ngày {format(weekEnd, 'dd/MM/yyyy')})
        </p>
      </div>

      {!hasSchedulesInWeek && schedules.length === 0 ? (
        <div className="text-center py-8 sm:py-12 text-muted-foreground">
          <CalendarDays className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-30" />
          <p className="text-base sm:text-lg mb-2">Không có lịch công tác trong tuần này.</p>
          <p className="text-xs sm:text-sm">Vui lòng chọn tuần khác hoặc thêm lịch mới.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View - Show on small screens */}
          <div className="block md:hidden">
            {allSchedulesSorted.length > 0 ? (
              allSchedulesSorted.map((schedule) => {
                const isTarget = isHighlighted(schedule.id) || highlightedId === schedule.id;
                const isToday = isSameDay(new Date(schedule.date), new Date());
                return (
                  <MobileScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    isToday={isToday}
                    isHighlighted={isTarget}
                    showStatus={showStatus}
                    showTTS={showTTS}
                    highlightedRef={isTarget ? highlightedCardRef : undefined}
                  />
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Không có lịch công tác trong tuần này.</p>
              </div>
            )}
          </div>

          {/* Desktop Table View - Show on medium screens and up */}
          <div className="hidden md:block overflow-x-auto">
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
                  <th className="w-32 border border-border px-2 py-2">Đơn vị/cá nhân phối hợp</th>
                  {showStatus && <th className="w-24 border border-border px-2 py-2 text-center">Loại</th>}
                </tr>
              </thead>
              <tbody>
                {schedulesByDay.map(({ date, dayName, schedules: daySchedules }) => (
                  daySchedules.length > 0 ? (
                    daySchedules.map((schedule, idx) => {
                      const isTarget = isHighlighted(schedule.id) || highlightedId === schedule.id;

                      return (
                        <tr
                          key={schedule.id}
                          ref={isTarget ? highlightedRowRef : undefined}
                          className={cn(
                            'transition-all duration-700',
                            isSameDay(date, new Date()) && 'bg-primary/5',
                            isTarget && 'bg-yellow-50 dark:bg-yellow-900/30 ring-4 ring-yellow-400/50 shadow-lg z-10 relative'
                          )}
                        >
                          {/* TTS Button Cell */}
                          {showTTS && (
                            <td className="border border-border px-1 py-1 text-center align-middle bg-background">
                              <TTSButton
                                schedule={schedule}
                              />
                            </td>
                          )}
                          {idx === 0 && (
                            <td
                              rowSpan={daySchedules.length}
                              className={cn(
                                'border border-border px-2 py-2 text-center align-middle font-medium',
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
                      );
                    })
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
          </div>
        </>
      )}
    </div>
  );
});

WeeklyScheduleTable.displayName = 'WeeklyScheduleTable';
