import { useNavigate } from 'react-router-dom';
import { PriorityBadge } from '../PriorityBadge';
import { MilestoneMarker } from './MilestoneMarker';
import type { Project, Milestone } from '@/lib/types';
import { useWorkflowStore } from '@/stores/workflowStore';

interface TimelineRowProps {
  project: Project;
  rangeStart: Date;
  rangeEnd: Date;
  showCompletedMilestones: boolean;
  onMilestoneClick: (projectId: string, milestone: Milestone) => void;
}

export function TimelineRow({
  project,
  rangeStart,
  rangeEnd,
  showCompletedMilestones,
  onMilestoneClick,
}: TimelineRowProps) {
  const navigate = useNavigate();
  const workflow = useWorkflowStore((state) => state.workflow);
  const stage = workflow.stages.find((s) => s.id === project.currentStageId);

  // Filter milestones based on settings
  const visibleMilestones = (project.milestones || []).filter((m) =>
    showCompletedMilestones || !m.completed
  );

  return (
    <div className="grid grid-cols-[300px_1fr] border-b hover:bg-muted/50 transition-colors">
      {/* Project header */}
      <div
        className="p-3 border-r flex flex-col gap-2 cursor-pointer"
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm truncate" title={project.name}>
            {project.name}
          </h4>
          <PriorityBadge priority={project.priority} readonly />
        </div>
        <div className="flex items-center gap-2">
          {stage && (
            <>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-xs text-muted-foreground truncate">{stage.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Timeline area */}
      <div className="relative h-16 bg-card">
        {visibleMilestones.map((milestone) => (
          <MilestoneMarker
            key={milestone.id}
            milestone={milestone}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onClick={(m) => onMilestoneClick(project.id, m)}
          />
        ))}
      </div>
    </div>
  );
}
