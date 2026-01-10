import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useFilterStore } from '@/stores/filterStore';
import { useDisplayStore } from '@/stores/displayStore';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from './PriorityBadge';
import { UserDisplay } from '@/components/users/UserDisplay';
import { getUserDisplayName } from '@/lib/userUtils';
import { getNextMilestone, formatMilestoneDate } from '@/lib/milestoneUtils';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { Priority, Project } from '@/lib/types';

interface ProjectListProps {
  onProjectHover?: (projectId: string | null) => void;
}

export function ProjectList({ onProjectHover }: ProjectListProps) {
  const navigate = useNavigate();
  const projects = useProjectStore((state) => state.projects);
  const workflow = useWorkflowStore((state) => state.workflow);
  const users = useUserStore((state) => state.users);
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

  const getSortIcon = (field: string) => {
    const currentField = settings.list.ordering.field;
    const currentDirection = settings.list.ordering.direction;

    if (currentField !== field) {
      return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
    }
    return currentDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5" />
      : <ArrowDown className="h-3.5 w-3.5" />;
  };

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
        aVal = getUserDisplayName(a.owner, users).toLowerCase();
        bVal = getUserDisplayName(b.owner, users).toLowerCase();
        break;
      case 'location':
        aVal = a.location;
        bVal = b.location;
        break;
      case 'updatedAt':
        aVal = a.updatedAt;
        bVal = b.updatedAt;
        break;
      case 'nextMilestone': {
        const aNextMilestone = getNextMilestone(a.milestones || []);
        const bNextMilestone = getNextMilestone(b.milestones || []);
        // Projects without milestones sort last
        if (!aNextMilestone && !bNextMilestone) return 0;
        if (!aNextMilestone) return 1;
        if (!bNextMilestone) return -1;
        aVal = aNextMilestone.date;
        bVal = bNextMilestone.date;
        break;
      }
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
    if (grouping === 'owner') {
      return getUserDisplayName(groupKey, users);
    }
    return groupKey;
  };

  // Render header row
  const renderHeaderRow = () => (
    <div
      className="grid border-b border-border bg-muted/50"
      style={{ gridTemplateColumns: 'minmax(300px, 2.5fr) minmax(150px, 1.25fr) minmax(120px, 1fr) minmax(150px, 1.25fr) minmax(200px, 1.67fr) minmax(120px, 1fr) minmax(150px, 1.25fr) minmax(80px, 0.67fr)' }}
    >
      <div className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('name')}
          className="h-auto p-0 font-medium"
        >
          Name
          {getSortIcon('name')}
        </Button>
      </div>
      <div className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('stage')}
          className="h-auto p-0 font-medium"
        >
          Stage
          {getSortIcon('stage')}
        </Button>
      </div>
      <div className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('priority')}
          className="h-auto p-0 font-medium"
        >
          Priority
          {getSortIcon('priority')}
        </Button>
      </div>
      <div className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('owner')}
          className="h-auto p-0 font-medium"
        >
          Owner
          {getSortIcon('owner')}
        </Button>
      </div>
      <div className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('location')}
          className="h-auto p-0 font-medium"
        >
          Location
          {getSortIcon('location')}
        </Button>
      </div>
      <div className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('updatedAt')}
          className="h-auto p-0 font-medium"
        >
          Updated
          {getSortIcon('updatedAt')}
        </Button>
      </div>
      <div className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('nextMilestone')}
          className="h-auto p-0 font-medium"
        >
          Next Milestone
          {getSortIcon('nextMilestone')}
        </Button>
      </div>
      <div className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('tasks')}
          className="h-auto p-0 font-medium"
        >
          Tasks
          {getSortIcon('tasks')}
        </Button>
      </div>
    </div>
  );

  // Render project row with grid
  const renderProjectRowGrid = (project: Project) => {
    const stage = workflow.stages.find((s) => s.id === project.currentStageId);
    const currentStageTasks = project.stages[project.currentStageId]?.tasks || [];
    const completedTasks = currentStageTasks.filter((t) => t.status === 'complete').length;
    const nextMilestone = getNextMilestone(project.milestones || []);

    return (
      <div
        key={project.id}
        className="grid hover:bg-muted/50 cursor-pointer border-b border-border"
        style={{ gridTemplateColumns: 'minmax(300px, 2.5fr) minmax(150px, 1.25fr) minmax(120px, 1fr) minmax(150px, 1.25fr) minmax(200px, 1.67fr) minmax(120px, 1fr) minmax(150px, 1.25fr) minmax(80px, 0.67fr)' }}
        onClick={() => navigate(`/projects/${project.id}`)}
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
          <PriorityBadge priority={project.priority} readonly />
        </div>
        <div className="px-4 py-3">
          <UserDisplay userId={project.owner} variant="compact" />
        </div>
        <div className="px-4 py-3 text-sm text-muted-foreground truncate" title={project.location}>{project.location}</div>
        <div className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
          {new Date(project.updatedAt).toLocaleDateString()}
        </div>
        <div className="px-4 py-3">
          {nextMilestone ? (
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: nextMilestone.color }}
              />
              <div className="min-w-0">
                <div className="text-sm truncate" title={nextMilestone.name}>{nextMilestone.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatMilestoneDate(nextMilestone.date)}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
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
