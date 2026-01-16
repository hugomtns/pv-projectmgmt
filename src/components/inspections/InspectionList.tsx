import { useState, useMemo } from 'react';
import { useInspectionStore } from '@/stores/inspectionStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { InspectionCard } from './InspectionCard';
import { CreateInspectionDialog } from './CreateInspectionDialog';
import { InspectionDetail } from './InspectionDetail';
import { PunchListView } from './PunchListView';
import { InspectionItemDialog } from './InspectionItemDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ClipboardList, AlertTriangle } from 'lucide-react';
import type { Inspection, InspectionItem } from '@/lib/types/inspection';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inspections' | 'punchlist'>('inspections');
  const [selectedPunchListItem, setSelectedPunchListItem] = useState<{
    inspection: Inspection;
    item: InspectionItem;
  } | null>(null);

  // Get all inspections and filter in useMemo to avoid infinite re-renders
  const allInspections = useInspectionStore((state) => state.inspections);
  const inspections = useMemo(
    () => allInspections.filter((i) => i.projectId === projectId),
    [allInspections, projectId]
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

  // Get the selected inspection from filtered list (ensures reactivity)
  const selectedInspection = selectedInspectionId
    ? inspections.find((i) => i.id === selectedInspectionId) || null
    : null;

  const handleInspectionClick = (inspection: Inspection) => {
    setSelectedInspectionId(inspection.id);
  };

  const handlePunchListItemClick = (inspection: Inspection, item: InspectionItem) => {
    setSelectedPunchListItem({ inspection, item });
  };

  return (
    <div className="space-y-6">
      {/* Header with tabs and actions */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'inspections' | 'punchlist')}>
          <TabsList>
            <TabsTrigger value="inspections" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Inspections {hasInspections && `(${inspections.length})`}
            </TabsTrigger>
            <TabsTrigger value="punchlist" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Punch List
              {punchListCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {punchListCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {canCreate && activeTab === 'inspections' && (
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

      {/* Inspections Tab Content */}
      {activeTab === 'inspections' && (
        <>
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
        </>
      )}

      {/* Punch List Tab Content */}
      {activeTab === 'punchlist' && (
        <PunchListView
          projectId={projectId}
          onItemClick={handlePunchListItemClick}
        />
      )}

      <CreateInspectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
      />

      <InspectionDetail
        inspection={selectedInspection}
        open={!!selectedInspectionId}
        onOpenChange={(open) => !open && setSelectedInspectionId(null)}
      />

      {/* Punch list item dialog */}
      {selectedPunchListItem && (
        <InspectionItemDialog
          inspectionId={selectedPunchListItem.inspection.id}
          item={selectedPunchListItem.item}
          open={!!selectedPunchListItem}
          onOpenChange={(open) => !open && setSelectedPunchListItem(null)}
        />
      )}
    </div>
  );
}
