import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  currentPage: 'projects' | 'workflow' | 'users';
  onNavigate: (page: 'projects' | 'workflow' | 'users') => void;
}

export function AppShell({ children, currentPage, onNavigate }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-300',
          // Mobile: fixed overlay sidebar
          'fixed lg:relative inset-y-0 left-0 z-50',
          'lg:flex',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          // Desktop: collapsible sidebar
          sidebarOpen ? 'w-64' : 'lg:w-16 w-64'
        )}
      >
        {/* Sidebar toggle button */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {sidebarOpen && (
            <span className="text-lg font-semibold">PV Workflow</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-2 hover:bg-accent"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Sidebar navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <Sidebar
            isOpen={sidebarOpen}
            currentPage={currentPage}
            onNavigate={onNavigate}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        {/* Mobile menu button */}
        <div className="lg:hidden flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="rounded-md p-2 hover:bg-accent"
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-lg font-semibold">PV Workflow</span>
        </div>

        <div key={currentPage} className="flex flex-1 flex-col animate-in fade-in duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
