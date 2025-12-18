import type { Stage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StageCardProps {
  stage: Stage;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function StageCard({ stage, index, onEdit, onDelete }: StageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
    >
      {/* Drag handle & Stage number */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-sm font-semibold shrink-0 cursor-grab active:cursor-grabbing"
      >
        {index + 1}
      </div>

      {/* Stage color indicator */}
      <div
        className="h-10 w-2 rounded-full shrink-0"
        style={{ backgroundColor: stage.color }}
      />

      {/* Stage info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{stage.name}</div>
        <div className="text-sm text-muted-foreground">
          {stage.taskTemplates.length} task template{stage.taskTemplates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            •••
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            Edit Stage
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            Delete Stage
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
