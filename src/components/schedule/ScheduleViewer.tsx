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
    const headers = ['Ngày', 'Thứ', 'Thời gian', 'Nội dung', 'Thành phần tham dự', 'Địa điểm', 'Lãnh đạo chủ trì', 'Đơn vị chuẩn bị', 'Đơn vị/cá nhân phối hợp'];
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

  // In lịch - Cập nhật theo yêu cầu giữ nguyên bố cục lichmau.html
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

    const getTimeSlot = (time: string): string => {
      if (!time) return '';
      const hour = parseInt(time.split(':')[0], 10);
      return hour < 12 ? 'Sáng' : 'Chiều';
    };

    let tableRows = '';
    weekDays.forEach((day, dayIndex) => {
      const daySchedules = filteredSchedules.filter(s => {
        const sDate = new Date(s.date);
        return sDate.toDateString() === day.toDateString();
      }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      const dayName = dayNames[dayIndex];
      const dateStr = format(day, 'dd/MM');

      if (daySchedules.length === 0) {
        tableRows += `
          <tr>
            <td class="day-cell"><strong>${dayName}</strong><br/>ngày ${dateStr}</td>
            <td colspan="7" class="empty-cell">Không có lịch công tác</td>
          </tr>
        `;
      } else {
        // Nhóm theo buổi (Sáng/Chiều)
        const groups: { slot: string; items: any[] }[] = [];
        daySchedules.forEach(s => {
          const slot = getTimeSlot(s.startTime);
          if (groups.length > 0 && groups[groups.length - 1].slot === slot) {
            groups[groups.length - 1].items.push(s);
          } else {
            groups.push({ slot, items: [s] });
          }
        });

        let dayItemIdx = 0;
        groups.forEach((group) => {
          group.items.forEach((s, slotItemIdx) => {
            tableRows += `
              <tr>
                ${dayItemIdx === 0 ? `<td class="day-cell" rowspan="${daySchedules.length}"><strong>${dayName}</strong><br/>ngày ${dateStr}</td>` : ''}
                ${slotItemIdx === 0 ? `<td class="time-cell" rowspan="${group.items.length}">${group.slot}</td>` : ''}
                <td class="content-cell">${s.content || ''}${s.startTime ? ', từ ' + s.startTime : ''}</td>
                <td class="participants-cell">${s.participants?.join(', ') || '-'}</td>
                <td>${s.location || '-'}</td>
                <td class="leader-cell">${s.leader || '-'}</td>
                <td>${s.preparingUnit || '-'}</td>
                <td>${s.cooperatingUnits?.join(', ') || '-'}</td>
              </tr>
            `;
            dayItemIdx++;
          });
        });
      }
    });

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Lịch Công Tác Tuần - Trường Đại học Thái Bình</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body { 
            font-family: 'Times New Roman', Times, serif; 
            margin: 0;
            padding: 0;
            color: #000;
            line-height: 1.25;
          }
          .container {
            width: 100%;
          }
          
          /* Header theo mẫu văn bản nhà nước */
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .header-table td {
            border: none !important;
            padding: 0;
            text-align: center;
            vertical-align: top;
          }
          .uni-name {
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
            line-height: 1.2;
            color: rgba(0, 32, 96, 1);
          }
          .doc-id {
            font-size: 11pt;
            font-weight: normal;
            margin-top: 2px;
            color: rgba(0, 32, 96, 1);
            text-transform: uppercase;
          }
          .header-line {
            width: 120px;
            height: 1pt;
            background: rgba(88, 129, 202, 1);
            margin: 4px auto 0 auto;
          }
          .nation-name {
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            line-height: 1.5;
          }
          .motto {
            font-size: 13pt;
            font-weight: bold;
            margin-top: 5px;
          }
          .motto-line {
            width: 160px;
            height: 1pt;
            background: #000;
            margin: 4px auto 0 auto;
          }
          .date-location {
            font-size: 12pt;
            font-style: italic;
            margin-top: 15px;
            text-align: right;
            padding-right: 50px;
          }

          /* Title Area */
          .title-area {
            text-align: center;
            margin: 15px 0 25px 0;
          }
          .title-area h1 {
            font-size: 18pt;
            font-weight: bold;
            color: rgb(226,38,30);
            margin: 0;
            text-transform: uppercase;
          }
          .title-area .week-range {
            font-size: 13pt;
            font-weight: bold;
            font-style: italic;
            color: rgb(226,38,30);
            margin-top: 5px;
          }
          
          /* Data Table */
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11pt;
          }
          table.data-table th, table.data-table td {
            border: 1px solid #000;
            padding: 8px 5px;
            vertical-align: top;
            word-wrap: break-word;
          }
          table.data-table th {
            font-weight: bold;
            text-align: center;
            background-color: #f2f2f2;
            word-break: break-word;
          }
          
          .day-cell {
            text-align: center;
            vertical-align: middle !important;
            width: 85px;
            white-space: nowrap;
          }
          .time-cell {
            text-align: center;
            vertical-align: middle !important;
            width: 65px;
          }
          .content-cell {
            min-width: 180px;
            text-align: justify;
          }
          .participants-cell {
            width: 140px;
          }
          .leader-cell {
            /* font-weight: bold; - Removed as per user request */
          }
          .empty-cell {
            text-align: center;
            font-style: italic;
            color: #666;
            padding: 20px;
          }

          @media print {
            .no-print { display: none; }
            body { -webkit-print-color-adjust: exact; }
            table.data-table th { background-color: #f2f2f2 !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <table class="header-table">
            <tr>
              <td style="width: 40%">
                <div class="uni-name">TRƯỜNG ĐẠI HỌC THÁI BÌNH</div>
                <div class="doc-id">THAI BINH UNIVERSITY</div>
                <div class="header-line"></div>
              </td>
              <td style="width: 60%">
                <div class="nation-name"></div>
                <div class="motto"></div>
                <div class="date-location"></div>
              </td>
            </tr>
          </table>
          
          <div class="title-area">
            <h1>LỊCH CÔNG TÁC TUẦN</h1>
            <div class="week-range">(Từ ngày ${format(start, 'dd/MM/yyyy')} đến ngày ${format(end, 'dd/MM/yyyy')})</div>
          </div>
          
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">Ngày</th>
                <th style="width: 6%">Thời gian</th>
                <th style="width: 28%">Nội dung công tác</th>
                <th style="width: 26%">Thành phần tham dự</th>
                <th style="width: 9%">Địa điểm</th>
                <th style="width: 8%">Lãnh đạo chủ trì</th>
                <th style="width: 7%">Đơn vị chuẩn bị</th>
                <th style="width: 8%">Đơn vị/ cá nhân phối hợp</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = function () {
        printWindow.print();
      };
    }

    toast({ title: 'Đang chuẩn bị in lịch công tác...' });
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
