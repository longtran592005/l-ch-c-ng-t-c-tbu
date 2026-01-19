import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MeetingInfoFieldProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
  iconClassName?: string;
}

export function MeetingInfoField({ 
  icon: Icon, 
  label, 
  value, 
  className,
  iconClassName 
}: MeetingInfoFieldProps) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <div className={cn(
        "h-8 w-8 rounded-md bg-primary/5 flex items-center justify-center text-primary flex-shrink-0",
        iconClassName
      )}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p className="text-xs sm:text-sm font-medium text-foreground leading-snug">
          {value || '-'}
        </p>
      </div>
    </div>
  );
}
