import { MeetingRecord } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { memo } from 'react';

interface MeetingRecordItemProps {
  record: MeetingRecord;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const MeetingRecordItem = memo(({ record, isSelected, onSelect }: MeetingRecordItemProps) => {
  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer border transition-colors",
        isSelected
          ? "bg-primary/10 border-primary"
          : "hover:bg-gray-100 dark:hover:bg-gray-800"
      )}
      onClick={() => onSelect(record.id)}
    >
      <div className="flex justify-between items-start">
        <h4 className="font-semibold">{record.title}</h4>
        <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>{record.status}</Badge>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {format(new Date(record.meetingDate), 'PPPP', { locale: vi })}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{record.location}</p>
    </div>
  );
});
MeetingRecordItem.displayName = 'MeetingRecordItem';


interface MeetingRecordListProps {
  records: MeetingRecord[];
  selectedId?: string;
  onSelectRecord: (id: string) => void;
}

const MeetingRecordList = memo(({ records, selectedId, onSelectRecord }: MeetingRecordListProps) => {
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
    <Card>
        <CardHeader>
            <CardTitle>Danh sách cuộc họp</CardTitle>
        </CardHeader>
        <CardContent>
             <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                {records.map((record) => (
                    <MeetingRecordItem
                      key={record.id}
                      record={record}
                      isSelected={selectedId === record.id}
                      onSelect={onSelectRecord}
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