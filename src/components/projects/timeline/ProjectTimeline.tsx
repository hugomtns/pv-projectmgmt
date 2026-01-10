import { useProjectStore } from '@/stores/projectStore';
import { useFilterStore } from '@/stores/filterStore';
import { useDisplayStore } from '@/stores/displayStore';

export function ProjectTimeline() {
  const projects = useProjectStore((state) => state.projects);
  const filters = useFilterStore((state) => state.filters);
  const { settings } = useDisplayStore();

  // Apply filters (will be same as list/board views)
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

  return (
    <div className="flex-1 overflow-auto p-3 md:p-6">
      <div className="rounded-lg border border-border bg-card p-8">
        <div className="text-center space-y-4">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Timeline View</p>
            <p className="text-sm text-muted-foreground">
              Timeline view is coming soon! This will show all projects with their milestones in a Gantt-style layout.
            </p>
            <p className="text-xs text-muted-foreground">
              Current settings: {settings.timeline.viewMode} view, {filteredProjects.length} projects
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
