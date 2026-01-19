import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MeetingStatus = 'completed' | 'draft' | 'pending' | 'archived';

interface MeetingStatusBadgeProps {
  status: MeetingStatus;
  className?: string;
}

const statusStyles: Record<MeetingStatus, string> = {
  completed: 'bg-university-green/10 text-university-green border-university-green/20 hover:bg-university-green/15',
  draft: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
  pending: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  archived: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
};

const statusLabels: Record<MeetingStatus, string> = {
  completed: 'Đã hoàn thành',
  draft: 'Bản nháp',
  pending: 'Đang xử lý',
  archived: 'Lưu trữ'
};

export function MeetingStatusBadge({ status, className }: MeetingStatusBadgeProps) {
  return (
    <Badge className={cn(
      'font-medium transition-colors text-xs px-2 py-0.5',
      statusStyles[status],
      className
    )}>
      {statusLabels[status]}
    </Badge>
  );
}
