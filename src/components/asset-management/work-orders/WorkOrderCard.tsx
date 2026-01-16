import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { WorkOrder } from '@/lib/types/workOrder';
import {
  WORK_ORDER_TYPE_LABELS,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_PRIORITY_COLORS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_COLORS,
} from '@/lib/types/workOrder';
import { AlertTriangle, Calendar, User } from 'lucide-react';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onClick?: () => void;
}

export function WorkOrderCard({ workOrder, onClick }: WorkOrderCardProps) {
  const statusColor = WORK_ORDER_STATUS_COLORS[workOrder.status];
  const priorityColor = WORK_ORDER_PRIORITY_COLORS[workOrder.priority];

  // Calculate progress
  const totalItems = workOrder.items.length;
  const completedItems = workOrder.items.filter(
    (item) => item.result === 'completed' || item.result === 'skipped'
  ).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Check if overdue
  const isOverdue =
    workOrder.dueDate &&
    !['completed', 'cancelled'].includes(workOrder.status) &&
    new Date(workOrder.dueDate) < new Date();

  // Count punch list items
  const punchListCount = workOrder.items.filter(
    (item) => item.isPunchListItem && !item.punchListResolvedAt
  ).length;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        isOverdue && 'border-red-500/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                style={{ borderColor: priorityColor, color: priorityColor }}
                className="text-xs"
              >
                {WORK_ORDER_PRIORITY_LABELS[workOrder.priority]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {WORK_ORDER_TYPE_LABELS[workOrder.type]}
              </span>
            </div>
            <h3 className="font-medium truncate">{workOrder.title}</h3>
            {workOrder.description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {workOrder.description}
              </p>
            )}
          </div>

          <Badge
            variant="outline"
            style={{ borderColor: statusColor, color: statusColor }}
          >
            {WORK_ORDER_STATUS_LABELS[workOrder.status]}
          </Badge>
        </div>

        {/* Progress bar */}
        {totalItems > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{completedItems}/{totalItems} items</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Info row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(workOrder.scheduledDate).toLocaleDateString()}</span>
          </div>

          {workOrder.assigneeName && (
            <div className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{workOrder.assigneeName}</span>
            </div>
          )}

          {punchListCount > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{punchListCount} punch list</span>
            </div>
          )}
        </div>

        {/* Overdue warning */}
        {isOverdue && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-red-500/10 rounded text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Overdue - was due {new Date(workOrder.dueDate!).toLocaleDateString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
