import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInDays, format } from 'date-fns';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckSquare } from 'lucide-react';

interface TaskMarkerProps {
  task: Task;
  stageName: string;
  rangeStart: Date;
  rangeEnd: Date;
  onClick: (task: Task) => void;
}

export function TaskMarker({ task, stageName, rangeStart, rangeEnd, onClick }: TaskMarkerProps) {
  if (!task.dueDate) return null;

  // Calculate position as percentage
  const taskDate = new Date(task.dueDate);
  const totalDays = differenceInDays(rangeEnd, rangeStart);
  const daysFromStart = differenceInDays(taskDate, rangeStart);
  const position = (daysFromStart / totalDays) * 100;

  // Don't render if outside visible range
  if (position < 0 || position > 100) return null;

  // Check if task is overdue
  const today = new Date();
  const isOverdue = task.status !== 'complete' && taskDate < today;
  const isUpcoming = task.status !== 'complete' && differenceInDays(taskDate, today) <= 7 && differenceInDays(taskDate, today) >= 0;
  const isComplete = task.status === 'complete';

  // Determine color based on status
  let bgColor = 'bg-blue-500'; // Default for tasks
  let borderColor = 'border-blue-500';
  if (isComplete) {
    bgColor = 'bg-green-500';
    borderColor = 'border-green-500';
  } else if (isOverdue) {
    bgColor = 'bg-red-500';
    borderColor = 'border-red-500';
  } else if (isUpcoming) {
    bgColor = 'bg-amber-500';
    borderColor = 'border-amber-500';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(task);
            }}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 rounded transition-all hover:scale-125 flex items-center justify-center',
              'w-4 h-4 border-2',
              bgColor,
              borderColor,
              isUpcoming && !isOverdue && !isComplete && 'w-5 h-5'
            )}
            style={{ left: `${position}%` }}
          >
            <CheckSquare className="h-2.5 w-2.5 text-white" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-1">
            <p className="font-medium">{task.title}</p>
            <p className="text-xs text-muted-foreground">Stage: {stageName}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground max-w-[200px] truncate">{task.description}</p>
            )}
            <p className="text-xs text-muted-foreground">Due: {format(taskDate, 'MMM d, yyyy')}</p>
            {isComplete && <p className="text-xs text-green-600">✓ Completed</p>}
            {isOverdue && <p className="text-xs text-red-600">⚠ Overdue</p>}
            {isUpcoming && !isOverdue && <p className="text-xs text-amber-600">⏰ Due soon</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
