import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail, MapPin, ChevronDown, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Giới thiệu', href: '/gioi-thieu' },
  { label: 'Tin tức', href: '/tin-tuc' },
  { label: 'Thông báo', href: '/thong-bao' },
  { label: 'Lịch công tác', href: '/lich-cong-tac' },
  { label: 'Liên hệ', href: '/lien-he' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Mock state
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top Bar - Contact Info */}
      <div className="bg-primary text-primary-foreground/90 text-sm">
        <div className="container mx-auto px-4 py-2 flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <a href="tel:02273633669" className="flex items-center gap-1.5 hover:text-primary-foreground transition-colors">
              <Phone className="h-3.5 w-3.5" />
              <span>0227.3633.669</span>
            </a>
            <a href="mailto:support@tbu.edu.vn" className="flex items-center gap-1.5 hover:text-primary-foreground transition-colors">
              <Mail className="h-3.5 w-3.5" />
              <span>support@tbu.edu.vn</span>
            </a>
            <span className="hidden md:flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span>Phường Thái Bình, tỉnh Thái Bình</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isLoggedIn ? (
              <Link to="/dang-nhap">
                <Button variant="ghost" size="sm" className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 text-xs">
                  Đăng nhập
                </Button>
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 text-xs gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span>Nguyễn Văn A</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/quan-tri">Quản trị</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsLoggedIn(false)}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-primary rounded-full">
                <span className="text-primary-foreground font-serif font-bold text-lg md:text-xl">TBU</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-serif text-lg md:text-xl font-bold text-primary leading-tight">
                  ĐẠI HỌC THÁI BÌNH
                </h1>
                <p className="text-xs text-muted-foreground">Thai Binh University</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'nav-link text-foreground/80 hover:text-primary',
                    isActive(item.href) && 'text-primary font-semibold active'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden border-t border-border bg-card animate-fade-in">
            <div className="container mx-auto px-4 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'block py-3 px-4 rounded-md transition-colors',
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground/80 hover:bg-secondary'
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
