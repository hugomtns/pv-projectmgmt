import { useState } from 'react';
import { useInspectionStore } from '@/stores/inspectionStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { InspectionCard } from './InspectionCard';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList } from 'lucide-react';
import type { Inspection } from '@/lib/types';

interface InspectionListProps {
  projectId: string;
}

// Group inspections by status for display
function groupInspections(inspections: Inspection[]) {
  const inProgress = inspections.filter((i) => i.status === 'in_progress');
  const scheduled = inspections.filter((i) => i.status === 'scheduled');
  const completed = inspections.filter((i) => i.status === 'completed');
  const cancelled = inspections.filter((i) => i.status === 'cancelled');

  return { inProgress, scheduled, completed, cancelled };
}

export function InspectionList({ projectId }: InspectionListProps) {
  const [_isDialogOpen, setIsDialogOpen] = useState(false);

  const inspections = useInspectionStore((state) =>
    state.getInspectionsByProject(projectId)
  );

  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  // Permission check for creating inspections
  const canCreate = currentUser
    ? resolvePermissions(currentUser, 'inspections', undefined, permissionOverrides, roles)
        .create
    : false;

  const grouped = groupInspections(inspections);
  const hasInspections = inspections.length > 0;

  // Calculate summary stats
  const punchListCount = inspections.reduce((count, inspection) => {
    return count + inspection.items.filter(
      (item) => item.isPunchListItem && !item.punchListResolvedAt
    ).length;
  }, 0);

  const handleInspectionClick = (_inspection: Inspection) => {
    // TODO: Navigate to inspection detail view in Story 4
    console.log('Inspection clicked - detail view coming in Story 4');
  };

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium">
            Inspections {hasInspections && `(${inspections.length})`}
          </h3>
          {punchListCount > 0 && (
            <span className="text-xs text-orange-600 dark:text-orange-400">
              {punchListCount} open punch list item{punchListCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {canCreate && (
          <Button
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            New Inspection
          </Button>
        )}
      </div>

      {/* Empty state */}
      {!hasInspections && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No inspections yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create an inspection to track site visits and quality checks.
          </p>
          {canCreate && (
            <Button onClick={() => setIsDialogOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Create First Inspection
            </Button>
          )}
        </div>
      )}

      {/* Inspection groups */}
      {hasInspections && (
        <div className="space-y-6">
          {/* In Progress */}
          {grouped.inProgress.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                In Progress ({grouped.inProgress.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped.inProgress.map((inspection) => (
                  <InspectionCard
                    key={inspection.id}
                    inspection={inspection}
                    onClick={() => handleInspectionClick(inspection)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Scheduled */}
          {grouped.scheduled.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Scheduled ({grouped.scheduled.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped.scheduled.map((inspection) => (
                  <InspectionCard
                    key={inspection.id}
                    inspection={inspection}
                    onClick={() => handleInspectionClick(inspection)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {grouped.completed.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Completed ({grouped.completed.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped.completed.map((inspection) => (
                  <InspectionCard
                    key={inspection.id}
                    inspection={inspection}
                    onClick={() => handleInspectionClick(inspection)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cancelled (collapsed by default, show only if there are any) */}
          {grouped.cancelled.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Cancelled ({grouped.cancelled.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped.cancelled.map((inspection) => (
                  <InspectionCard
                    key={inspection.id}
                    inspection={inspection}
                    onClick={() => handleInspectionClick(inspection)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Inspection Dialog - will be added in Story 3 */}
      {/* <CreateInspectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
      /> */}
    </div>
  );
}
