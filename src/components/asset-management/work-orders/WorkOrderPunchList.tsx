import { useMemo } from 'react';
import { useWorkOrderStore } from '@/stores/workOrderStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { WorkOrder, WorkOrderItem } from '@/lib/types/workOrder';
import {
  WORK_ORDER_TYPE_LABELS,
  WORK_ORDER_STATUS_LABELS,
  MAINTENANCE_CATEGORY_LABELS,
} from '@/lib/types';
import { AlertTriangle, Check, ChevronRight } from 'lucide-react';

interface WorkOrderPunchListProps {
  projectId: string;
  onItemClick: (workOrder: WorkOrder, item: WorkOrderItem) => void;
}

export function WorkOrderPunchList({ projectId, onItemClick }: WorkOrderPunchListProps) {
  const workOrders = useWorkOrderStore((state) => state.workOrders);
  const markPunchListResolved = useWorkOrderStore((state) => state.markPunchListResolved);

  // Compute punch list items in component to avoid infinite loop
  const punchListItems = useMemo(() => {
    const items: Array<{ workOrder: WorkOrder; item: WorkOrderItem }> = [];

    workOrders
      .filter((wo) => wo.projectId === projectId)
      .forEach((workOrder) => {
        workOrder.items
          .filter((item) => item.isPunchListItem && !item.punchListResolvedAt)
          .forEach((item) => {
            items.push({ workOrder, item });
          });
      });

    return items;
  }, [workOrders, projectId]);

  const handleResolve = (workOrderId: string, itemId: string) => {
    markPunchListResolved(workOrderId, itemId);
  };

  if (punchListItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
        <Check className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium mb-1">No punch list items</h3>
        <p className="text-sm text-muted-foreground">
          All work order items have been resolved.
        </p>
      </div>
    );
  }

  // Group by work order
  const groupedByWorkOrder = punchListItems.reduce((acc, { workOrder, item }) => {
    if (!acc[workOrder.id]) {
      acc[workOrder.id] = { workOrder, items: [] };
    }
    acc[workOrder.id].items.push(item);
    return acc;
  }, {} as Record<string, { workOrder: WorkOrder; items: WorkOrderItem[] }>);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-orange-600">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium">{punchListItems.length} items require follow-up</span>
      </div>

      {Object.values(groupedByWorkOrder).map(({ workOrder, items }) => (
        <Card key={workOrder.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="font-medium">{workOrder.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {WORK_ORDER_TYPE_LABELS[workOrder.type]} - {WORK_ORDER_STATUS_LABELS[workOrder.status]}
                </p>
              </div>
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                {items.length} items
              </Badge>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {MAINTENANCE_CATEGORY_LABELS[item.category as keyof typeof MAINTENANCE_CATEGORY_LABELS] || item.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(workOrder.id, item.id)}
                      className="h-8 gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onItemClick(workOrder, item)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
