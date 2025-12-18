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
import { useState } from 'react';
import { ProjectCard } from './ProjectCard';

interface ProjectBoardProps {
  onProjectHover?: (projectId: string | null) => void;
}

export function ProjectBoard({ onProjectHover }: ProjectBoardProps) {
  const projects = useProjectStore((state) => state.projects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const workflow = useWorkflowStore((state) => state.workflow);
  const filters = useFilterStore((state) => state.filters);
  const { settings } = useDisplayStore();
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Apply filters
  const filteredProjects = projects.filter((project) => {
    if (filters.stages.length > 0 && !filters.stages.includes(project.currentStageId)) {
      return false;
    }
    if (filters.priorities.length > 0 && !filters.priorities.includes(project.priority)) {
      return false;
    }
    if (filters.owner && !project.owner.toLowerCase().includes(filters.owner.toLowerCase())) {
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

    if (columnBy === 'stage') {
      // Update project's current stage
      updateProject(projectId, { currentStageId: targetColumnId });
    } else if (columnBy === 'priority') {
      // Extract priority from column ID (format: "priority-X")
      const priority = parseInt(targetColumnId.split('-')[1]) as Priority;
      updateProject(projectId, { priority });
    }

    setActiveProject(null);
  };

  // Determine column and row layout based on settings
  const columnBy = settings.board.columns;
  const rowBy = settings.board.rows;

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
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No projects found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {filters.stages.length > 0 || filters.priorities.length > 0 || filters.owner || filters.search
              ? 'Try adjusting your filters'
              : 'Create your first project to get started'}
          </p>
        </div>
      </div>
    );
  }

  // Render simple column layout when rows='none'
  if (rowBy === 'none') {
    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-auto p-6">
          <div className="flex gap-4 min-h-full">
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
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {rowDefs.map((row) => (
            <div key={row.id}>
              {/* Row header */}
              <div className="mb-3 flex items-center gap-2">
                {row.color && <div className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />}
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
