import { Link } from 'react-router-dom';
import { Facebook, Youtube, ExternalLink } from 'lucide-react';

const quickLinks = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Giới thiệu', href: '/gioi-thieu' },
  { label: 'Lịch công tác', href: '/lich-cong-tac' },
  { label: 'Tin tức', href: '/tin-tuc' },
  { label: 'Thông báo', href: '/thong-bao' },
];

const usefulLinks = [
  { label: 'Cổng thông tin sinh viên', href: '#' },
  { label: 'Thư viện điện tử', href: '#' },
  { label: 'Email sinh viên', href: '#' },
  { label: 'Hệ thống E-Learning', href: '#' },
];

export function Footer() {
  return (
    <footer className="university-footer">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* University Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/tbu-logo.svg"
                alt="Logo Đại học Thái Bình"
                className="w-14 h-14 object-contain"
              />
              <div>
                <h3 className="font-serif font-bold text-lg text-primary-foreground">
                  ĐẠI HỌC THÁI BÌNH
                </h3>
                <p className="text-primary-foreground/70 text-sm">Thai Binh University</p>
              </div>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed mb-4">
              Trường Đại học Thái Bình - Nơi đào tạo nguồn nhân lực chất lượng cao cho sự phát triển kinh tế - xã hội của tỉnh Thái Bình và cả nước.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Youtube"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif font-bold text-primary-foreground mb-4 pb-2 border-b border-primary-foreground/20">
              Liên kết nhanh
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/80 hover:text-accent transition-colors text-sm inline-flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Useful Links */}
          <div>
            <h4 className="font-serif font-bold text-primary-foreground mb-4 pb-2 border-b border-primary-foreground/20">
              Liên kết hữu ích
            </h4>
            <ul className="space-y-2">
              {usefulLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/80 hover:text-accent transition-colors text-sm inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>


        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-primary-foreground/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-primary-foreground/70">
            <p>© {new Date().getFullYear()} Trường Đại học Thái Bình. Bản quyền thuộc về TBU.</p>
            <p>Thiết kế và phát triển bởi Khoa Công nghệ và Kỹ thuật</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
