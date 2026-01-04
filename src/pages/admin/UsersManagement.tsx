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
  role: 'admin' | 'bgh' | 'staff';
  department: string;
  status: 'active' | 'inactive';
  password: string;
  createdAt?: string;
  updatedAt?: string;
}

const USERS_STORAGE_KEY = 'tbu_users';

// Dữ liệu mẫu người dùng mặc định
const defaultUsers: LocalUser[] = [
  {
    id: '1',
    name: 'Quản trị viên',
    email: 'admin@tbu.edu.vn',
    role: 'admin',
    department: 'Văn phòng',
    status: 'active',
    password: '123456',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'PGS.TS Nguyễn Văn A',
    email: 'bgh@tbu.edu.vn',
    role: 'bgh',
    department: 'Ban Giám hiệu',
    status: 'active',
    password: '123456',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Nguyễn Văn B',
    email: 'staff@tbu.edu.vn',
    role: 'staff',
    department: 'Phòng Đào tạo',
    status: 'active',
    password: '123456',
    createdAt: new Date().toISOString(),
  },
];

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
  const { canManageUsers, refreshUsers } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'staff' as 'admin' | 'bgh' | 'staff',
    department: '',
    password: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Load users from localStorage on mount
  useEffect(() => {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      setUsersList(JSON.parse(storedUsers));
    } else {
      setUsersList(defaultUsers);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
    }
  }, []);

  // Restrict page to admins only
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

  // Save users to localStorage whenever usersList changes
  useEffect(() => {
    if (usersList.length > 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
    }
  }, [usersList]);

  const filteredUsers = usersList.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'bgh':
        return <Badge className="bg-primary text-primary-foreground">Ban Giám hiệu</Badge>;
      default:
        return <Badge variant="secondary">Nhân viên</Badge>;
    }
  };

  // Mở dialog thêm/sửa
  const handleOpenDialog = (user?: LocalUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
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

    // Check for duplicate email
    const existingUser = usersList.find(u => 
      u.email.toLowerCase() === formData.email.toLowerCase() && u.id !== editingUser?.id
    );
    if (existingUser) {
      toast({
        title: 'Lỗi',
        description: 'Email này đã được sử dụng.',
        variant: 'destructive',
      });
      return;
    }

    if (editingUser) {
      // Persist change to backend as well
      try {
        // Determine backend role mapping
        const mapRole = (r: string) => {
          if (r === 'bgh') return 'ban_giam_hieu';
          if (r === 'staff') return 'staff';
          if (r === 'admin') return 'admin';
          return 'viewer';
        };

        await api.put(`/users/${editingUser.id}`, {
          name: formData.name,
          email: formData.email,
          role: mapRole(formData.role),
          department: formData.department,
          status: formData.status,
        });

        setUsersList(prev => prev.map(u => 
          u.id === editingUser.id 
            ? { 
                ...u, 
                name: formData.name, 
                email: formData.email, 
                role: formData.role, 
                department: formData.department,
                status: formData.status,
                updatedAt: new Date().toISOString(),
              }
            : u
        ));
      } catch (err: any) {
        console.error('Failed to update user via API', err);
        toast({ title: 'Lỗi', description: 'Không thể cập nhật người dùng', variant: 'destructive' });
        return;
      }
        // If the edited user is the currently logged-in user, refresh AuthContext
        try {
          const storedUser = localStorage.getItem('tbu_user_data');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed.email === formData.email || parsed.id === editingUser.id) {
              // Update stored user data
              const updated = { ...parsed, name: formData.name, email: formData.email };
              localStorage.setItem('tbu_user_data', JSON.stringify(updated));
              // Call context refresh to update in-memory user
              try { refreshUsers(); } catch (e) { try { (window as any).__refreshAuthUser && (window as any).__refreshAuthUser(); } catch {} }
            }
          }
        } catch (e) {
          console.error('Failed to update current user in storage', e);
        }
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

      // Map frontend role to backend expected role values
      const mapRole = (r: string) => {
        if (r === 'bgh') return 'ban_giam_hieu';
        if (r === 'staff') return 'staff';
        if (r === 'admin') return 'admin';
        return 'viewer';
      };

      try {
        // Call backend register endpoint so the user is created in DB (can login)
        await api.post('/auth/register', {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: mapRole(formData.role),
        });

        const newUser: LocalUser = {
          id: Date.now().toString(),
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          status: formData.status,
          password: formData.password,
          createdAt: new Date().toISOString(),
        };
        setUsersList(prev => [newUser, ...prev]);
        toast({ 
          title: 'Đã thêm người dùng mới',
          description: `Tài khoản ${formData.email} đã được tạo và có thể đăng nhập ngay.`,
        });
      } catch (err: any) {
        console.error('Failed to register user via API:', err);
        toast({ title: 'Lỗi', description: err?.message || 'Không thể tạo người dùng', variant: 'destructive' });
        return;
      }
    }
    setIsDialogOpen(false);
  };

  // Xóa người dùng
  const handleDelete = (id: string) => {
    const updatedList = usersList.filter(u => u.id !== id);
    setUsersList(updatedList);
    // Lưu vào localStorage ngay lập tức
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedList));
    setDeleteConfirmId(null);
    toast({ title: 'Đã xóa người dùng' });
  };

  // Toggle trạng thái
  const handleToggleStatus = (id: string) => {
    setUsersList(prev => prev.map(u => 
      u.id === id 
        ? { ...u, status: u.status === 'active' ? 'inactive' : 'active', updatedAt: new Date().toISOString() }
        : u
    ));
    toast({ title: 'Đã cập nhật trạng thái' });
  };

  // Reset mật khẩu
  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        variant: 'destructive',
      });
      return;
    }

    setUsersList(prev => prev.map(u => 
      u.id === resetPasswordId 
        ? { ...u, password: newPassword, updatedAt: new Date().toISOString() }
        : u
    ));
    setResetPasswordId(null);
    setNewPassword('');
    toast({ title: 'Đã đặt lại mật khẩu' });
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