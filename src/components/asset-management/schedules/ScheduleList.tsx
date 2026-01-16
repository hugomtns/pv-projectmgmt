import { useState, useMemo } from 'react';
import { useMaintenanceStore } from '@/stores/maintenanceStore';
import { useWorkOrderStore } from '@/stores/workOrderStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { ScheduleCard } from './ScheduleCard';
import { CreateScheduleDialog } from './CreateScheduleDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CalendarClock, Calendar, AlertCircle } from 'lucide-react';

interface ScheduleListProps {
  projectId: string;
}

export function ScheduleList({ projectId }: ScheduleListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedules' | 'due'>('schedules');

  // Get schedules
  const allSchedules = useMaintenanceStore((state) => state.schedules);
  const schedules = useMemo(
    () => allSchedules.filter((s) => s.projectId === projectId),
    [allSchedules, projectId]
  );

  // Get due schedules (within 7 days) - computed in component to avoid infinite loop
  const dueSchedules = useMemo(() => {
    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() + 7);

    return schedules.filter((s) => {
      if (!s.isActive || !s.nextDueDate) return false;
      const dueDate = new Date(s.nextDueDate);
      return dueDate <= thresholdDate && dueDate >= now;
    });
  }, [schedules]);

  // Work order store for creating work orders from schedules
  const createFromSchedule = useWorkOrderStore((state) => state.createFromSchedule);

  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  const canCreate = currentUser
    ? resolvePermissions(currentUser, 'maintenance_schedules', undefined, permissionOverrides, roles).create
    : false;

  const hasSchedules = schedules.length > 0;

  // Group schedules
  const activeSchedules = schedules.filter((s) => s.isActive);
  const inactiveSchedules = schedules.filter((s) => !s.isActive);

  const handleCreateWorkOrder = (scheduleId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (schedule) {
      const today = new Date().toISOString().split('T')[0];
      createFromSchedule(schedule, today);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'schedules' | 'due')}>
          <TabsList>
            <TabsTrigger value="schedules" className="gap-2">
              <CalendarClock className="h-4 w-4" />
              Schedules {hasSchedules && `(${schedules.length})`}
            </TabsTrigger>
            <TabsTrigger value="due" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Due Soon
              {dueSchedules.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {dueSchedules.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {canCreate && activeTab === 'schedules' && (
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            New Schedule
          </Button>
        )}
      </div>

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <>
          {!hasSchedules && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No maintenance schedules</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create schedules to track recurring maintenance tasks.
              </p>
              {canCreate && (
                <Button onClick={() => setIsDialogOpen(true)} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Create First Schedule
                </Button>
              )}
            </div>
          )}

          {hasSchedules && (
            <div className="space-y-6">
              {/* Active Schedules */}
              {activeSchedules.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Active ({activeSchedules.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSchedules.map((schedule) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        onCreateWorkOrder={() => handleCreateWorkOrder(schedule.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive Schedules */}
              {inactiveSchedules.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Inactive ({inactiveSchedules.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inactiveSchedules.map((schedule) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        onCreateWorkOrder={() => handleCreateWorkOrder(schedule.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Due Soon Tab */}
      {activeTab === 'due' && (
        <>
          {dueSchedules.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No maintenance due</h3>
              <p className="text-sm text-muted-foreground">
                Schedules with maintenance due within 7 days will appear here.
              </p>
            </div>
          )}

          {dueSchedules.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dueSchedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  onCreateWorkOrder={() => handleCreateWorkOrder(schedule.id)}
                  showDueBadge
                />
              ))}
            </div>
          )}
        </>
      )}

      <CreateScheduleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
      />
    </div>
  );
}
