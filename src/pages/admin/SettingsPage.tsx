import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Bell, Shield, Palette, Globe, Key, User, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts';

// Trang cài đặt hệ thống cho admin
export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Settings state
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'Trường Đại học Thái Bình',
    siteEmail: 'contact@tbu.edu.vn',
    siteDesc: 'Website quản lý lịch công tác tuần của Ban Giám Hiệu',
  });

  const [notifications, setNotifications] = useState({
    emailNotification: true,
    meetingReminder: true,
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
    autoLogout: true,
  });

  const [appearance, setAppearance] = useState({
    darkMode: false,
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Handle password change
  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin mật khẩu.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu xác nhận không khớp.',
        variant: 'destructive',
      });
      return;
    }

    // Lưu mật khẩu mới vào localStorage để cập nhật cho tài khoản
    const storedUsers = localStorage.getItem('tbu_users');
    let users = storedUsers ? JSON.parse(storedUsers) : [];
    
    // Tìm và cập nhật mật khẩu của user hiện tại
    const userIndex = users.findIndex((u: any) => u.email === user?.email);
    if (userIndex !== -1) {
      users[userIndex].password = passwordData.newPassword;
      users[userIndex].updatedAt = new Date().toISOString();
      localStorage.setItem('tbu_users', JSON.stringify(users));
    }

    toast({
      title: 'Thành công',
      description: 'Mật khẩu đã được thay đổi.',
    });
    
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsChangingPassword(false);
  };

  // Handle save settings
  const handleSaveSettings = () => {
    localStorage.setItem('tbu_site_settings', JSON.stringify(siteSettings));
    localStorage.setItem('tbu_notifications', JSON.stringify(notifications));
    localStorage.setItem('tbu_security', JSON.stringify(security));
    localStorage.setItem('tbu_appearance', JSON.stringify(appearance));
    
    toast({
      title: 'Đã lưu cài đặt',
      description: 'Các thay đổi đã được lưu thành công.',
    });
  };

  return (
    <AdminLayout title="Cài đặt hệ thống">
      <div className="space-y-6 max-w-4xl">
        {/* Thông tin tài khoản */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Thông tin tài khoản</CardTitle>
            </div>
            <CardDescription>
              Xem thông tin tài khoản đang đăng nhập
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Họ tên</Label>
                <Input value={user?.name || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Vai trò</Label>
                <Input 
                  value={user?.role === 'admin' ? 'Admin' : user?.role === 'bgh' ? 'Ban Giám hiệu' : 'Nhân viên'} 
                  disabled 
                  className="bg-muted" 
                />
              </div>
              <div className="space-y-2">
                <Label>Phòng ban</Label>
                <Input value={user?.department || ''} disabled className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Đổi mật khẩu */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Đổi mật khẩu</CardTitle>
            </div>
            <CardDescription>
              Thay đổi mật khẩu đăng nhập của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isChangingPassword ? (
              <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
                Đổi mật khẩu
              </Button>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Mật khẩu hiện tại</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Nhập mật khẩu hiện tại..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mật khẩu mới</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Xác nhận mật khẩu mới</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Nhập lại mật khẩu mới..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handlePasswordChange}>Xác nhận đổi mật khẩu</Button>
                  <Button variant="outline" onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}>
                    Hủy
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Thông tin chung */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Thông tin chung</CardTitle>
            </div>
            <CardDescription>
              Cài đặt thông tin cơ bản của website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siteName">Tên website</Label>
                <Input 
                  id="siteName" 
                  value={siteSettings.siteName}
                  onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteEmail">Email liên hệ</Label>
                <Input 
                  id="siteEmail" 
                  type="email" 
                  value={siteSettings.siteEmail}
                  onChange={(e) => setSiteSettings({ ...siteSettings, siteEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDesc">Mô tả website</Label>
              <Input 
                id="siteDesc" 
                value={siteSettings.siteDesc}
                onChange={(e) => setSiteSettings({ ...siteSettings, siteDesc: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Thông báo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Thông báo</CardTitle>
            </div>
            <CardDescription>
              Quản lý cài đặt thông báo email và hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Thông báo qua email</Label>
                <p className="text-sm text-muted-foreground">
                  Gửi email khi có lịch mới hoặc thay đổi
                </p>
              </div>
              <Switch 
                checked={notifications.emailNotification}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotification: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Nhắc nhở lịch họp</Label>
                <p className="text-sm text-muted-foreground">
                  Gửi nhắc nhở trước 1 giờ khi có cuộc họp
                </p>
              </div>
              <Switch 
                checked={notifications.meetingReminder}
                onCheckedChange={(checked) => setNotifications({ ...notifications, meetingReminder: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bảo mật */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Bảo mật</CardTitle>
            </div>
            <CardDescription>
              Cài đặt bảo mật và quyền truy cập
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Yêu cầu xác thực 2 yếu tố</Label>
                <p className="text-sm text-muted-foreground">
                  Bật xác thực 2 yếu tố cho tài khoản admin
                </p>
              </div>
              <Switch 
                checked={security.twoFactor}
                onCheckedChange={(checked) => setSecurity({ ...security, twoFactor: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Tự động đăng xuất</Label>
                <p className="text-sm text-muted-foreground">
                  Đăng xuất sau 30 phút không hoạt động
                </p>
              </div>
              <Switch 
                checked={security.autoLogout}
                onCheckedChange={(checked) => setSecurity({ ...security, autoLogout: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Giao diện */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Giao diện</CardTitle>
            </div>
            <CardDescription>
              Tùy chỉnh giao diện hiển thị
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Chế độ tối</Label>
                <p className="text-sm text-muted-foreground">
                  Bật giao diện tối cho website
                </p>
              </div>
              <Switch 
                checked={appearance.darkMode}
                onCheckedChange={(checked) => setAppearance({ ...appearance, darkMode: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="gap-2" onClick={handleSaveSettings}>
            <Save className="h-4 w-4" />
            Lưu cài đặt
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}