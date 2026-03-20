import { MeetingRecord } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { memo } from 'react';

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MeetingRecordItemProps {
  record: MeetingRecord;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const MeetingRecordItem = memo(({ record, isSelected, onSelect, onDelete }: MeetingRecordItemProps) => {
  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer border transition-all flex flex-col gap-3",
        isSelected
          ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20"
          : "hover:bg-gray-100 dark:hover:bg-gray-800 border-border/50 bg-background"
      )}
      onClick={() => onSelect(record.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{record.title}</h4>
          <Badge variant={record.status === 'completed' ? 'default' : 'secondary'} className="shrink-0 text-[10px] px-1.5 py-0 h-5">
            {record.status === 'completed' ? 'Hoàn thành' : 'Bản nháp'}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            {format(new Date(record.meetingDate), 'dd/MM/yyyy', { locale: vi })}
          </p>
          {record.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              {record.location}
            </p>
          )}
        </div>
      </div>
      
      {/* Nút xóa được tách biệt rõ ràng ở dưới cùng, luôn hiển thị */}
      <div className="flex justify-end pt-2 border-t border-border/40 mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs text-red-600 border-red-200 bg-red-50 hover:bg-red-600 hover:text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(record.id, e);
          }}
          title="Xóa cuộc họp"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Xóa bản ghi
        </Button>
      </div>
    </div>
  );
});
MeetingRecordItem.displayName = 'MeetingRecordItem';


interface MeetingRecordListProps {
  records: MeetingRecord[];
  selectedId?: string;
  onSelectRecord: (id: string) => void;
  onDeleteRecord: (id: string) => void;
}

const MeetingRecordList = memo(({ records, selectedId, onSelectRecord, onDeleteRecord }: MeetingRecordListProps) => {
  if (!records || records.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-base font-semibold">Danh sách cuộc họp</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground text-sm">Không có nội dung cuộc họp nào.</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="h-full flex flex-col shadow-sm overflow-hidden">
      <CardHeader className="py-3 px-4 border-b bg-muted/30 flex-shrink-0">
        <CardTitle className="text-base font-semibold">Danh sách cuộc họp</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-2 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-1.5 p-1">
            {records.map((record) => (
              <MeetingRecordItem
                key={record.id}
                record={record}
                isSelected={selectedId === record.id}
                onSelect={onSelectRecord}
                onDelete={(id, e) => {
                  e.stopPropagation();
                  onDeleteRecord(id);
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
MeetingRecordList.displayName = 'MeetingRecordList';

export default MeetingRecordList;