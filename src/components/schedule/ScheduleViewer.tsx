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
import { useToast } from '@/components/ui/use-toast';

interface ScheduleViewerProps {
  schedules: Schedule[];
  showStatus?: boolean;
  showFilters?: boolean;
  className?: string;
  /** Optional default view mode for the viewer (admin may prefer 'week') */
  defaultViewMode?: 'week' | 'month';
  /** When true, hide the view mode tabs (week/month) - useful in admin pages */
  hideViewModeTabs?: boolean;
}

export function ScheduleViewer({ schedules, showStatus = false, showFilters = true, className, defaultViewMode, hideViewModeTabs = false }: ScheduleViewerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>(defaultViewMode || 'week');
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

    // Tạo nội dung CSV với đầy đủ cột
    const headers = ['Ngày', 'Thứ', 'Thời gian', 'Nội dung', 'Thành phần tham dự', 'Địa điểm', 'Lãnh đạo chủ trì', 'Đơn vị chuẩn bị', 'Đơn vị phối hợp'];
    const rows = filteredSchedules.map(s => [
      format(new Date(s.date), 'dd/MM/yyyy'),
      s.dayOfWeek,
      `${s.startTime}${s.endTime ? ' - ' + s.endTime : ''}`,
      s.content || '',
      s.participants?.join('; ') || '',
      s.location || '',
      s.leader || '',
      s.preparingUnit || '',
      s.cooperatingUnits?.join('; ') || '',
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

    // Nhóm lịch theo ngày
    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      weekDays.push(day);
    }

    // Phân loại thời gian
    const getTimeSlot = (time: string): string => {
      if (!time) return '';
      const hour = parseInt(time.split(':')[0], 10);
      if (hour < 12) return 'Sáng';
      if (hour < 18) return 'Chiều';
      return 'Tối';
    };

    // Tạo rows cho bảng
    let tableRows = '';
    weekDays.forEach((day, dayIndex) => {
      const daySchedules = filteredSchedules.filter(s => {
        const sDate = new Date(s.date);
        return sDate.toDateString() === day.toDateString();
      });

      const dayName = dayNames[dayIndex];
      const dateStr = format(day, 'dd/MM');

      if (daySchedules.length === 0) {
        tableRows += `
          <tr>
            <td class="day-cell"><strong>${dayName}</strong><br/>ngày ${dateStr}</td>
            <td colspan="7" style="text-align: center; font-style: italic; color: #666;">Không có lịch công tác</td>
          </tr>
        `;
      } else {
        daySchedules.forEach((s, idx) => {
          const timeSlot = getTimeSlot(s.startTime);
          tableRows += `
            <tr>
              ${idx === 0 ? `<td class="day-cell" rowspan="${daySchedules.length}"><strong>${dayName}</strong><br/>ngày ${dateStr}</td>` : ''}
              <td class="time-cell">
                <strong>${timeSlot}</strong><br/>
                <span style="font-size: 9pt;">${s.startTime}${s.endTime ? ' - ' + s.endTime : ''}</span>
              </td>
              <td>${s.content || '-'}${s.notes ? '<br/><em style="color:#666;font-size:9pt;">' + s.notes + '</em>' : ''}</td>
              <td>${s.participants?.join(', ') || '-'}</td>
              <td>${s.location || '-'}</td>
              <td><strong>${s.leader || '-'}</strong></td>
              <td>${s.preparingUnit || '-'}</td>
              <td>${s.cooperatingUnits?.join(', ') || '-'}</td>
            </tr>
          `;
        });
      }
    });

    // Tạo nội dung HTML để in
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Lịch Công Tác Tuần - Trường Đại học Thái Bình</title>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: 'Times New Roman', serif; 
            padding: 15px 20px; 
            font-size: 11pt;
            line-height: 1.3;
          }
          
          /* Header */
          .header {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
          }
          .header-content {
            text-align: center;
          }
          .header-content .university-name {
            font-size: 14pt;
            font-weight: bold;
            color: #1a365d;
            margin: 0;
          }
          .header-content .university-name-en {
            font-size: 11pt;
            color: #1a365d;
            margin: 3px 0 0 0;
          }
          
          /* Title */
          .title {
            text-align: center;
            margin: 20px 0 5px 0;
          }
          .title h1 {
            font-size: 16pt;
            font-weight: bold;
            color: #c41e3a;
            margin: 0;
            text-transform: uppercase;
          }
          .title .date-range {
            font-size: 11pt;
            font-style: italic;
            margin-top: 5px;
          }
          
          /* Table */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 10pt;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: top;
          }
          thead th {
            background-color: #e8f4f8;
            font-weight: bold;
            text-align: center;
            font-size: 10pt;
          }
          .day-cell {
            text-align: center;
            background-color: #fafafa;
            width: 75px;
            font-size: 10pt;
          }
          .time-cell {
            text-align: center;
            width: 60px;
          }
          
          /* Highlight row */
          .highlight-row {
            background-color: #fffacd;
          }
          
          /* Column widths */
          .col-day { width: 8%; }
          .col-time { width: 7%; }
          .col-content { width: 22%; }
          .col-participants { width: 15%; }
          .col-location { width: 10%; }
          .col-leader { width: 10%; }
          .col-preparing { width: 12%; }
          .col-cooperating { width: 12%; }
          
          /* Print styles */
          @media print {
            body { 
              padding: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            thead th {
              background-color: #e8f4f8 !important;
            }
            .day-cell {
              background-color: #fafafa !important;
            }
          }
          
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <p class="university-name">TRƯỜNG ĐẠI HỌC THÁI BÌNH</p>
            <p class="university-name-en">THAI BINH UNIVERSITY</p>
          </div>
        </div>
        
        <div class="title">
          <h1>LỊCH CÔNG TÁC TUẦN</h1>
          <p class="date-range">(Từ ngày ${format(start, 'dd/MM/yyyy')} đến ngày ${format(end, 'dd/MM/yyyy')})</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="col-day">Ngày</th>
              <th class="col-time">Thời gian</th>
              <th class="col-content">Nội dung</th>
              <th class="col-participants">Thành phần tham dự</th>
              <th class="col-location">Địa điểm</th>
              <th class="col-leader">Lãnh đạo<br/>chủ trì</th>
              <th class="col-preparing">Đơn vị<br/>chuẩn bị</th>
              <th class="col-cooperating">Đơn vị/cá nhân<br/>phối hợp</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
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
          {!hideViewModeTabs && (
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'week' | 'month')}>
                <TabsList className="grid grid-cols-2 w-[200px]">
                  <TabsTrigger value="week">Theo tuần</TabsTrigger>
                  <TabsTrigger value="month">Theo tháng</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

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
