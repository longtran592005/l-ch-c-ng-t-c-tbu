import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Giới thiệu', href: '/gioi-thieu' },
  { label: 'Tin tức', href: '/tin-tuc' },
  { label: 'Thông báo', href: '/thong-bao' },
  { label: 'Lịch công tác', href: '/lich-cong-tac' },
  { label: 'Liên hệ', href: '/lien-he' },
];

export function MainNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinkClasses = (isActive: boolean) =>
    cn(
      'text-sm font-medium transition-colors',
      isActive
        ? 'text-primary'
        : 'text-foreground/70 hover:text-foreground'
    );

  const mobileNavLinkClasses = (isActive: boolean) =>
    cn(
        'block py-3 px-3 rounded-md text-base font-medium transition-colors',
        isActive
        ? 'bg-primary/10 text-primary'
        : 'text-foreground/80 hover:bg-secondary'
    );


  return (
    <div className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/tbu-logo.svg" 
              alt="Logo Đại học Thái Bình" 
              className="w-12 h-12 md:w-14 md:h-14 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="font-serif text-lg md:text-xl font-bold text-primary leading-tight">
                ĐẠI HỌC THÁI BÌNH
              </h1>
              <p className="text-xs text-muted-foreground">Thai Binh University</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="lg:hidden border-t border-border bg-card animate-fade-in">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) => mobileNavLinkClasses(isActive)}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
