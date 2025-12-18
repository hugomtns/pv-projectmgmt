import { useState } from 'react';
import type { Stage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface StageCardProps {
  stage: Stage;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function StageCard({ stage, index, onEdit, onDelete }: StageCardProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-lg border border-border bg-card overflow-hidden"
      >
        {/* Card header - clickable to expand */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            {/* Drag handle & Stage number */}
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-sm font-semibold shrink-0 cursor-grab active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
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

            {/* Expand icon */}
            <div className="shrink-0">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
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
        </CollapsibleTrigger>

        {/* Collapsible content - task templates */}
        <CollapsibleContent>
          <div className="border-t border-border bg-muted/30 p-4">
            {stage.taskTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No task templates. Click "Edit Stage" to add tasks.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">Task Templates:</p>
                {stage.taskTemplates.map((template, idx) => (
                  <div
                    key={template.id}
                    className="flex items-start gap-3 rounded-md bg-card border border-border p-3"
                  >
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-semibold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{template.title}</div>
                      {template.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
