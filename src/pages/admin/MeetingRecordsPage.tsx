import { AdminLayout } from '@/components/admin/AdminLayout';
import MeetingRecordList from "@/components/meeting/MeetingRecordList";
import MeetingRecordDetail from "@/components/meeting/MeetingRecordDetail";
import CreateMeetingRecordDialog from "@/components/meeting/CreateMeetingRecordDialog";
import { Button } from "@/components/ui/button";
import { useMeetingRecords } from "@/contexts/MeetingRecordsContext";
import { useEffect, useState } from "react";

export default function MeetingRecordsPage() {
  const { meetingRecords, fetchMeetingRecords, isLoading, error, deleteMeetingRecord } = useMeetingRecords();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchMeetingRecords().catch((err) => {
      // Error is already handled by the context's toast
      console.error(err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMeetingRecords]);

  const handleSelectRecord = (id: string) => {
    setSelectedRecordId(id);
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bản ghi cuộc họp này không?")) {
      try {
        await deleteMeetingRecord(id);
        if (selectedRecordId === id) {
          setSelectedRecordId(null);
        }
      } catch (err) {
        console.error("Lỗi khi xóa:", err);
      }
    }
  };

  const handleCreateNew = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCreateSuccess = (recordId: string) => {
    // Refresh the list and select the newly created record
    fetchMeetingRecords().then(() => {
      setSelectedRecordId(recordId);
    }).catch((err) => {
      console.error(err);
    });
  };

  return (
    <AdminLayout title="Nội dung cuộc họp">
      <div className="flex justify-end mb-3">
        <Button onClick={handleCreateNew}>Tạo biên bản mới</Button>
      </div>

      {error && !isLoading && (
        <div className="text-red-500 text-center p-4 border border-red-200 rounded-md bg-red-50 mb-3">Lỗi: {error}</div>
      )}

      <div className="flex gap-4 h-[calc(100vh-160px)]">
        {/* Sidebar danh sách - Chiều rộng cố định */}
        <div className="w-72 xl:w-80 flex-shrink-0">
          {isLoading && meetingRecords.length === 0 ? (
            <p>Đang tải...</p>
          ) : (
            <MeetingRecordList
              records={meetingRecords}
              selectedId={selectedRecordId || undefined}
              onSelectRecord={handleSelectRecord}
              onDeleteRecord={handleDeleteRecord}
            />
          )}
        </div>
        {/* Nội dung chi tiết - Mở rộng tối đa */}
        <div className="flex-1 min-w-0">
          {selectedRecordId ? (
            <MeetingRecordDetail recordId={selectedRecordId} onClose={() => setSelectedRecordId(null)} />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <p className="text-muted-foreground">Chọn một mục để xem chi tiết hoặc tạo mới.</p>
            </div>
          )}
        </div>
      </div>

      <CreateMeetingRecordDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </AdminLayout>
  );
}