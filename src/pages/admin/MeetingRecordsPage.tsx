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
      <div className="flex justify-end mb-4">
        <Button onClick={handleCreateNew}>Tạo biên bản mới</Button>
      </div>

      {error && !isLoading && (
        <div className="text-red-500 text-center p-4 border border-red-200 rounded-md bg-red-50">Lỗi: {error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        <div className="md:col-span-1 lg:col-span-1">
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
        <div className="md:col-span-2 lg:col-span-3">
          {selectedRecordId ? (
            <MeetingRecordDetail recordId={selectedRecordId} onClose={() => setSelectedRecordId(null)} />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800/20 rounded-lg border-2 border-dashed">
              <p className="text-gray-500">Chọn một mục để xem chi tiết hoặc tạo mới.</p>
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