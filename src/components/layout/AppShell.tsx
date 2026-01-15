import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import logoDark from '@/assets/fakehub.png';
import logoLight from '@/assets/fakehub-white.png';
import { MessageSquare, Moon, Sun, Building2 } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import type { StyleMode } from '@/stores/themeStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppShellProps {
  children: React.ReactNode;
  currentPage: 'projects' | 'workflow' | 'users' | 'groups' | 'permissions';
  onNavigate: (page: 'projects' | 'workflow' | 'users' | 'groups' | 'permissions') => void;
}

export function AppShell({ children, currentPage }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const styleMode = useThemeStore((state) => state.styleMode);
  const setStyleMode = useThemeStore((state) => state.setStyleMode);
  const logoUrl = styleMode === 'dark' ? logoDark : logoLight;

  const themes: { value: StyleMode; label: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Dark', icon: <Moon className="h-5 w-5" /> },
    { value: 'light', label: 'Light', icon: <Sun className="h-5 w-5" /> },
    { value: 'corporate', label: 'Corporate', icon: <Building2 className="h-5 w-5" /> },
  ];

  const currentTheme = themes.find((t) => t.value === styleMode) || themes[0];

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
            <img src={logoUrl} alt="FakeHub" className="h-8 w-auto" />
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
            currentPath={`/${currentPage}`}
          />
        </div>

        {/* Theme switcher and Feedback button at bottom */}
        <div className="border-t border-border p-4 space-y-1">
          <TooltipProvider>
            {/* Theme Switcher */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full',
                        'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        !sidebarOpen && 'justify-center'
                      )}
                      aria-label="Select theme"
                    >
                      {currentTheme.icon}
                      {sidebarOpen && <span>{currentTheme.label}</span>}
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right">
                    <p>{currentTheme.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <DropdownMenuContent side="right" align="end">
                <DropdownMenuRadioGroup
                  value={styleMode}
                  onValueChange={(value) => setStyleMode(value as StyleMode)}
                >
                  {themes.map((theme) => (
                    <DropdownMenuRadioItem key={theme.value} value={theme.value}>
                      <span className="flex items-center gap-2">
                        {theme.icon}
                        {theme.label}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Feedback button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://forms.gle/jWfrTH7qgytN2jVS8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    !sidebarOpen && 'justify-center'
                  )}
                  aria-label="Send Feedback"
                >
                  <MessageSquare className="h-5 w-5" />
                  {sidebarOpen && <span>Send Feedback</span>}
                </a>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">
                  <p>Send Feedback</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
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
          <img src={logoUrl} alt="FakeHub" className="h-6 w-auto" />
        </div>

        <div key={currentPage} className="flex flex-1 flex-col overflow-hidden animate-in fade-in duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
