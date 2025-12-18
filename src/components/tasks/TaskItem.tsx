import type { Task } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskItemProps {
  task: Task;
  onClick?: () => void;
  onStatusToggle?: (completed: boolean) => void;
}

export function TaskItem({ task, onClick, onStatusToggle }: TaskItemProps) {
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

  const formatDueDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Checkbox */}
      <Checkbox
        checked={task.status === 'complete'}
        onCheckedChange={(checked) => {
          onStatusToggle?.(checked === true);
        }}
        onClick={(e) => e.stopPropagation()}
        className="h-5 w-5"
      />

      {/* Status indicator */}
      <div
        className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
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
        <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {task.assignee && <span>Assigned to: {task.assignee}</span>}
          {task.dueDate && (
            <span className="flex items-center gap-1">
              Due: {formatDueDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className={`text-xs px-2 py-1 rounded-full shrink-0 ${getStatusColor(task.status)}`}>
        {getStatusLabel(task.status)}
      </div>
    </div>
  );
}
