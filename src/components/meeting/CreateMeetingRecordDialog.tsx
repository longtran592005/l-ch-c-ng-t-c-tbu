import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMeetingRecords } from "@/contexts/MeetingRecordsContext";
import { useSchedules } from "@/contexts/ScheduleContext";
import { useAuth } from "@/contexts/AuthContext";
import { CreateMeetingRecordInput } from "@/types";
import { useToast } from "@/hooks/use-toast";

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

  const [formData, setFormData] = useState<CreateMeetingRecordInput & { participantsText: string }>({
    scheduleId: "",
    title: "",
    meetingDate: new Date(),
    startTime: "",
    endTime: "",
    location: "",
    leader: "",
    participants: [],
    participantsText: "",
  });

  // Fetch schedules when dialog opens
  useEffect(() => {
    if (open) {
      fetchSchedules().catch((err) => {
        console.error("Failed to fetch schedules:", err);
      });
    }
  }, [open, fetchSchedules]);

  // Filter schedules to only show meetings (eventType === 'cuoc_hop')
  const meetingSchedules = schedules.filter(
    (schedule) => schedule.eventType === "cuoc_hop"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.scheduleId || !formData.title || !formData.meetingDate) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ các trường bắt buộc (Lịch công tác, Tiêu đề, Ngày họp).",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse participants from text (comma-separated)
      const participants = formData.participantsText
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const createData: CreateMeetingRecordInput & { createdBy?: string } = {
        scheduleId: formData.scheduleId,
        title: formData.title,
        meetingDate: formData.meetingDate,
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
          description: "Đã tạo biên bản cuộc họp mới thành công.",
        });
        
        // Reset form
        setFormData({
          scheduleId: "",
          title: "",
          meetingDate: new Date(),
          startTime: "",
          endTime: "",
          location: "",
          leader: "",
          participants: [],
          participantsText: "",
        });

        onOpenChange(false);
        if (onSuccess && newRecord.id) {
          onSuccess(newRecord.id);
        }
      }
    } catch (error) {
      console.error("Error creating meeting record:", error);
      // Error is already handled by the context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      scheduleId: "",
      title: "",
      meetingDate: new Date(),
      startTime: "",
      endTime: "",
      location: "",
      leader: "",
      participants: [],
      participantsText: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo biên bản cuộc họp mới</DialogTitle>
          <DialogDescription>
            Điền thông tin để tạo biên bản cuộc họp mới. Các trường có dấu * là bắt buộc.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleId">
                Lịch công tác <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.scheduleId}
                onValueChange={(value) => setFormData({ ...formData, scheduleId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lịch công tác" />
                </SelectTrigger>
                <SelectContent>
                  {meetingSchedules.length === 0 ? (
                    <SelectItem value="" disabled>
                      Không có lịch cuộc họp nào
                    </SelectItem>
                  ) : (
                    meetingSchedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        {schedule.content.substring(0, 50)}{schedule.content.length > 50 ? '...' : ''} - {new Date(schedule.date).toLocaleDateString("vi-VN")}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {meetingSchedules.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Không có lịch cuộc họp nào. Vui lòng tạo lịch công tác trước.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Tiêu đề <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nhập tiêu đề cuộc họp..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meetingDate">
                  Ngày họp <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="meetingDate"
                  type="date"
                  value={
                    formData.meetingDate instanceof Date
                      ? formData.meetingDate.toISOString().split("T")[0]
                      : new Date(formData.meetingDate).toISOString().split("T")[0]
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meetingDate: new Date(e.target.value),
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Địa điểm</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Nhập địa điểm..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Giờ bắt đầu</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Giờ kết thúc</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leader">Người chủ trì</Label>
              <Input
                id="leader"
                value={formData.leader}
                onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                placeholder="Nhập tên người chủ trì..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="participants">Thành phần tham dự</Label>
              <Textarea
                id="participants"
                value={formData.participantsText}
                onChange={(e) => setFormData({ ...formData, participantsText: e.target.value })}
                placeholder="Nhập danh sách thành phần tham dự, cách nhau bởi dấu phẩy..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Ví dụ: Nguyễn Văn A, Trần Thị B, Lê Văn C
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.scheduleId || !formData.title}>
              {isSubmitting ? "Đang tạo..." : "Tạo biên bản"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

