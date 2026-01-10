import { useNavigate } from 'react-router-dom';
import { PriorityBadge } from './PriorityBadge';
import { UserDisplay } from '@/components/users/UserDisplay';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Project } from '@/lib/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, Calendar } from 'lucide-react';
import { getNextMilestone, formatMilestoneDate } from '@/lib/milestoneUtils';

interface ProjectCardProps {
  project: Project;
  stageName: string;
  tasksCompleted: number;
  tasksTotal: number;
  onProjectHover?: (projectId: string | null) => void;
}

export function ProjectCard({
  project,
  stageName,
  tasksCompleted,
  tasksTotal,
  onProjectHover,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = () => {
    navigate(`/projects/${project.id}`);
  };

  const nextMilestone = getNextMilestone(project.milestones || []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onMouseEnter={() => onProjectHover?.(project.id)}
      onMouseLeave={() => onProjectHover?.(null)}
      className="rounded-lg border border-border bg-card p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-grab active:cursor-grabbing"
    >
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-sm">{project.name}</h4>
          <p className="text-xs text-muted-foreground mt-1">{project.location}</p>
        </div>

        <div className="flex items-center justify-between">
          <PriorityBadge priority={project.priority} readonly />
          <span className="text-xs text-muted-foreground">
            {tasksCompleted}/{tasksTotal} tasks
          </span>
        </div>

        {nextMilestone && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border w-fit"
                  style={{
                    borderColor: nextMilestone.color + '40',
                    backgroundColor: nextMilestone.color + '10'
                  }}
                >
                  <Calendar className="h-3 w-3" style={{ color: nextMilestone.color }} />
                  <span className="text-muted-foreground truncate">
                    {formatMilestoneDate(nextMilestone.date)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{nextMilestone.name}</p>
                  {nextMilestone.description && (
                    <p className="text-xs text-muted-foreground">{nextMilestone.description}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserDisplay userId={project.owner} variant="avatar-only" showRole />
            <span>{stageName}</span>
          </div>

          {project.attachments && project.attachments.length > 0 && (
            <Badge variant="secondary" className="gap-1 h-5 px-1.5">
              <FileText className="h-3 w-3" />
              <span className="text-xs">{project.attachments.length}</span>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
