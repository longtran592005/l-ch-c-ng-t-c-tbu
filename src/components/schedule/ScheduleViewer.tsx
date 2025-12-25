import { useState } from 'react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeeklyScheduleTable } from './WeeklyScheduleTable';
import { MonthlyScheduleView } from './MonthlyScheduleView';
import { Schedule } from '@/types';
import { cn } from '@/lib/utils';

interface ScheduleViewerProps {
  schedules: Schedule[];
  showStatus?: boolean;
  showFilters?: boolean;
  className?: string;
}

export function ScheduleViewer({ schedules, showStatus = false, showFilters = true, className }: ScheduleViewerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeText = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM/yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy', { locale: vi });
    }
  };

  const getWeekNumber = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const days = Math.floor((start.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + 1) / 7);
  };

  return (
    <div className={cn('bg-card rounded-lg border border-border', className)}>
      {/* Header Controls */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'week' | 'month')}>
              <TabsList className="grid grid-cols-2 w-[200px]">
                <TabsTrigger value="week">Theo tuần</TabsTrigger>
                <TabsTrigger value="month">Theo tháng</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday} className="gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              Hôm nay
            </Button>
            
            <div className="flex items-center border border-border rounded-md">
              <Button variant="ghost" size="sm" onClick={handlePrev} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-medium min-w-[160px] text-center">
                {viewMode === 'week' && <span className="text-primary">Tuần {getWeekNumber()}: </span>}
                {getDateRangeText()}
              </span>
              <Button variant="ghost" size="sm" onClick={handleNext} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {showFilters && (
              <div className="hidden sm:flex items-center gap-2 border-l border-border pl-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="In lịch">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Xuất file">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Content */}
      <div className="p-4">
        {viewMode === 'week' ? (
          <WeeklyScheduleTable 
            schedules={schedules} 
            currentDate={currentDate}
            showStatus={showStatus}
          />
        ) : (
          <MonthlyScheduleView 
            schedules={schedules} 
            currentDate={currentDate}
            showStatus={showStatus}
          />
        )}
      </div>
    </div>
  );
}
