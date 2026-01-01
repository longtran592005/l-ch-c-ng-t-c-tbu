import { TopBar } from './TopBar';
import { MainNavigation } from './MainNavigation';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <TopBar />
      <MainNavigation />
    </header>
  );
}
