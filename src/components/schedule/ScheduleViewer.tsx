import { useState } from 'react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeeklyScheduleTable } from './WeeklyScheduleTable';
import { MonthlyScheduleView } from './MonthlyScheduleView';
import { Schedule } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ScheduleViewerProps {
  schedules: Schedule[];
  showStatus?: boolean;
  showFilters?: boolean;
  className?: string;
}

export function ScheduleViewer({ schedules, showStatus = false, showFilters = true, className }: ScheduleViewerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const { toast } = useToast();

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

  // Xuất file CSV
  const handleExport = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    
    const filteredSchedules = schedules.filter(s => {
      const scheduleDate = new Date(s.date);
      return scheduleDate >= start && scheduleDate <= end;
    });

    if (filteredSchedules.length === 0) {
      toast({
        title: 'Không có dữ liệu',
        description: 'Không có lịch công tác trong tuần này để xuất.',
        variant: 'destructive',
      });
      return;
    }

    // Tạo nội dung CSV
    const headers = ['Ngày', 'Thứ', 'Thời gian', 'Nội dung', 'Địa điểm', 'Chủ trì', 'Thành phần tham dự', 'Đơn vị chuẩn bị'];
    const rows = filteredSchedules.map(s => [
      format(new Date(s.date), 'dd/MM/yyyy'),
      s.dayOfWeek,
      `${s.startTime} - ${s.endTime}`,
      s.content,
      s.location,
      s.leader,
      s.participants.join('; '),
      s.preparingUnit,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Tải xuống file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lich-cong-tac-tuan-${getWeekNumber()}-${currentDate.getFullYear()}.csv`;
    link.click();

    toast({ title: 'Đã xuất file thành công' });
  };

  // In lịch
  const handlePrint = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    
    const filteredSchedules = schedules.filter(s => {
      const scheduleDate = new Date(s.date);
      return scheduleDate >= start && scheduleDate <= end;
    });

    // Tạo nội dung HTML để in
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lịch Công Tác Tuần ${getWeekNumber()} - Năm ${currentDate.getFullYear()}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; }
          h1 { text-align: center; font-size: 16pt; margin-bottom: 5px; }
          h2 { text-align: center; font-size: 14pt; margin-bottom: 20px; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; font-size: 11pt; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .header { text-align: center; margin-bottom: 20px; }
          .header-left { float: left; text-align: center; }
          .header-right { float: right; text-align: center; }
          .clearfix::after { content: ""; clear: both; display: table; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header clearfix">
          <div class="header-left">
            <p><strong>UBND TỈNH THÁI BÌNH</strong></p>
            <p><strong>TRƯỜNG ĐẠI HỌC THÁI BÌNH</strong></p>
          </div>
          <div class="header-right">
            <p><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p>
            <p><em>Độc lập - Tự do - Hạnh phúc</em></p>
          </div>
        </div>
        <h1>LỊCH CÔNG TÁC TUẦN ${getWeekNumber()}</h1>
        <h2>(Từ ngày ${format(start, 'dd/MM/yyyy')} đến ngày ${format(end, 'dd/MM/yyyy')})</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 10%">Ngày</th>
              <th style="width: 8%">Thời gian</th>
              <th style="width: 25%">Nội dung</th>
              <th style="width: 15%">Địa điểm</th>
              <th style="width: 12%">Chủ trì</th>
              <th style="width: 15%">Thành phần</th>
              <th style="width: 15%">Đơn vị chuẩn bị</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSchedules.map(s => `
              <tr>
                <td>${s.dayOfWeek}<br/>${format(new Date(s.date), 'dd/MM')}</td>
                <td>${s.startTime} - ${s.endTime}</td>
                <td>${s.content}</td>
                <td>${s.location}</td>
                <td>${s.leader}</td>
                <td>${s.participants.join(', ')}</td>
                <td>${s.preparingUnit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }

    toast({ title: 'Đang mở cửa sổ in...' });
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  title="In lịch"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  title="Xuất file CSV"
                  onClick={handleExport}
                >
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
