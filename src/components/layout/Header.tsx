import { UserSelector } from '@/components/users/UserSelector';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6 gap-4 flex-wrap md:flex-nowrap py-3 md:py-0">
      <h1 className="text-xl md:text-2xl font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-2 md:gap-4 flex-wrap md:flex-nowrap w-full md:w-auto">
        {children}
        <NotificationBell />
        <UserSelector />
      </div>
    </header>
  );
}
