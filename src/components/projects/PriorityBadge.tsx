import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Priority } from '@/lib/types';

interface PriorityBadgeProps {
  priority: Priority;
  onChange: (priority: Priority) => void;
}

export function PriorityBadge({ priority, onChange }: PriorityBadgeProps) {
  const priorityOptions: Priority[] = [0, 1, 2, 3, 4];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:opacity-80"
          style={{
            backgroundColor: `${PRIORITY_COLORS[priority]}20`,
            color: PRIORITY_COLORS[priority],
          }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[priority] }} />
          {PRIORITY_LABELS[priority]}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {priorityOptions.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => onChange(p)}
            className="flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
            <span>{PRIORITY_LABELS[p]}</span>
            <span className="ml-auto text-xs text-muted-foreground">{p}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
