import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar, Home, Settings, Users, FileText, Bell, LogOut, Menu, Mic,
  ChevronDown, Search, LayoutDashboard, ClipboardList, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth, useNotifications } from '@/contexts';
import { ScrollArea } from '@/components/ui/scroll-area';

// Sidebar items are computed inside the component to allow role-based visibility

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, canManageUsers } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Tổng quan', href: '/quan-tri' },
    { icon: Calendar, label: 'Lịch công tác', href: '/quan-tri/lich' },
    { icon: ClipboardList, label: 'Quản lý lịch', href: '/quan-tri/quan-ly-lich' },
    { icon: Mic, label: 'Nội dung cuộc họp', href: '/quan-tri/noi-dung-cuoc-hop' },
    { icon: FileText, label: 'Tin tức', href: '/quan-tri/tin-tuc' },
    { icon: Bell, label: 'Thông báo', href: '/quan-tri/thong-bao' },
  ];

  // Add Users link only for admins
  if (canManageUsers) {
    sidebarItems.push({ icon: Users, label: 'Người dùng', href: '/quan-tri/nguoi-dung' });
  }

  sidebarItems.push({ icon: Settings, label: 'Cài đặt', href: '/quan-tri/cai-dat' });

  const isActive = (href: string) => {
    if (href === '/quan-tri') return location.pathname === '/quan-tri';
    return location.pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Always fixed */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-primary transform transition-transform duration-200 lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-primary-foreground/20">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="/tbu-logo.svg" 
                alt="Logo Đại học Thái Bình" 
                className="w-10 h-10 object-contain"
              />
              <div className="text-primary-foreground">
                <div className="font-serif font-bold text-sm">ĐẠI HỌC THÁI BÌNH</div>
                <div className="text-xs text-primary-foreground/70">Hệ thống quản trị</div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sidebarItems.map((item) => (
              <Link key={item.href} to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                  isActive(item.href) ? 'bg-accent text-accent-foreground' : 'text-primary-foreground/80 hover:bg-primary-foreground/10'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-primary-foreground/20">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-primary-foreground font-semibold">{user?.name?.charAt(0) || 'A'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-primary-foreground font-medium text-sm truncate">{user?.name || 'Admin'}</div>
                <div className="text-primary-foreground/60 text-xs truncate">{user?.email || 'admin@tbu.edu.vn'}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content - with left margin on large screens */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-card border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-6 w-6" />
              </Button>
              <h1 className="font-serif text-xl font-bold text-foreground">{title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tìm kiếm..." className="pl-10 w-64" />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Thông báo</h4>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-auto py-1">
                        <Check className="h-3 w-3 mr-1" />
                        Đánh dấu đã đọc
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">Không có thông báo</div>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((notification) => (
                          <div key={notification.id}
                            className={cn("p-4 cursor-pointer hover:bg-muted/50 transition-colors", !notification.read && "bg-primary/5")}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", notification.read ? "bg-muted" : "bg-primary")} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{notification.title}</p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">{user?.name?.charAt(0) || 'A'}</span>
                    </div>
                    <span className="hidden md:inline font-medium">{user?.name || 'Admin'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild><Link to="/"><Home className="h-4 w-4 mr-2" />Về trang chủ</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/quan-tri/cai-dat"><Settings className="h-4 w-4 mr-2" />Cài đặt</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive"><LogOut className="h-4 w-4 mr-2" />Đăng xuất</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
