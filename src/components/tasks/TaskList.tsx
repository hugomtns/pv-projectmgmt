import type { Task } from '@/lib/types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  onStatusToggle?: (taskId: string, completed: boolean) => void;
}

export function TaskList({ tasks, onTaskClick, onStatusToggle }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-2">
            <svg
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">No tasks for this stage</p>
          <p className="text-xs text-muted-foreground">
            Tasks will be created automatically when a project enters this stage
          </p>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === 'complete').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const notStartedCount = tasks.filter((t) => t.status === 'not_started').length;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Task Progress</span>
          <span className="text-sm font-semibold">
            {completedCount}/{tasks.length} Complete
          </span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="text-green-600">✓ {completedCount} Complete</span>
          <span className="text-blue-600">• {inProgressCount} In Progress</span>
          <span className="text-gray-600">○ {notStartedCount} Not Started</span>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onClick={() => onTaskClick?.(task.id)}
            onStatusToggle={(completed) => onStatusToggle?.(task.id, completed)}
          />
        ))}
      </div>
    </div>
  );
}
