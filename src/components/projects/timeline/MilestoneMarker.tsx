import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInDays, format } from 'date-fns';
import type { Milestone } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MILESTONE_STATUS_COLORS } from '@/lib/constants';

interface MilestoneMarkerProps {
  milestone: Milestone;
  rangeStart: Date;
  rangeEnd: Date;
  onClick: (milestone: Milestone) => void;
}

export function MilestoneMarker({ milestone, rangeStart, rangeEnd, onClick }: MilestoneMarkerProps) {
  // Calculate position as percentage
  const milestoneDate = new Date(milestone.date);
  const totalDays = differenceInDays(rangeEnd, rangeStart);
  const daysFromStart = differenceInDays(milestoneDate, rangeStart);
  const position = (daysFromStart / totalDays) * 100;

  // Don't render if outside visible range
  if (position < 0 || position > 100) return null;

  // Check if milestone is overdue
  const today = new Date();
  const isOverdue = !milestone.completed && milestoneDate < today;
  const isUpcoming = !milestone.completed && differenceInDays(milestoneDate, today) <= 7 && differenceInDays(milestoneDate, today) >= 0;

  // Determine color based on status
  let displayColor = milestone.color; // Default to user's color
  if (milestone.completed) {
    displayColor = MILESTONE_STATUS_COLORS.completed; // Green
  } else if (isOverdue) {
    displayColor = MILESTONE_STATUS_COLORS.overdue; // Red
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(milestone);
            }}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 rounded-full border-2 transition-all hover:scale-125',
              'w-4 h-4',
              isUpcoming && !isOverdue && !milestone.completed && 'w-5 h-5'
            )}
            style={{
              left: `${position}%`,
              borderColor: displayColor,
              backgroundColor: displayColor,
            }}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-1">
            <p className="font-medium">{milestone.name}</p>
            {milestone.description && (
              <p className="text-xs text-muted-foreground">{milestone.description}</p>
            )}
            <p className="text-xs text-muted-foreground">{format(milestoneDate, 'MMM d, yyyy')}</p>
            {milestone.completed && milestone.completedAt && (
              <p className="text-xs text-green-600">✓ Completed {format(new Date(milestone.completedAt), 'MMM d')}</p>
            )}
            {isOverdue && <p className="text-xs text-red-600">⚠ Overdue</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
