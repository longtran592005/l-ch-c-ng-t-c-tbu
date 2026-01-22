import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMeetingRecords } from "@/contexts/MeetingRecordsContext";
import { useSchedules } from "@/contexts/ScheduleContext";
import { useAuth } from "@/contexts/AuthContext";
import { CreateMeetingRecordInput, Schedule } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Clock, MapPin, User, Users, ChevronLeft, ChevronRight, FileText, Check } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface CreateMeetingRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (recordId: string) => void;
}

export default function CreateMeetingRecordDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateMeetingRecordDialogProps) {
  const { createMeetingRecord } = useMeetingRecords();
  const { schedules, fetchSchedules } = useSchedules();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step management: 1 = Select schedule, 2 = Fill details
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [formData, setFormData] = useState({
    title: "",
    startTime: "",
    endTime: "",
    location: "",
    leader: "",
    participantsText: "",
  });

  // Fetch schedules when dialog opens
  useEffect(() => {
    if (open) {
      fetchSchedules().catch(console.error);
      // Reset state when opening
      setStep(1);
      setSelectedSchedule(null);
      setSelectedDate(new Date());
      setFormData({
        title: "",
        startTime: "",
        endTime: "",
        location: "",
        leader: "",
        participantsText: "",
      });
    }
  }, [open, fetchSchedules]);

  // Get dates that have schedules
  const scheduleDatesSet = useMemo(() => {
    const dates = new Set<string>();
    schedules.forEach(schedule => {
      const dateStr = new Date(schedule.date).toISOString().split('T')[0];
      dates.add(dateStr);
    });
    return dates;
  }, [schedules]);

  // Filter schedules by selected date
  const filteredSchedules = useMemo(() => {
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date).toISOString().split('T')[0];
      return scheduleDate === selectedDateStr;
    });
  }, [schedules, selectedDate]);

  // Helper to format time
  const formatTime = (timeValue: string | Date | undefined | null): string => {
    if (!timeValue) return "";
    try {
      // If it's already a time string like "08:00" or "08:00:00"
      if (typeof timeValue === 'string') {
        // Check if it's a time-only string
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeValue)) {
          return timeValue.slice(0, 5);
        }
        // Check if it's an ISO date string
        if (timeValue.includes('T') || timeValue.includes('-')) {
          const date = new Date(timeValue);
          if (!isNaN(date.getTime())) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          }
        }
      }
      // If it's a Date object
      if (timeValue instanceof Date && !isNaN(timeValue.getTime())) {
        const hours = timeValue.getHours().toString().padStart(2, '0');
        const minutes = timeValue.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      return "";
    } catch {
      return "";
    }
  };

  // Handle schedule selection
  const handleSelectSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    const startTimeFormatted = formatTime(schedule.startTime);
    const endTimeFormatted = formatTime(schedule.endTime);
    
    console.log('Schedule selected:', {
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      formattedStart: startTimeFormatted,
      formattedEnd: endTimeFormatted
    });
    
    setFormData({
      title: schedule.content,
      startTime: startTimeFormatted,
      endTime: endTimeFormatted,
      location: schedule.location || "",
      leader: schedule.leader || "",
      participantsText: Array.isArray(schedule.participants) 
        ? schedule.participants.join(", ") 
        : "",
    });
    setStep(2);
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!selectedSchedule || !formData.title) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const participants = formData.participantsText
        .split(",")
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const createData: CreateMeetingRecordInput & { createdBy?: string } = {
        scheduleId: selectedSchedule.id,
        title: formData.title,
        meetingDate: new Date(selectedSchedule.date),
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        location: formData.location || undefined,
        leader: formData.leader || undefined,
        participants: participants.length > 0 ? participants : undefined,
        ...(user?.id && { createdBy: user.id }),
      };

      const newRecord = await createMeetingRecord(createData as CreateMeetingRecordInput);
      
      if (newRecord) {
        toast({
          title: "Thành công",
          description: "Đã tạo biên bản mới thành công.",
        });
        onOpenChange(false);
        if (onSuccess && newRecord.id) {
          onSuccess(newRecord.id);
        }
      }
    } catch (error) {
      console.error("Error creating meeting record:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Header - Compact */}
        <DialogHeader className="px-4 py-3 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Tạo biên bản mới
          </DialogTitle>
          <DialogDescription className="text-xs mt-1">
            {step === 1 ? "Chọn lịch công tác" : "Xác nhận thông tin"}
          </DialogDescription>
          {/* Compact progress indicator */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              step === 1 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
            )}>
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              Chọn lịch
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">2</span>
              Xác nhận
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {step === 1 ? (
            /* Step 1: Select Schedule */
            <div className="flex">
              {/* Calendar */}
              <div className="border-r p-3 flex-shrink-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={vi}
                  className="rounded-md"
                  modifiers={{
                    hasSchedule: (date) => {
                      const dateStr = date.toISOString().split('T')[0];
                      return scheduleDatesSet.has(dateStr);
                    }
                  }}
                  modifiersStyles={{
                    hasSchedule: {
                      fontWeight: 'bold',
                      backgroundColor: 'hsl(var(--primary) / 0.15)',
                      color: 'hsl(var(--primary))',
                    }
                  }}
                />
              </div>

              {/* Schedule List */}
              <div className="flex-1 flex flex-col min-w-[240px]">
                <div className="px-3 py-2 border-b bg-muted/20 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {format(selectedDate, "dd/MM/yyyy", { locale: vi })}
                  </span>
                  <Badge variant="secondary" className="font-normal text-xs">
                    {filteredSchedules.length} lịch
                  </Badge>
                </div>
                <ScrollArea className="flex-1 h-[280px]">
                  {filteredSchedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CalendarIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Không có lịch</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1.5">
                      {filteredSchedules.map((schedule) => (
                        <button
                          key={schedule.id}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50",
                            selectedSchedule?.id === schedule.id 
                              ? "border-primary bg-primary/5" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => handleSelectSchedule(schedule)}
                        >
                          <div className="flex items-start gap-2">
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                              selectedSchedule?.id === schedule.id 
                                ? "border-primary bg-primary text-primary-foreground" 
                                : "border-muted-foreground/30"
                            )}>
                              {selectedSchedule?.id === schedule.id && <Check className="h-2.5 w-2.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{schedule.content}</p>
                              <div className="flex flex-col gap-0.5 mt-1 text-xs text-muted-foreground">
                                {schedule.startTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 flex-shrink-0" />
                                    {formatTime(schedule.startTime)}
                                    {schedule.endTime && ` - ${formatTime(schedule.endTime)}`}
                                  </span>
                                )}
                                {schedule.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    {schedule.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          ) : (
            /* Step 2: Confirm and Edit Details - Compact */
            <ScrollArea className="max-h-[55vh]">
              <div className="p-4 space-y-3">
                {/* Selected schedule - Compact */}
                {selectedSchedule && (
                  <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <CalendarIcon className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{selectedSchedule.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(selectedSchedule.date), "dd/MM/yyyy", { locale: vi })}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs h-7 px-2">
                      Đổi
                    </Button>
                  </div>
                )}

                {/* Form fields - Compact */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-sm">
                      Tiêu đề <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Tiêu đề biên bản..."
                      className="h-9"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="startTime" className="text-sm">Bắt đầu</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="endTime" className="text-sm">Kết thúc</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-sm">Địa điểm</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Địa điểm..."
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="leader" className="text-sm">Chủ trì</Label>
                    <Input
                      id="leader"
                      value={formData.leader}
                      onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                      placeholder="Người chủ trì..."
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="participants" className="text-sm">Thành phần tham dự</Label>
                    <Textarea
                      id="participants"
                      value={formData.participantsText}
                      onChange={(e) => setFormData({ ...formData, participantsText: e.target.value })}
                      placeholder="Danh sách, phân cách bằng dấu phẩy..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer - Compact */}
        <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between">
          {step === 2 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="h-8">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Quay lại
            </Button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting} className="h-8">
              Hủy
            </Button>
            {step === 1 ? (
              <Button 
                size="sm"
                onClick={() => selectedSchedule && setStep(2)} 
                disabled={!selectedSchedule}
                className="h-8"
              >
                Tiếp tục
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={handleSubmit} 
                disabled={isSubmitting || !formData.title}
                className="h-8"
              >
                {isSubmitting ? "Đang tạo..." : "Tạo biên bản"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

