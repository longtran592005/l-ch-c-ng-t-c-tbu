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
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Key } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/services/api';
import { useAuth } from '@/contexts';

interface LocalUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'ban_giam_hieu' | 'staff' | 'viewer';
  department: string;
  status: 'active' | 'inactive';
  password?: string; // Make password optional as it's not always returned
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string; // Add lastLoginAt from backend
}

// Trang quản lý người dùng cho admin
export default function UsersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState<LocalUser[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<LocalUser | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const { toast } = useToast();
  const { canManageUsers, refreshUsers } = useAuth(); // Assuming refreshUsers might be needed for global auth state

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'staff' as 'admin' | 'ban_giam_hieu' | 'staff' | 'viewer', // Update to backend roles
    department: '',
    password: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Restrict page to admins only - placed here as it's a conditional return
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

  const fetchUsers = async () => {
    try {
      const responseData = await api.get<LocalUser[]>('/users');
      // Map backend role names to frontend display names if necessary
      const mappedUsers = Array.isArray(responseData) ? responseData.map((user: any) => ({
        ...user,
        role: user.role === 'ban_giam_hieu' ? 'bgh' : user.role,
      })) : [];
      setUsersList(mappedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách người dùng.',
        variant: 'destructive',
      });
    }
  };

  // Load users from backend on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = usersList.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: LocalUser['role']) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'ban_giam_hieu':
        return <Badge className="bg-primary text-primary-foreground">Ban Giám hiệu</Badge>;
      case 'bgh': // Added for frontend consistency
        return <Badge className="bg-primary text-primary-foreground">Ban Giám hiệu</Badge>;
      case 'staff':
        return <Badge variant="secondary">Nhân viên</Badge>;
      case 'viewer':
        return <Badge variant="outline">Người xem</Badge>;
      default:
        return <Badge variant="secondary">Không xác định</Badge>;
    }
  };

  // Mở dialog thêm/sửa
  const handleOpenDialog = (user?: LocalUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role, // Use the backend role directly
        department: user.department,
        password: '',
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'staff', department: '', password: '', status: 'active' });
    }
    setIsDialogOpen(true);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền họ tên và email.',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Lỗi',
        description: 'Email không hợp lệ.',
        variant: 'destructive',
      });
      return;
    }

    // Map frontend role to backend expected role values
    const mapRoleToBackend = (r: LocalUser['role']) => {
      if (r === 'bgh') return 'ban_giam_hieu'; // Frontend uses 'bgh', backend 'ban_giam_hieu'
      return r; // 'admin', 'staff', 'viewer' are already compatible
    };
    
    const roleForBackend = mapRoleToBackend(formData.role);

    try {
      if (editingUser) {
        // Persist change to backend
        await api.put(`/users/${editingUser.id}`, {
          name: formData.name,
          email: formData.email,
          role: roleForBackend,
          department: formData.department,
          status: formData.status,
        });

        toast({ title: 'Đã cập nhật người dùng' });
      } else {
        if (!formData.password || formData.password.length < 6) {
          toast({
            title: 'Lỗi',
            description: 'Mật khẩu phải có ít nhất 6 ký tự.',
            variant: 'destructive',
          });
          return;
        }

        // Call backend register endpoint so the user is created in DB (can login)
        await api.post('/auth/register', {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: roleForBackend,
        });

        toast({ 
          title: 'Đã thêm người dùng mới',
          description: `Tài khoản ${formData.email} đã được tạo và có thể đăng nhập ngay.`,
        });
      }
      fetchUsers(); // Refresh the list from the backend after successful operation
    } catch (err: any) {
      console.error('API Error:', err);
      const errorMessage = err?.response?.data?.error?.message || err?.message || 'Không thể thực hiện thao tác';
      toast({ title: 'Lỗi', description: errorMessage, variant: 'destructive' });
      return;
    } finally {
      setIsDialogOpen(false);
    }
  };

  // Xóa người dùng
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      toast({ title: 'Đã xóa người dùng' });
      fetchUsers(); // Refresh the list from the backend
    } catch (err: any) {
      console.error('API Error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể xóa người dùng';
      toast({ title: 'Lỗi', description: errorMessage, variant: 'destructive' });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Toggle trạng thái
  const handleToggleStatus = async (id: string) => {
    const userToToggle = usersList.find(u => u.id === id);
    if (!userToToggle) return;

    const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';

    try {
      await api.put(`/users/${id}/status`, { status: newStatus });
      toast({ title: 'Đã cập nhật trạng thái' });
      fetchUsers(); // Refresh the list from the backend
    } catch (err: any) {
      console.error('API Error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể cập nhật trạng thái';
      toast({ title: 'Lỗi', description: errorMessage, variant: 'destructive' });
    }
  };

  // Reset mật khẩu
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await api.put(`/users/${resetPasswordId}/reset-password`, { newPassword });
      toast({ title: 'Đã đặt lại mật khẩu' });
      fetchUsers(); // Refresh the list from the backend
    } catch (err: any) {
      console.error('API Error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể đặt lại mật khẩu';
      toast({ title: 'Lỗi', description: errorMessage, variant: 'destructive' });
    } finally {
      setResetPasswordId(null);
      setNewPassword('');
    }
  };



  return (
    <AdminLayout title="Quản lý Người dùng">
      <div className="space-y-6">
        {/* Header Actions */}
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
            <Plus className="h-4 w-4" />
            Thêm người dùng
          </Button>
        </div>

        {/* Users Table */}
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
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => handleToggleStatus(user.id)}
                      >
                        {user.status === 'active' ? (
                          <Badge variant="outline" className="text-green-600 border-green-600 cursor-pointer hover:bg-green-50">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Hoạt động
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600 cursor-pointer hover:bg-red-50">
                            <UserX className="h-3 w-3 mr-1" />
                            Vô hiệu
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(user)} title="Chỉnh sửa">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setResetPasswordId(user.id)}
                          title="Đặt lại mật khẩu"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive"
                          onClick={() => setDeleteConfirmId(user.id)}
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Không tìm thấy người dùng nào
          </div>
        )}
      </div>

      {/* Dialog thêm/sửa người dùng */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Cập nhật thông tin người dùng' 
                : 'Điền thông tin để tạo tài khoản mới. Tài khoản có thể đăng nhập ngay sau khi tạo.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Họ tên *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập họ tên..."
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@tbu.edu.vn"
              />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label>Mật khẩu * (ít nhất 6 ký tự)</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nhập mật khẩu..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'bgh' | 'staff') => 
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Nhân viên</SelectItem>
                  <SelectItem value="bgh">Ban Giám hiệu</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phòng ban</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Phòng ban..."
              />
            </div>
            {editingUser && (
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Vô hiệu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit}>{editingUser ? 'Cập nhật' : 'Thêm mới'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog đặt lại mật khẩu */}
      <Dialog open={!!resetPasswordId} onOpenChange={() => { setResetPasswordId(null); setNewPassword(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu mới cho người dùng này
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mật khẩu mới *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPasswordId(null); setNewPassword(''); }}>Hủy</Button>
            <Button onClick={handleResetPassword}>Đặt lại mật khẩu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}