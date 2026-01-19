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
        "p-3 rounded-lg cursor-pointer border transition-all group relative",
        isSelected
          ? "bg-primary/10 border-primary shadow-sm"
          : "hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent"
      )}
      onClick={() => onSelect(record.id)}
    >
      <div className="flex justify-between items-start pr-8">
        <h4 className="font-semibold truncate">{record.title}</h4>
        <Badge variant={record.status === 'completed' ? 'default' : 'secondary'} className="shrink-0 ml-2">
          {record.status === 'completed' ? 'Hoàn thành' : 'Bản nháp'}
        </Badge>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {format(new Date(record.meetingDate), 'dd/MM/yyyy', { locale: vi })}
      </p>
      {record.location && (
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{record.location}</p>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
        onClick={(e) => onDelete(record.id, e)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
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
      <Card>
        <CardHeader>
          <CardTitle>Danh sách cuộc họp</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Không có nội dung cuộc họp nào.</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Danh sách cuộc họp</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden px-2">
        <ScrollArea className="h-full pr-3">
          <div className="space-y-2 pb-4">
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