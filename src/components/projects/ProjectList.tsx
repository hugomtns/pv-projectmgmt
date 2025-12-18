import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useFilterStore } from '@/stores/filterStore';
import { useDisplayStore } from '@/stores/displayStore';
import { PriorityBadge } from './PriorityBadge';
import type { Priority } from '@/lib/types';

export function ProjectList() {
  const projects = useProjectStore((state) => state.projects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const workflow = useWorkflowStore((state) => state.workflow);
  const filters = useFilterStore((state) => state.filters);
  const { settings } = useDisplayStore();

  // Apply filters
  const filteredProjects = projects.filter((project) => {
    // Stage filter
    if (filters.stages.length > 0 && !filters.stages.includes(project.currentStageId)) {
      return false;
    }

    // Priority filter
    if (filters.priorities.length > 0 && !filters.priorities.includes(project.priority)) {
      return false;
    }

    // Owner filter
    if (filters.owner && !project.owner.toLowerCase().includes(filters.owner.toLowerCase())) {
      return false;
    }

    // Search filter
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

  if (sortedProjects.length === 0) {
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

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Stage</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Owner</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Location</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Updated</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tasks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedProjects.map((project) => {
              const stage = workflow.stages.find((s) => s.id === project.currentStageId);
              const currentStageTasks = project.stages[project.currentStageId]?.tasks || [];
              const completedTasks = currentStageTasks.filter((t) => t.status === 'complete').length;

              return (
                <tr key={project.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-medium">{project.name}</td>
                  <td className="px-4 py-3 text-sm">{stage?.name || 'Unknown'}</td>
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
