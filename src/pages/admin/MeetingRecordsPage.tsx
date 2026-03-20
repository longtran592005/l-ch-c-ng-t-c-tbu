import { AdminLayout } from '@/components/admin/AdminLayout';
import MeetingRecordList from "@/components/meeting/MeetingRecordList";
import MeetingRecordDetail from "@/components/meeting/MeetingRecordDetail";
import CreateMeetingRecordDialog from "@/components/meeting/CreateMeetingRecordDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useMeetingRecords } from "@/contexts/MeetingRecordsContext";
import { useEffect, useState } from "react";

export default function MeetingRecordsPage() {
  const { meetingRecords, fetchMeetingRecords, isLoading, error, deleteMeetingRecord } = useMeetingRecords();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchMeetingRecords().catch((err) => {
      // Error is already handled by the context's toast
      console.error(err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMeetingRecords]);

  const handleSelectRecord = (id: string) => {
    setSelectedRecordId(id);
    setIsMobileMenuOpen(false); // Đóng menu mobile khi chọn
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
      <div className="flex justify-between items-center mb-4">
        {/* Nút mở danh sách trên Mobile/Tablet */}
        <div className="lg:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 shadow-sm">
                <Menu className="h-4 w-4" />
                Danh sách cuộc họp
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[360px] p-0">
              <div className="h-full pt-8 pb-4 px-4 bg-muted/10">
                {isLoading && meetingRecords.length === 0 ? (
                  <p className="text-muted-foreground text-center mt-4">Đang tải...</p>
                ) : (
                  <MeetingRecordList
                    records={meetingRecords}
                    selectedId={selectedRecordId || undefined}
                    onSelectRecord={handleSelectRecord}
                    onDeleteRecord={handleDeleteRecord}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Nút Tạo biên bản */}
        <div className="flex-1 flex justify-end">
          <Button onClick={handleCreateNew} className="shadow-sm">Tạo biên bản mới</Button>
        </div>
      </div>

      {error && !isLoading && (
        <div className="text-red-500 text-center p-4 border border-red-200 rounded-md bg-red-50 mb-3">Lỗi: {error}</div>
      )}

      <div className="flex gap-4 h-[calc(100vh-180px)] lg:h-[calc(100vh-160px)]">
        {/* Sidebar danh sách - Bị ẩn trên Mobile, chỉ hiện từ màn hình lg */}
        <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0 h-full">
          {isLoading && meetingRecords.length === 0 ? (
            <p className="text-muted-foreground">Đang tải...</p>
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
        <div className="flex-1 min-w-0 h-full">
          {selectedRecordId ? (
            <MeetingRecordDetail recordId={selectedRecordId} onClose={() => setSelectedRecordId(null)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-center">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                 <svg className="h-8 w-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Chưa chọn biên bản</h3>
              <p className="text-muted-foreground max-w-[250px]">Chọn một mục từ danh sách bên trái hoặc nhấn tạo mới để tiếp tục.</p>
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