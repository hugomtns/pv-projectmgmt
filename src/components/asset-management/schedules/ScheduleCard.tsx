import { cn } from '@/lib/utils';
import { useMaintenanceStore } from '@/stores/maintenanceStore';
import { useUserStore } from '@/stores/userStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MaintenanceSchedule } from '@/lib/types/maintenance';
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_CATEGORY_COLORS,
  RECURRENCE_LABELS,
} from '@/lib/types/maintenance';
import { MoreHorizontal, Play, Pause, Trash2, CalendarPlus, AlertTriangle } from 'lucide-react';

interface ScheduleCardProps {
  schedule: MaintenanceSchedule;
  onCreateWorkOrder: () => void;
  showDueBadge?: boolean;
}

export function ScheduleCard({
  schedule,
  onCreateWorkOrder,
  showDueBadge = false,
}: ScheduleCardProps) {
  const toggleScheduleActive = useMaintenanceStore((state) => state.toggleScheduleActive);
  const deleteSchedule = useMaintenanceStore((state) => state.deleteSchedule);
  const currentUser = useUserStore((state) => state.currentUser);

  const categoryColor = MAINTENANCE_CATEGORY_COLORS[schedule.category];

  const canEdit =
    currentUser?.roleId === 'role-admin' || currentUser?.id === schedule.creatorId;

  // Calculate days until next due
  let daysUntilDue: number | null = null;
  if (schedule.nextDueDate) {
    const now = new Date();
    const dueDate = new Date(schedule.nextDueDate);
    daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <Card className={cn(!schedule.isActive && 'opacity-60')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Category indicator */}
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-medium shrink-0"
              style={{ backgroundColor: categoryColor }}
            >
              {schedule.name.substring(0, 2).toUpperCase()}
            </div>

            {/* Main info */}
            <div className="min-w-0 flex-1">
              <h3 className="font-medium truncate">{schedule.name}</h3>
              <p className="text-sm text-muted-foreground">
                {MAINTENANCE_CATEGORY_LABELS[schedule.category]} - {RECURRENCE_LABELS[schedule.recurrence]}
              </p>
              {schedule.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {schedule.description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onCreateWorkOrder}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Create Work Order
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleScheduleActive(schedule.id)}>
                  {schedule.isActive ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => deleteSchedule(schedule.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Status row */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
            {schedule.isActive ? 'Active' : 'Inactive'}
          </Badge>

          {schedule.nextDueDate && schedule.isActive && (
            <span className="text-sm text-muted-foreground">
              Next: {new Date(schedule.nextDueDate).toLocaleDateString()}
            </span>
          )}

          {schedule.taskTemplates.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {schedule.taskTemplates.length} tasks
            </span>
          )}
        </div>

        {/* Due soon warning */}
        {showDueBadge && daysUntilDue !== null && daysUntilDue <= 7 && schedule.isActive && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-orange-500/10 rounded text-sm text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {daysUntilDue <= 0 ? 'Overdue!' : `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 text-xs"
              onClick={onCreateWorkOrder}
            >
              Create Work Order
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
