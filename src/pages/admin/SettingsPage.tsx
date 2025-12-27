import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Bell, Shield, Palette, Globe } from 'lucide-react';

// Trang cài đặt hệ thống cho admin
export default function SettingsPage() {
  return (
    <AdminLayout title="Cài đặt hệ thống">
      <div className="space-y-6 max-w-4xl">
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
                <Input id="siteName" defaultValue="Trường Đại học Thái Bình" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteEmail">Email liên hệ</Label>
                <Input id="siteEmail" type="email" defaultValue="contact@tbu.edu.vn" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDesc">Mô tả website</Label>
              <Input id="siteDesc" defaultValue="Website quản lý lịch công tác tuần của Ban Giám Hiệu" />
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
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Nhắc nhở lịch họp</Label>
                <p className="text-sm text-muted-foreground">
                  Gửi nhắc nhở trước 1 giờ khi có cuộc họp
                </p>
              </div>
              <Switch defaultChecked />
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
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Tự động đăng xuất</Label>
                <p className="text-sm text-muted-foreground">
                  Đăng xuất sau 30 phút không hoạt động
                </p>
              </div>
              <Switch defaultChecked />
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
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Lưu cài đặt
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
