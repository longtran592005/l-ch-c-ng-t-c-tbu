import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface AuditLogItem {
  id: string;
  username?: string | null;
  account?: string | null;
  role?: string | null;
  action: string;
  resourceType?: string | null;
  status: string;
  timestamp: string;
}

export default function AuditLogsPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  const fetchLogs = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const response = await api.get<{ items: AuditLogItem[] }>(`/audit-logs?page=1&pageSize=50&keyword=${encodeURIComponent(keyword)}`);
      setLogs(response.items || []);
    } catch (error: any) {
      toast({
        title: 'Không thể tải lịch sử log',
        description: error.message || 'Đã xảy ra lỗi',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <AdminLayout title="Lịch sử log">
        <div className="py-16 text-center text-muted-foreground">Chỉ tài khoản admin mới được xem trang này.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Lịch sử log">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Nhật ký thao tác hệ thống</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Tìm theo user, hành động, tài nguyên..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <Button onClick={fetchLogs} disabled={isLoading}>
                {isLoading ? 'Đang tải...' : 'Tìm'}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Tài nguyên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Chưa có dữ liệu log
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.timestamp).toLocaleString('vi-VN')}</TableCell>
                      <TableCell>{item.username || item.account || '-'}</TableCell>
                      <TableCell>{item.role || '-'}</TableCell>
                      <TableCell>{item.action}</TableCell>
                      <TableCell>{item.resourceType || '-'}</TableCell>
                      <TableCell>{item.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
