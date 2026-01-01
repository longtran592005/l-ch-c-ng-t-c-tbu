import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';

// Schema validation cho form
const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ').max(255, 'Email quá dài'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(100, 'Mật khẩu quá dài'),
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated, user, canAccessAdmin } = useAuth();

  // Redirect nếu đã đăng nhập
  useEffect(() => {
    if (isAuthenticated) {
      // Redirect admins/BGH/office to admin dashboard, others to public home
      if (canAccessAdmin) navigate('/quan-tri');
      else navigate('/');
    }
  }, [isAuthenticated, canAccessAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Gọi hàm login từ AuthContext
      const { success, message } = await login(email, password);
      
      if (success) {
        toast({
          title: 'Đăng nhập thành công!',
          description: 'Chào mừng bạn trở lại hệ thống.',
        });
        navigate('/quan-tri');
      } else {
        toast({
          title: 'Đăng nhập thất bại',
          description: message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <title>Đăng nhập - Trường Đại học Thái Bình</title>

      <section className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-4">
              <span className="text-primary-foreground font-serif font-bold text-2xl">TBU</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
              Đăng nhập hệ thống
            </h1>
            <p className="text-muted-foreground">
              Hệ thống Quản lý Lịch Công Tác Tuần
            </p>
          </div>

          {/* Login Form */}
          <div className="university-card p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@tbu.edu.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                    Ghi nhớ đăng nhập
                  </Label>
                </div>
                <Link to="/quen-mat-khau" className="text-sm text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  'Đang đăng nhập...'
                ) : (
                  <>
                    Đăng nhập
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo Info - Thông tin tài khoản demo */}
            <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center mb-2">
                <strong>Tài khoản demo:</strong>
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Admin:</strong> admin@tbu.edu.vn / 123456</p>
                <p><strong>BGH:</strong> bgh@tbu.edu.vn / 123456</p>
                <p><strong>Nhân viên:</strong> staff@tbu.edu.vn / 123456</p>
              </div>
            </div>
          </div>

          {/* Back Link */}
          <div className="text-center mt-6">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
              ← Quay lại trang chủ
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
