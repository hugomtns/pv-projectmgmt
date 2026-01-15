import type { NtpChecklistItem as NtpChecklistItemType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Circle,
  Clock,
  Paperclip,
  ChevronRight,
  CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';

interface NtpChecklistItemProps {
  item: NtpChecklistItemType;
  onToggleStatus: () => void;
  onClick: () => void;
  canModify?: boolean;
}

export function NtpChecklistItem({ item, onToggleStatus, onClick, canModify = false }: NtpChecklistItemProps) {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = () => {
    switch (item.status) {
      case 'complete':
        return 'Complete';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors',
        item.status === 'complete' && 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
      )}
      onClick={onClick}
    >
      {canModify ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus();
          }}
        >
          {getStatusIcon()}
        </Button>
      ) : (
        <div className="h-8 w-8 shrink-0 flex items-center justify-center">
          {getStatusIcon()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium truncate',
              item.status === 'complete' && 'line-through text-muted-foreground'
            )}
          >
            {item.title}
          </span>
          {item.required && (
            <Badge variant="outline" className="shrink-0 text-xs">
              Required
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {item.description}
          </p>
        )}
        {item.completedAt && item.completedBy && (
          <p className="text-xs text-muted-foreground mt-1">
            Completed by {item.completedBy} on {new Date(item.completedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.targetDate ? (
          <Badge
            variant="outline"
            className={cn(
              'gap-1',
              item.status !== 'complete' && isPast(new Date(item.targetDate)) && !isToday(new Date(item.targetDate)) && 'text-red-500 border-red-200 dark:border-red-800',
              item.status !== 'complete' && isToday(new Date(item.targetDate)) && 'text-orange-500 border-orange-200 dark:border-orange-800'
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {format(new Date(item.targetDate), 'MMM d')}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            No Date
          </Badge>
        )}
        {item.attachmentIds.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Paperclip className="h-3 w-3" />
            {item.attachmentIds.length}
          </Badge>
        )}
        <Badge
          variant={
            item.status === 'complete'
              ? 'default'
              : item.status === 'in_progress'
              ? 'secondary'
              : 'outline'
          }
          className={cn(
            item.status === 'complete' && 'bg-green-500 hover:bg-green-600'
          )}
        >
          {getStatusLabel()}
        </Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
