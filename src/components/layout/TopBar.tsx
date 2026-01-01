import { Phone, Mail } from 'lucide-react';
import { UserAuth } from './UserAuth';

export function TopBar() {
  return (
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
        </div>
        <UserAuth />
      </div>
    </div>
  );
}
