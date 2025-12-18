import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectBoard } from '@/components/projects/ProjectBoard';
import { DisplayPopover } from '@/components/projects/DisplayPopover';
import { FilterBar } from '@/components/projects/FilterBar';
import { SearchInput } from '@/components/projects/SearchInput';
import { ActiveFilters } from '@/components/projects/ActiveFilters';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { KeyboardShortcutsDialog } from '@/components/layout/KeyboardShortcutsDialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDisplayStore } from '@/stores/displayStore';
import { useProjectStore } from '@/stores/projectStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Priority } from '@/lib/types';

export function Projects() {
  const view = useDisplayStore((state) => state.settings.view);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);

  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const updateProject = useProjectStore((state) => state.updateProject);

  // Priority shortcuts: 0-4
  // Navigation shortcuts: N (new project), / (focus search), ? (shortcuts help)
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '0',
        handler: () => handlePriorityShortcut(0),
      },
      {
        key: '1',
        handler: () => handlePriorityShortcut(1),
      },
      {
        key: '2',
        handler: () => handlePriorityShortcut(2),
      },
      {
        key: '3',
        handler: () => handlePriorityShortcut(3),
      },
      {
        key: '4',
        handler: () => handlePriorityShortcut(4),
      },
      {
        key: 'n',
        handler: () => setCreateDialogOpen(true),
      },
      {
        key: '/',
        handler: () => {
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          searchInput?.focus();
        },
      },
      {
        key: '?',
        handler: () => setShortcutsDialogOpen(true),
      },
    ],
  });

  const handlePriorityShortcut = (priority: Priority) => {
    // Prefer selected project, fall back to hovered project
    const targetProjectId = selectedProjectId || hoveredProjectId;
    if (targetProjectId) {
      updateProject(targetProjectId, { priority });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header title="Projects">
        <div className="flex gap-2 flex-1 max-w-2xl">
          <SearchInput />
          <FilterBar />
          <DisplayPopover />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setCreateDialogOpen(true)}>New Project</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Press <kbd className="px-1 py-0.5 text-xs font-semibold bg-muted rounded">N</kbd> to create</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Header>
      <ActiveFilters />
      {view === 'list' ? (
        <ProjectList onProjectHover={setHoveredProjectId} />
      ) : (
        <ProjectBoard onProjectHover={setHoveredProjectId} />
      )}
      <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <ProjectDetail />
      <KeyboardShortcutsDialog open={shortcutsDialogOpen} onOpenChange={setShortcutsDialogOpen} />
    </div>
  );
}
