import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Milestone } from '@/lib/types';

interface MilestoneItemProps {
  projectId: string;
  milestone: Milestone;
  onEdit: (milestone: Milestone) => void;
  canUpdate: boolean;
}

export function MilestoneItem({ projectId, milestone, onEdit, canUpdate }: MilestoneItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMilestone = useProjectStore((state) => state.deleteMilestone);
  const toggleMilestoneComplete = useProjectStore((state) => state.toggleMilestoneComplete);

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete milestone "${milestone.name}"?`)) {
      setIsDeleting(true);
      deleteMilestone(projectId, milestone.id);
    }
  };

  const handleToggleComplete = () => {
    toggleMilestoneComplete(projectId, milestone.id);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        milestone.completed ? 'bg-muted/50 opacity-70' : 'bg-card'
      )}
    >
      {/* Color indicator */}
      <div
        className="w-3 h-3 rounded-full mt-1 shrink-0"
        style={{ backgroundColor: milestone.color }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <Checkbox
            checked={milestone.completed}
            onCheckedChange={handleToggleComplete}
            disabled={!canUpdate}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                'font-medium text-sm',
                milestone.completed && 'line-through text-muted-foreground'
              )}
            >
              {milestone.name}
            </h4>
            {milestone.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{milestone.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">
            {format(new Date(milestone.date), 'MMM d, yyyy')}
          </span>
          {milestone.completed && milestone.completedAt && (
            <span className="text-xs text-muted-foreground">
              • Completed {format(new Date(milestone.completedAt), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {canUpdate && (
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(milestone)}
            disabled={isDeleting}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
