import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Key, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useAuth } from '@/contexts';

type UserRole = 'admin' | 'ban_giam_hieu' | 'staff' | 'viewer' | 'bgh';

interface LocalUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export default function UsersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState<LocalUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<LocalUser | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const { toast } = useToast();
  const { canManageUsers } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'staff' as UserRole,
    department: '',
    password: '',
    status: 'active' as 'active' | 'inactive',
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const responseData = await api.get<LocalUser[]>('/users');
      setUsersList(Array.isArray(responseData) ? responseData : []);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      toast({
        title: 'Lỗi nạp dữ liệu',
        description: 'Không thể tải danh sách người dùng từ Database.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canManageUsers) fetchUsers();
  }, [canManageUsers]);

  if (!canManageUsers) {
    return (
      <AdminLayout title="Quản lý Người dùng">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 text-destructive mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2">Không có quyền truy cập</h2>
          <p className="text-muted-foreground">Bạn cần tài khoản Admin để quản lý người dùng.</p>
        </div>
      </AdminLayout>
    );
  }

  const filteredUsers = usersList.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Badge variant="destructive">Admin</Badge>;
      case 'ban_giam_hieu':
      case 'bgh': return <Badge className="bg-primary text-primary-foreground">Ban Giám hiệu</Badge>;
      case 'staff': return <Badge variant="secondary">Nhân viên</Badge>;
      case 'viewer': return <Badge variant="outline">Người xem</Badge>;
      default: return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const handleOpenDialog = (user?: LocalUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || '',
        password: '',
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'staff', department: '', password: '', status: 'active' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng điền họ tên và email.', variant: 'destructive' });
      return;
    }

    const mapRoleToBackend = (r: UserRole) => (r === 'bgh' ? 'ban_giam_hieu' : r);

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          ...formData,
          role: mapRoleToBackend(formData.role),
        });
        toast({ title: 'Thành công', description: 'Đã cập nhật thông tin người dùng.' });
      } else {
        if (!formData.password || formData.password.length < 6) {
          toast({ title: 'Lỗi', description: 'Mật khẩu phải >= 6 ký tự.', variant: 'destructive' });
          return;
        }
        await api.post('/auth/register', {
          ...formData,
          role: mapRoleToBackend(formData.role),
        });
        toast({ title: 'Thành công', description: 'Đã tạo người dùng mới.' });
      }
      fetchUsers();
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message || 'Thao tác thất bại', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      toast({ title: 'Đã xóa', description: 'Người dùng đã được gỡ khỏi hệ thống.' });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const user = usersList.find(u => u.id === id);
    if (!user) return;
    try {
      await api.put(`/users/${id}/status`, { status: user.status === 'active' ? 'inactive' : 'active' });
      toast({ title: 'Đã cập nhật', description: 'Trạng thái tài khoản đã thay đổi.' });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Lỗi', description: 'Mật khẩu phải >= 6 ký tự.', variant: 'destructive' });
      return;
    }
    try {
      await api.put(`/users/${resetPasswordId}/reset-password`, { newPassword });
      toast({ title: 'Thành công', description: 'Mật khẩu đã được đặt lại.' });
      setResetPasswordId(null);
      setNewPassword('');
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Quản lý Người dùng">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm người dùng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4" /> Thêm người dùng
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`cursor-pointer ${user.status === 'active' ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}`}
                        onClick={() => handleToggleStatus(user.id)}
                      >
                        {user.status === 'active' ? <UserCheck className="h-3 w-3 mr-1" /> : <UserX className="h-3 w-3 mr-1" />}
                        {user.status === 'active' ? 'Hoạt động' : 'Vô hiệu'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(user)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setResetPasswordId(user.id)}><Key className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirmId(user.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Thêm/Sửa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Sửa người dùng' : 'Thêm mới'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label>Họ tên</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            {!editingUser && (
              <div className="space-y-1">
                <Label>Mật khẩu</Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Vai trò</Label>
              <Select value={formData.role} onValueChange={(val: any) => setFormData({ ...formData, role: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Nhân viên</SelectItem>
                  <SelectItem value="bgh">Ban Giám hiệu</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Người xem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Xóa */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Xóa người dùng?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Xóa ngay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Reset Password */}
      <Dialog open={!!resetPasswordId} onOpenChange={() => setResetPasswordId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Đặt lại mật khẩu</DialogTitle></DialogHeader>
          <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nhập mật khẩu mới..." />
          <DialogFooter><Button onClick={handleResetPassword}>Xác nhận</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}