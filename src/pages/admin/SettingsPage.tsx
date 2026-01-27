import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Bell, Shield, Palette, Globe, Key, User, Eye, EyeOff, Moon, Sun, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts';
import { useTheme } from 'next-themes';
import { api } from '@/services/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const handlePasswordChange = async () => {
    // 1. Kiểm tra đầu vào
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập đầy đủ các trường mật khẩu.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Mật khẩu quá ngắn',
        description: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Xác nhận sai',
        description: 'Mật khẩu xác nhận không khớp với mật khẩu mới.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      console.log('[Settings] Đang gửi yêu cầu đổi mật khẩu tới Backend...');
      const response = await api.post<any>('/users/change-password', {
        oldPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      console.log('[Settings] Kết quả Backend:', response);

      toast({
        title: 'Thành công',
        description: 'Mật khẩu của bạn đã được cập nhật thành công.',
      });

      // Reset form
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error: any) {
      console.error('[Settings] Lỗi đổi mật khẩu:', error);
      toast({
        title: 'Lỗi đổi mật khẩu',
        description: error.message || 'Mật khẩu hiện tại không đúng hoặc máy chủ không phản hồi.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('tbu_site_settings', JSON.stringify(siteSettings));
    localStorage.setItem('tbu_notifications', JSON.stringify(notifications));
    localStorage.setItem('tbu_security', JSON.stringify(security));

    toast({
      title: 'Đã lưu cài đặt',
      description: 'Các thay đổi về giao diện và thông báo đã được lưu.',
    });
  };

  if (!mounted) return null;

  return (
    <AdminLayout title="Cài đặt hệ thống">
      <div className="space-y-6 max-w-4xl pb-10">
        {/* Thông tin tài khoản */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Thông tin tài khoản</CardTitle>
            </div>
            <CardDescription>Thông tin định danh của bạn trên hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Họ tên</Label>
                <Input value={user?.name || ''} disabled className="bg-muted font-medium" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Đổi mật khẩu */}
        <Card className="border-orange-200 dark:border-orange-900/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-orange-500" />
              <CardTitle>Bảo mật & Mật khẩu</CardTitle>
            </div>
            <CardDescription>Thay đổi mật khẩu đăng nhập (Dữ liệu được lưu vào Cơ sở dữ liệu AI)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Mật khẩu hiện tại</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
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

              <Button
                onClick={handlePasswordChange}
                disabled={isChangingPassword}
                className="w-full sm:w-auto"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : 'Cập nhật mật khẩu mới'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Thông tin chung */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Thông tin chung</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tên website</Label>
                <Input value={siteSettings.siteName} onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email liên hệ</Label>
                <Input value={siteSettings.siteEmail} onChange={(e) => setSiteSettings({ ...siteSettings, siteEmail: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" className="gap-2" onClick={handleSaveSettings}>
                <Save className="h-4 w-4" /> Lưu thông tin chung
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}