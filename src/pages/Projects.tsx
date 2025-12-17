import { Header } from '@/components/layout/Header';

export function Projects() {
  return (
    <div className="flex h-full flex-col">
      <Header title="Projects">
        {/* Filter bar and display popover will be added in Phase 5 */}
      </Header>
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            Project management for solar PV installations
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Project list and board views will be implemented in Phase 3 & 4
          </p>
        </div>
      </div>
    </div>
  );
}
