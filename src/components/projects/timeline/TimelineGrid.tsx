import { TimelineRow } from './TimelineRow';
import type { Project, Milestone, Priority } from '@/lib/types';
import { useWorkflowStore } from '@/stores/workflowStore';
import { PRIORITY_LABELS } from '@/lib/constants';

interface TimelineGridProps {
  projects: Project[];
  rangeStart: Date;
  rangeEnd: Date;
  showCompletedMilestones: boolean;
  groupBy: 'none' | 'stage' | 'priority';
  ordering: { field: string; direction: 'asc' | 'desc' };
  onMilestoneClick: (projectId: string, milestone: Milestone) => void;
}

export function TimelineGrid({
  projects,
  rangeStart,
  rangeEnd,
  showCompletedMilestones,
  groupBy,
  ordering,
  onMilestoneClick,
}: TimelineGridProps) {
  const workflow = useWorkflowStore((state) => state.workflow);

  // Apply sorting
  const sortedProjects = [...projects].sort((a, b) => {
    const { field, direction } = ordering;
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
      case 'stage':
        aVal = workflow.stages.findIndex(s => s.id === a.currentStageId);
        bVal = workflow.stages.findIndex(s => s.id === b.currentStageId);
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
  const grouped = new Map<string, Project[]>();

  if (groupBy === 'none') {
    grouped.set('all', sortedProjects);
  } else {
    sortedProjects.forEach((project) => {
      let groupKey = '';
      switch (groupBy) {
        case 'stage':
          groupKey = project.currentStageId;
          break;
        case 'priority':
          groupKey = `priority-${project.priority}`;
          break;
      }
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(project);
    });
  }

  const getGroupLabel = (groupKey: string): string => {
    if (groupBy === 'none') return '';
    if (groupBy === 'stage') {
      const stage = workflow.stages.find((s) => s.id === groupKey);
      return stage?.name || 'Unknown Stage';
    }
    if (groupBy === 'priority') {
      const priority = parseInt(groupKey.split('-')[1]) as Priority;
      return PRIORITY_LABELS[priority];
    }
    return groupKey;
  };

  if (sortedProjects.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-sm font-medium">No projects found</p>
          <p className="text-sm text-muted-foreground">
            Adjust your filters to see more projects
          </p>
        </div>
      </div>
    );
  }

  // Check if any projects have milestones
  const totalMilestones = sortedProjects.reduce((sum, p) => sum + (p.milestones?.length || 0), 0);
  const hasAnyMilestones = totalMilestones > 0;

  return (
    <div className="overflow-y-auto h-full">
      {!hasAnyMilestones && (
        <div className="flex items-center justify-center p-8 text-center border-b">
          <div className="space-y-2">
            <p className="text-sm font-medium">No milestones yet</p>
            <p className="text-sm text-muted-foreground">
              Add milestones to your projects to see them on the timeline
            </p>
          </div>
        </div>
      )}
      {Array.from(grouped.entries()).map(([groupKey, groupProjects]) => (
        <div key={groupKey}>
          {groupBy !== 'none' && (
            <div className="bg-muted/50 px-4 py-2 border-b sticky top-0 z-10">
              <h3 className="text-sm font-semibold">
                {getGroupLabel(groupKey)}{' '}
                <span className="text-muted-foreground">({groupProjects.length})</span>
              </h3>
            </div>
          )}
          {groupProjects.map((project) => (
            <TimelineRow
              key={project.id}
              project={project}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              showCompletedMilestones={showCompletedMilestones}
              onMilestoneClick={onMilestoneClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
