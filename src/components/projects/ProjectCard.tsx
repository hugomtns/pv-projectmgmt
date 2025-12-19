import { PriorityBadge } from './PriorityBadge';
import { UserDisplay } from '@/components/users/UserDisplay';
import { useProjectStore } from '@/stores/projectStore';
import type { Project, Priority } from '@/lib/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProjectCardProps {
  project: Project;
  stageName: string;
  onUpdatePriority: (priority: Priority) => void;
  tasksCompleted: number;
  tasksTotal: number;
  onProjectHover?: (projectId: string | null) => void;
}

export function ProjectCard({
  project,
  stageName,
  onUpdatePriority,
  tasksCompleted,
  tasksTotal,
  onProjectHover,
}: ProjectCardProps) {
  const selectProject = useProjectStore((state) => state.selectProject);
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

  const handleClick = (e: React.MouseEvent) => {
    // Don't open detail if clicking on priority badge
    if ((e.target as HTMLElement).closest('[role="button"]')) {
      return;
    }
    selectProject(project.id);
  };

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
          <PriorityBadge priority={project.priority} onChange={onUpdatePriority} />
          <span className="text-xs text-muted-foreground">
            {tasksCompleted}/{tasksTotal} tasks
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserDisplay userId={project.owner} variant="avatar-only" showRole />
          <span>{stageName}</span>
        </div>
      </div>
    </div>
  );
}
