import React from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useFilterStore } from '@/stores/filterStore';
import { useDisplayStore } from '@/stores/displayStore';
import { PriorityBadge } from './PriorityBadge';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { Priority, Project } from '@/lib/types';

interface ProjectListProps {
  onProjectHover?: (projectId: string | null) => void;
}

export function ProjectList({ onProjectHover }: ProjectListProps) {
  const projects = useProjectStore((state) => state.projects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const selectProject = useProjectStore((state) => state.selectProject);
  const workflow = useWorkflowStore((state) => state.workflow);
  const filters = useFilterStore((state) => state.filters);
  const { settings } = useDisplayStore();
  const updateListSettings = useDisplayStore((state) => state.updateListSettings);

  const handleSort = (field: string) => {
    const currentField = settings.list.ordering.field;
    const currentDirection = settings.list.ordering.direction;

    // Toggle direction if same field, otherwise default to asc
    const newDirection = currentField === field && currentDirection === 'asc' ? 'desc' : 'asc';
    updateListSettings({ ordering: { field, direction: newDirection } });
  };

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

  // Apply sorting
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const { field, direction } = settings.list.ordering;
    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (field) {
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'stage':
        aVal = workflow.stages.findIndex(s => s.id === a.currentStageId);
        bVal = workflow.stages.findIndex(s => s.id === b.currentStageId);
        break;
      case 'priority':
        aVal = a.priority;
        bVal = b.priority;
        break;
      case 'owner':
        aVal = a.owner;
        bVal = b.owner;
        break;
      case 'location':
        aVal = a.location;
        bVal = b.location;
        break;
      case 'updatedAt':
        aVal = a.updatedAt;
        bVal = b.updatedAt;
        break;
      case 'tasks': {
        const aCurrentStageTasks = a.stages[a.currentStageId]?.tasks || [];
        const bCurrentStageTasks = b.stages[b.currentStageId]?.tasks || [];
        const aCompletedTasks = aCurrentStageTasks.filter(t => t.status === 'complete').length;
        const bCompletedTasks = bCurrentStageTasks.filter(t => t.status === 'complete').length;
        aVal = aCompletedTasks / (aCurrentStageTasks.length || 1);
        bVal = bCompletedTasks / (bCurrentStageTasks.length || 1);
        break;
      }
      default:
        aVal = a.name;
        bVal = b.name;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Apply grouping
  const grouping = settings.list.grouping;
  const grouped = new Map<string, Project[]>();

  if (grouping === 'none') {
    grouped.set('all', sortedProjects);
  } else {
    sortedProjects.forEach((project) => {
      let groupKey = '';
      switch (grouping) {
        case 'stage':
          groupKey = project.currentStageId;
          break;
        case 'priority':
          groupKey = `priority-${project.priority}`;
          break;
        case 'owner':
          groupKey = project.owner;
          break;
      }
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(project);
    });
  }

  // Filter out empty groups if needed
  const groupsToShow = Array.from(grouped.entries()).filter(([_, projects]) =>
    settings.list.showEmptyGroups || projects.length > 0
  );

  if (sortedProjects.length === 0) {
    const hasActiveFilters =
      filters.stages.length > 0 || filters.priorities.length > 0 || filters.owner || filters.search;

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

  const getGroupLabel = (groupKey: string): string => {
    if (grouping === 'none') return '';
    if (grouping === 'stage') {
      const stage = workflow.stages.find((s) => s.id === groupKey);
      return stage?.name || 'Unknown Stage';
    }
    if (grouping === 'priority') {
      const priority = parseInt(groupKey.split('-')[1]) as Priority;
      return PRIORITY_LABELS[priority];
    }
    return groupKey; // owner name
  };

  // Render header row
  const renderHeaderRow = () => (
    <div
      className="grid border-b border-border bg-muted/50"
      style={{ gridTemplateColumns: 'minmax(300px, 2.5fr) minmax(150px, 1.25fr) minmax(120px, 1fr) minmax(150px, 1.25fr) minmax(200px, 1.67fr) minmax(120px, 1fr) minmax(80px, 0.67fr)' }}
    >
      <div className="px-4 py-3">
        <button
          onClick={() => handleSort('name')}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Name
          {settings.list.ordering.field === 'name' && (
            <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      </div>
      <div className="px-4 py-3">
        <button
          onClick={() => handleSort('stage')}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Stage
          {settings.list.ordering.field === 'stage' && (
            <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      </div>
      <div className="px-4 py-3">
        <button
          onClick={() => handleSort('priority')}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Priority
          {settings.list.ordering.field === 'priority' && (
            <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      </div>
      <div className="px-4 py-3">
        <button
          onClick={() => handleSort('owner')}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Owner
          {settings.list.ordering.field === 'owner' && (
            <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      </div>
      <div className="px-4 py-3">
        <button
          onClick={() => handleSort('location')}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Location
          {settings.list.ordering.field === 'location' && (
            <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      </div>
      <div className="px-4 py-3">
        <button
          onClick={() => handleSort('updatedAt')}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Updated
          {settings.list.ordering.field === 'updatedAt' && (
            <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      </div>
      <div className="px-4 py-3">
        <button
          onClick={() => handleSort('tasks')}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Tasks
          {settings.list.ordering.field === 'tasks' && (
            <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>
      </div>
    </div>
  );

  // Render project row with grid
  const renderProjectRowGrid = (project: Project) => {
    const stage = workflow.stages.find((s) => s.id === project.currentStageId);
    const currentStageTasks = project.stages[project.currentStageId]?.tasks || [];
    const completedTasks = currentStageTasks.filter((t) => t.status === 'complete').length;

    return (
      <div
        key={project.id}
        className="grid hover:bg-muted/50 cursor-pointer border-b border-border"
        style={{ gridTemplateColumns: 'minmax(300px, 2.5fr) minmax(150px, 1.25fr) minmax(120px, 1fr) minmax(150px, 1.25fr) minmax(200px, 1.67fr) minmax(120px, 1fr) minmax(80px, 0.67fr)' }}
        onClick={() => selectProject(project.id)}
        onMouseEnter={() => onProjectHover?.(project.id)}
        onMouseLeave={() => onProjectHover?.(null)}
      >
        <div className="px-4 py-3 text-sm font-medium truncate" title={project.name}>{project.name}</div>
        <div className="px-4 py-3 flex items-center gap-2 min-w-0">
          {stage && (
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
          )}
          <span className="text-sm truncate">{stage?.name || 'Unknown'}</span>
        </div>
        <div className="px-4 py-3">
          <PriorityBadge
            priority={project.priority}
            onChange={(newPriority: Priority) => updateProject(project.id, { priority: newPriority })}
          />
        </div>
        <div className="px-4 py-3 text-sm truncate" title={project.owner}>{project.owner}</div>
        <div className="px-4 py-3 text-sm text-muted-foreground truncate" title={project.location}>{project.location}</div>
        <div className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
          {new Date(project.updatedAt).toLocaleDateString()}
        </div>
        <div className="px-4 py-3 text-sm text-muted-foreground text-center whitespace-nowrap">
          {completedTasks}/{currentStageTasks.length}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-3 md:p-6">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {groupsToShow.map(([groupKey, groupProjects], groupIndex) => (
          <React.Fragment key={groupKey}>
            {grouping !== 'none' && (
              <div className={`border-b border-border bg-muted/50 px-4 py-3 ${groupIndex > 0 ? 'border-t' : ''}`}>
                <h3 className="text-sm font-semibold">
                  {getGroupLabel(groupKey)} <span className="text-muted-foreground">({groupProjects.length})</span>
                </h3>
              </div>
            )}
            {renderHeaderRow()}
            <div>
              {groupProjects.map(renderProjectRowGrid)}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
