import { useState, useMemo } from 'react';
import { useWorkOrderStore } from '@/stores/workOrderStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { WorkOrderCard } from './WorkOrderCard';
import { CreateWorkOrderDialog } from './CreateWorkOrderDialog';
import { WorkOrderDetail } from './WorkOrderDetail';
import { WorkOrderPunchList } from './WorkOrderPunchList';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Wrench, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import type { WorkOrder, WorkOrderItem } from '@/lib/types/workOrder';

interface WorkOrderListProps {
  projectId: string;
}

export function WorkOrderList({ projectId }: WorkOrderListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'punchlist'>('all');

  // Get work orders for this project
  const allWorkOrders = useWorkOrderStore((state) => state.workOrders);
  const workOrders = useMemo(
    () => allWorkOrders.filter((wo) => wo.projectId === projectId),
    [allWorkOrders, projectId]
  );

  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  const canCreate = currentUser
    ? resolvePermissions(currentUser, 'work_orders', undefined, permissionOverrides, roles).create
    : false;

  const hasWorkOrders = workOrders.length > 0;

  // Group work orders
  const activeWorkOrders = workOrders.filter((wo) =>
    ['scheduled', 'in_progress', 'on_hold'].includes(wo.status)
  );
  const completedWorkOrders = workOrders.filter((wo) => wo.status === 'completed');
  const draftWorkOrders = workOrders.filter((wo) => wo.status === 'draft');
  const cancelledWorkOrders = workOrders.filter((wo) => wo.status === 'cancelled');

  // Count punch list items
  const punchListCount = workOrders.reduce((count, wo) => {
    return count + wo.items.filter((item) => item.isPunchListItem && !item.punchListResolvedAt).length;
  }, 0);

  // Get overdue work orders
  const overdueCount = workOrders.filter((wo) => {
    if (['completed', 'cancelled'].includes(wo.status)) return false;
    if (!wo.dueDate) return false;
    return new Date(wo.dueDate) < new Date();
  }).length;

  const selectedWorkOrder = selectedWorkOrderId
    ? workOrders.find((wo) => wo.id === selectedWorkOrderId) || null
    : null;

  const handlePunchListItemClick = (workOrder: WorkOrder, _item: WorkOrderItem) => {
    setSelectedWorkOrderId(workOrder.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'active' | 'punchlist')}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Wrench className="h-4 w-4" />
              All {hasWorkOrders && `(${workOrders.length})`}
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              <Clock className="h-4 w-4" />
              Active
              {overdueCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {overdueCount}
                </span>
              )}
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
        {canCreate && activeTab !== 'punchlist' && (
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            New Work Order
          </Button>
        )}
      </div>

      {/* All Tab */}
      {activeTab === 'all' && (
        <>
          {!hasWorkOrders && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No work orders</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create work orders to track maintenance activities.
              </p>
              {canCreate && (
                <Button onClick={() => setIsDialogOpen(true)} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Create First Work Order
                </Button>
              )}
            </div>
          )}

          {hasWorkOrders && (
            <div className="space-y-6">
              {/* Draft */}
              {draftWorkOrders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Draft ({draftWorkOrders.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {draftWorkOrders.map((wo) => (
                      <WorkOrderCard
                        key={wo.id}
                        workOrder={wo}
                        onClick={() => setSelectedWorkOrderId(wo.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Active */}
              {activeWorkOrders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Active ({activeWorkOrders.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeWorkOrders.map((wo) => (
                      <WorkOrderCard
                        key={wo.id}
                        workOrder={wo}
                        onClick={() => setSelectedWorkOrderId(wo.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {completedWorkOrders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Completed ({completedWorkOrders.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completedWorkOrders.map((wo) => (
                      <WorkOrderCard
                        key={wo.id}
                        workOrder={wo}
                        onClick={() => setSelectedWorkOrderId(wo.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Cancelled */}
              {cancelledWorkOrders.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Cancelled ({cancelledWorkOrders.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cancelledWorkOrders.map((wo) => (
                      <WorkOrderCard
                        key={wo.id}
                        workOrder={wo}
                        onClick={() => setSelectedWorkOrderId(wo.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Active Tab */}
      {activeTab === 'active' && (
        <>
          {activeWorkOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No active work orders</h3>
              <p className="text-sm text-muted-foreground">
                Scheduled, in-progress, and on-hold work orders appear here.
              </p>
            </div>
          )}

          {activeWorkOrders.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeWorkOrders.map((wo) => (
                <WorkOrderCard
                  key={wo.id}
                  workOrder={wo}
                  onClick={() => setSelectedWorkOrderId(wo.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Punch List Tab */}
      {activeTab === 'punchlist' && (
        <WorkOrderPunchList projectId={projectId} onItemClick={handlePunchListItemClick} />
      )}

      <CreateWorkOrderDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
      />

      <WorkOrderDetail
        workOrder={selectedWorkOrder}
        open={!!selectedWorkOrderId}
        onOpenChange={(open) => !open && setSelectedWorkOrderId(null)}
      />
    </div>
  );
}
