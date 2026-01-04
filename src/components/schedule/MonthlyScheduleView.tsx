import { Schedule } from '@/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MonthlyScheduleViewProps {
  schedules: Schedule[];
  currentDate: Date;
  showStatus?: boolean;
}

const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function MonthlyScheduleView({ schedules, currentDate }: MonthlyScheduleViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Adjust start of week to Monday (1) for getDay (Sunday is 0)
  const startDay = getDay(monthStart); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const paddingDays = startDay === 0 ? 6 : startDay - 1; // If Sunday, pad 6 days; otherwise, startDay - 1

  // Nhóm lịch theo ngày
  const getSchedulesForDay = (date: Date) => {
    return schedules.filter(s => isSameDay(new Date(s.date), date));
  };

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div className="mb-4 text-center">
          <h3 className="font-serif text-lg font-bold text-primary">
            Lịch công tác tháng {format(currentDate, 'MM/yyyy')}
          </h3>
        </div>

        {schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg">Không có lịch công tác nào trong tháng này.</p>
            <p className="text-sm">Vui lòng chọn tháng khác hoặc thêm lịch mới.</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {/* Day Headers */}
            {dayNames.map((day) => (
              <div
                key={day}
                className="bg-primary text-primary-foreground text-center py-3 font-semibold text-sm"
              >
                {day}
              </div>
            ))}

            {/* Padding Days */}
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`pad-${i}`} className="bg-muted/30 min-h-[100px]" />
            ))}

            {/* Calendar Days */}
            {daysInMonth.map((day) => {
              const daySchedules = getSchedulesForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'bg-card min-h-[100px] p-2 relative',
                    isToday && 'bg-accent/10 ring-2 ring-accent ring-inset'
                  )}
                >
                  {/* Date Number */}
                  <div
                    className={cn(
                      'text-sm font-medium mb-1',
                      isToday ? 'text-primary font-bold' : 'text-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </div>

                  {/* Schedule Items */}
                  <div className="space-y-1">
                    {daySchedules.slice(0, 3).map((schedule) => (
                      <Tooltip key={schedule.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'text-xs p-1 rounded truncate cursor-pointer transition-colors',
                              schedule.eventType && schedule.eventType !== '' 
                                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                          >
                            <span className="font-medium">{schedule.startTime}</span>
                            <span className="mx-1">-</span>
                            <span className="truncate">{schedule.content}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">{schedule.content}</p>
                            <p className="text-xs">
                              <span className="text-muted-foreground">Thời gian:</span> {schedule.startTime} - {schedule.endTime}
                            </p>
                            <p className="text-xs">
                              <span className="text-muted-foreground">Địa điểm:</span> {schedule.location}
                            </p>
                            <p className="text-xs">
                              <span className="text-muted-foreground">Chủ trì:</span> {schedule.leader}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    
                    {daySchedules.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{daySchedules.length - 3} khác
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
