import { ProjectCard } from './ProjectCard';
import type { Project, Priority } from '@/lib/types';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface BoardColumnProps {
  columnId: string;
  title: string;
  color?: string;
  projects: Project[];
  getStageName: (stageId: string) => string;
  onUpdatePriority: (projectId: string, priority: Priority) => void;
  getTasksInfo: (project: Project) => { completed: number; total: number };
  onProjectHover?: (projectId: string | null) => void;
}

export function BoardColumn({
  columnId,
  title,
  color,
  projects,
  getStageName,
  onUpdatePriority,
  getTasksInfo,
  onProjectHover,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({
    id: columnId,
  });

  const projectIds = projects.map((p) => p.id);
  return (
    <div className="flex flex-col min-w-[240px] md:min-w-[280px] max-w-full md:max-w-[320px] flex-shrink-0">
      <div className="mb-4 flex items-center gap-2">
        {color && <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />}
        <h3 className="font-semibold text-sm">
          {title}
          <span className="ml-2 text-muted-foreground">({projects.length})</span>
        </h3>
      </div>

      <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex-1 space-y-3 min-h-[200px]">
          {projects.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No projects
            </div>
          ) : (
            projects.map((project) => {
              const { completed, total } = getTasksInfo(project);
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  stageName={getStageName(project.currentStageId)}
                  onUpdatePriority={(priority) => onUpdatePriority(project.id, priority)}
                  tasksCompleted={completed}
                  tasksTotal={total}
                  onProjectHover={onProjectHover}
                />
              );
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}
