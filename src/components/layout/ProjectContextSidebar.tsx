import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PROJECT_SECTION_GROUPS } from '@/lib/constants';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Settings,
  CircleCheck,
  ListTodo,
  Flag,
  ClipboardCheck,
  ClipboardList,
  MapPin,
  Layers,
  FileText,
  Cpu,
  CalendarClock,
  Wrench,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Settings,
  CircleCheck,
  ListTodo,
  Flag,
  ClipboardCheck,
  ClipboardList,
  MapPin,
  Layers,
  FileText,
  Cpu,
  CalendarClock,
  Wrench,
  TrendingUp,
};

interface ProjectContextSidebarProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
}

export function ProjectContextSidebar({
  projectName,
  isOpen,
}: ProjectContextSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('tab') || 'properties';

  const handleSectionClick = (sectionId: string) => {
    setSearchParams({ tab: sectionId }, { replace: true });
  };

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex flex-col gap-1">
        {/* Back to Projects */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/projects"
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                !isOpen && 'justify-center'
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              {isOpen && <span>Projects</span>}
            </Link>
          </TooltipTrigger>
          {!isOpen && (
            <TooltipContent side="right">
              <p>Back to Projects</p>
            </TooltipContent>
          )}
        </Tooltip>

        {/* Project Name */}
        {isOpen && (
          <div className="px-3 py-2 mt-1">
            <h2 className="font-semibold text-sm truncate" title={projectName}>
              {projectName}
            </h2>
          </div>
        )}

        {/* Section Groups */}
        {PROJECT_SECTION_GROUPS.map((group) => (
          <div key={group.id} className="mt-4">
            {/* Group Label */}
            {isOpen && (
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </div>
            )}

            {/* Group Sections */}
            <div className="flex flex-col gap-0.5 mt-1">
              {group.sections.map((section) => {
                const Icon = ICON_MAP[section.icon];
                const isActive = activeSection === section.id;

                return (
                  <Tooltip key={section.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleSectionClick(section.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          !isOpen && 'justify-center'
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                        {isOpen && <span>{section.label}</span>}
                      </button>
                    </TooltipTrigger>
                    {!isOpen && (
                      <TooltipContent side="right">
                        <p>{section.label}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </TooltipProvider>
  );
}
