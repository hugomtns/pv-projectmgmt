import type { Task } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  onStatusToggle?: (taskId: string, completed: boolean) => void;
}

export function TaskList({ tasks, onTaskClick, onStatusToggle }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">No tasks yet</p>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === 'complete').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const notStartedCount = tasks.filter((t) => t.status === 'not_started').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600 bg-green-50';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50';
      case 'not_started':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'in_progress':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
      default:
        return status;
    }
  };

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
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onTaskClick?.(task.id)}
          >
            {/* Checkbox */}
            <Checkbox
              checked={task.status === 'complete'}
              onCheckedChange={(checked) => {
                onStatusToggle?.(task.id, checked === true);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5"
            />

            {/* Status indicator */}
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                task.status === 'complete'
                  ? 'bg-green-500 text-white'
                  : task.status === 'in_progress'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}
            >
              {task.status === 'complete' ? '✓' : task.status === 'in_progress' ? '•' : '○'}
            </div>

            {/* Task info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{task.title}</div>
              {task.assignee && (
                <div className="text-xs text-muted-foreground">
                  Assigned to: {task.assignee}
                </div>
              )}
            </div>

            {/* Status badge */}
            <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
              {getStatusLabel(task.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
