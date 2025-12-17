interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {children && (
        <div className="flex items-center gap-4">
          {children}
        </div>
      )}
    </header>
  );
}
