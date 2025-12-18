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
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4 text-4xl">📋</div>
          <p className="text-lg font-medium text-muted-foreground mb-2">No projects found</p>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more projects'
              : 'Get started by creating your first project'}
          </p>
          {!hasActiveFilters && (
            <p className="mt-4 text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 text-xs font-semibold bg-muted rounded">N</kbd> or click "New
              Project" to create one
            </p>
          )}
        </div>
      </div>
    );
  }

  const renderProjectRow = (project: Project) => {
    const stage = workflow.stages.find((s) => s.id === project.currentStageId);
    const currentStageTasks = project.stages[project.currentStageId]?.tasks || [];
    const completedTasks = currentStageTasks.filter((t) => t.status === 'complete').length;
    const selectProject = useProjectStore((state) => state.selectProject);

    return (
      <tr
        key={project.id}
        className="hover:bg-muted/50 cursor-pointer"
        onClick={() => selectProject(project.id)}
        onMouseEnter={() => onProjectHover?.(project.id)}
        onMouseLeave={() => onProjectHover?.(null)}
      >
        <td className="px-4 py-3 text-sm font-medium">{project.name}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {stage && (
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: stage.color }}
              />
            )}
            <span className="text-sm">{stage?.name || 'Unknown'}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <PriorityBadge
            priority={project.priority}
            onChange={(newPriority: Priority) => updateProject(project.id, { priority: newPriority })}
          />
        </td>
        <td className="px-4 py-3 text-sm">{project.owner}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{project.location}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {new Date(project.updatedAt).toLocaleDateString()}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {completedTasks}/{currentStageTasks.length}
        </td>
      </tr>
    );
  };

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

  return (
    <div className="flex-1 overflow-auto p-3 md:p-6">
      <div className="space-y-4 md:space-y-6">
        {groupsToShow.map(([groupKey, groupProjects]) => (
          <div key={groupKey} className="rounded-lg border border-border bg-card">
            {grouping !== 'none' && (
              <div className="border-b border-border bg-muted/50 px-4 py-3">
                <h3 className="text-sm font-semibold">
                  {getGroupLabel(groupKey)} <span className="text-muted-foreground">({groupProjects.length})</span>
                </h3>
              </div>
            )}
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Name
                      {settings.list.ordering.field === 'name' && (
                        <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Stage</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('priority')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Priority
                      {settings.list.ordering.field === 'priority' && (
                        <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('owner')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Owner
                      {settings.list.ordering.field === 'owner' && (
                        <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('location')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Location
                      {settings.list.ordering.field === 'location' && (
                        <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('updatedAt')}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Updated
                      {settings.list.ordering.field === 'updatedAt' && (
                        <span>{settings.list.ordering.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groupProjects.map(renderProjectRow)}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
