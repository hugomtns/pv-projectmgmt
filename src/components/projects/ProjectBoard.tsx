import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useFilterStore } from '@/stores/filterStore';
import { useDisplayStore } from '@/stores/displayStore';
import { BoardColumn } from './BoardColumn';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants';
import type { Project, Priority } from '@/lib/types';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState, useRef, useEffect } from 'react';
import { ProjectCard } from './ProjectCard';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProjectBoardProps {
  onProjectHover?: (projectId: string | null) => void;
}

export function ProjectBoard({ onProjectHover }: ProjectBoardProps) {
  const projects = useProjectStore((state) => state.projects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const moveProjectToStage = useProjectStore((state) => state.moveProjectToStage);
  const workflow = useWorkflowStore((state) => state.workflow);
  const filters = useFilterStore((state) => state.filters);
  const { settings } = useDisplayStore();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Determine column and row layout based on settings
  const columnBy = settings.board.columns;
  const rowBy = settings.board.rows;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Check scroll position and update arrow visibility
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Scroll left/right
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8; // Scroll 80% of visible width
    const newScrollLeft = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  // Check scroll on mount and when columns change
  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => checkScroll();
    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [columnBy, rowBy]);

  // Apply filters
  const filteredProjects = projects.filter((project) => {
    if (filters.stages.length > 0 && !filters.stages.includes(project.currentStageId)) {
      return false;
    }
    if (filters.priorities.length > 0 && !filters.priorities.includes(project.priority)) {
      return false;
    }
    if (filters.owners.length > 0 && !filters.owners.includes(project.owner)) {
      return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        project.name.toLowerCase().includes(searchLower) ||
        project.location.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getStageName = (stageId: string): string => {
    const stage = workflow.stages.find((s) => s.id === stageId);
    return stage?.name || 'Unknown';
  };

  const getTasksInfo = (project: Project) => {
    const currentStageTasks = project.stages[project.currentStageId]?.tasks || [];
    const completed = currentStageTasks.filter((t) => t.status === 'complete').length;
    return { completed, total: currentStageTasks.length };
  };

  const handleUpdatePriority = (projectId: string, priority: Priority) => {
    updateProject(projectId, { priority });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find((p) => p.id === event.active.id);
    setActiveProject(project || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveProject(null);
      return;
    }

    const projectId = active.id as string;
    const targetColumnId = over.id as string;
    const project = projects.find((p) => p.id === projectId);

    if (columnBy === 'stage') {
      // Use moveProjectToStage to respect gate checks
      const success = moveProjectToStage(projectId, targetColumnId);

      if (!success && project) {
        const targetStage = workflow.stages.find((s) => s.id === targetColumnId);
        toast.error('Cannot move project', {
          description: `Complete all tasks in the current stage before moving to "${targetStage?.name || 'next stage'}".`,
        });
      }
    } else if (columnBy === 'priority') {
      // Extract priority from column ID (format: "priority-X")
      const priority = parseInt(targetColumnId.split('-')[1]) as Priority;
      updateProject(projectId, { priority });
    }

    setActiveProject(null);
  };

  // Get column definitions
  const getColumnDefs = () => {
    if (columnBy === 'stage') {
      return workflow.stages.map((stage) => ({
        id: stage.id,
        title: stage.name,
        color: stage.color,
      }));
    } else {
      const priorities: Priority[] = [1, 2, 3, 4, 0];
      return priorities.map((priority) => ({
        id: `priority-${priority}`,
        title: PRIORITY_LABELS[priority],
        color: PRIORITY_COLORS[priority],
      }));
    }
  };

  // Get row definitions
  const getRowDefs = () => {
    if (rowBy === 'none') {
      return [{ id: 'all', title: '' }];
    } else if (rowBy === 'priority') {
      const priorities: Priority[] = [1, 2, 3, 4, 0];
      return priorities.map((priority) => ({
        id: `priority-${priority}`,
        title: PRIORITY_LABELS[priority],
        color: PRIORITY_COLORS[priority],
      }));
    } else {
      // rowBy === 'owner'
      const owners = Array.from(new Set(filteredProjects.map((p) => p.owner))).sort();
      return owners.map((owner) => ({ id: owner, title: owner }));
    }
  };

  const columnDefs = getColumnDefs();
  const rowDefs = getRowDefs();

  // Filter projects into grid cells
  const getProjectsForCell = (columnId: string, rowId: string): Project[] => {
    return filteredProjects.filter((project) => {
      // Check column match
      const columnMatch =
        columnBy === 'stage'
          ? project.currentStageId === columnId
          : `priority-${project.priority}` === columnId;

      if (!columnMatch) return false;

      // Check row match
      if (rowBy === 'none') return true;
      if (rowBy === 'priority') return `priority-${project.priority}` === rowId;
      if (rowBy === 'owner') return project.owner === rowId;

      return false;
    });
  };

  if (filteredProjects.length === 0) {
    const hasActiveFilters =
      filters.stages.length > 0 || filters.priorities.length > 0 || filters.owners.length > 0 || filters.search;

    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-3">
              <svg
                className="h-6 w-6 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">No projects found</p>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more projects'
                : 'Get started by creating your first project'}
            </p>
          </div>
          {!hasActiveFilters && (
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border border-border rounded">N</kbd> or click New Project
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render simple column layout when rows='none'
  if (rowBy === 'none') {
    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 relative overflow-hidden">
          {/* Left scroll arrow */}
          {showLeftArrow && (
            <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                onClick={() => scroll('left')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Right scroll arrow */}
          {showRightArrow && (
            <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pr-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                onClick={() => scroll('right')}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Scrollable content */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto overflow-y-auto p-3 md:p-6 scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div className="flex gap-3 md:gap-4 min-h-full">
              {columnDefs.map((col) => {
                const projects = getProjectsForCell(col.id, 'all');
                return (
                  <BoardColumn
                    key={col.id}
                    columnId={col.id}
                    title={col.title}
                    color={col.color}
                    projects={projects}
                    getStageName={getStageName}
                    onUpdatePriority={handleUpdatePriority}
                    getTasksInfo={getTasksInfo}
                    onProjectHover={onProjectHover}
                  />
                );
              })}
              {/* Spacer for right-side symmetry */}
              <div className="w-3 md:w-6 shrink-0" aria-hidden="true" />
            </div>
          </div>
        </div>
        <DragOverlay>
          {activeProject ? (
            <ProjectCard
              project={activeProject}
              stageName={getStageName(activeProject.currentStageId)}
              onUpdatePriority={(priority) => handleUpdatePriority(activeProject.id, priority)}
              tasksCompleted={getTasksInfo(activeProject).completed}
              tasksTotal={getTasksInfo(activeProject).total}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  // Render grid layout when rows='priority' or 'owner'
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-auto p-3 md:p-6">
        <div className="space-y-4 md:space-y-6">
          {rowDefs.map((row) => (
            <div key={row.id}>
              {/* Row header */}
              <div className="mb-3 flex items-center gap-2">
                {'color' in row && row.color && (
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                )}
                <h3 className="text-sm font-semibold">{row.title}</h3>
              </div>

              {/* Columns for this row */}
              <div className="flex gap-4">
                {columnDefs.map((col) => {
                  const projects = getProjectsForCell(col.id, row.id);
                  // Create unique ID for drag-and-drop: "columnId-rowId"
                  const cellId = `${col.id}-${row.id}`;
                  return (
                    <BoardColumn
                      key={cellId}
                      columnId={col.id}
                      title={col.title}
                      color={col.color}
                      projects={projects}
                      getStageName={getStageName}
                      onUpdatePriority={handleUpdatePriority}
                      getTasksInfo={getTasksInfo}
                      onProjectHover={onProjectHover}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeProject ? (
          <ProjectCard
            project={activeProject}
            stageName={getStageName(activeProject.currentStageId)}
            onUpdatePriority={(priority) => handleUpdatePriority(activeProject.id, priority)}
            tasksCompleted={getTasksInfo(activeProject).completed}
            tasksTotal={getTasksInfo(activeProject).total}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
