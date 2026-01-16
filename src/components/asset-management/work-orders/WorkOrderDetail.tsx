import { useState } from 'react';
import { useWorkOrderStore } from '@/stores/workOrderStore';
import { useUserStore } from '@/stores/userStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkOrderItemList } from './WorkOrderItemList';
import { WorkOrderSignaturePanel } from './WorkOrderSignaturePanel';
import type { WorkOrder, WorkOrderStatus } from '@/lib/types/workOrder';
import {
  WORK_ORDER_TYPE_LABELS,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_PRIORITY_COLORS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_COLORS,
} from '@/lib/types/workOrder';
import {
  Trash2,
  Calendar,
  User,
  CheckCircle,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';

interface WorkOrderDetailProps {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkOrderDetail({ workOrder, open, onOpenChange }: WorkOrderDetailProps) {
  const updateWorkOrder = useWorkOrderStore((state) => state.updateWorkOrder);
  const deleteWorkOrder = useWorkOrderStore((state) => state.deleteWorkOrder);
  const completeWorkOrder = useWorkOrderStore((state) => state.completeWorkOrder);
  const calculateCosts = useWorkOrderStore((state) => state.calculateCosts);
  const currentUser = useUserStore((state) => state.currentUser);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [overallNotes, setOverallNotes] = useState('');

  if (!workOrder) return null;

  const canEdit =
    currentUser?.roleId === 'role-admin' || currentUser?.id === workOrder.creatorId;

  const statusColor = WORK_ORDER_STATUS_COLORS[workOrder.status];
  const priorityColor = WORK_ORDER_PRIORITY_COLORS[workOrder.priority];

  // Calculate progress
  const totalItems = workOrder.items.length;
  const completedItems = workOrder.items.filter(
    (item) => item.result === 'completed' || item.result === 'skipped'
  ).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Count required items still pending
  const pendingRequired = workOrder.items.filter(
    (item) => item.required && item.result === 'pending'
  ).length;

  // Count punch list items
  const punchListCount = workOrder.items.filter(
    (item) => item.isPunchListItem && !item.punchListResolvedAt
  ).length;

  // Calculate costs
  const costs = calculateCosts(workOrder.id);

  const handleStatusChange = (status: WorkOrderStatus) => {
    updateWorkOrder(workOrder.id, { status });
  };

  const handleDelete = () => {
    deleteWorkOrder(workOrder.id);
    onOpenChange(false);
  };

  const handleComplete = () => {
    const success = completeWorkOrder(workOrder.id);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleSaveNotes = () => {
    if (overallNotes !== workOrder.overallNotes) {
      updateWorkOrder(workOrder.id, { overallNotes });
    }
  };

  // Initialize notes when work order changes
  if (overallNotes !== workOrder.overallNotes && !overallNotes) {
    setOverallNotes(workOrder.overallNotes || '');
  }

  const canComplete =
    workOrder.status !== 'completed' &&
    workOrder.status !== 'cancelled' &&
    pendingRequired === 0 &&
    workOrder.signatures.length > 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle>{workOrder.title}</SheetTitle>
                <SheetDescription>
                  {WORK_ORDER_TYPE_LABELS[workOrder.type]}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  style={{ borderColor: priorityColor, color: priorityColor }}
                >
                  {WORK_ORDER_PRIORITY_LABELS[workOrder.priority]}
                </Badge>
                <Badge
                  variant="outline"
                  style={{ borderColor: statusColor, color: statusColor }}
                >
                  {WORK_ORDER_STATUS_LABELS[workOrder.status]}
                </Badge>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Progress */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">{completedItems}/{totalItems} items</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Status Control */}
            {canEdit && workOrder.status !== 'completed' && workOrder.status !== 'cancelled' && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={workOrder.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Scheduled: </span>
                  {new Date(workOrder.scheduledDate).toLocaleDateString()}
                </div>
              </div>

              {workOrder.dueDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Due: </span>
                    {new Date(workOrder.dueDate).toLocaleDateString()}
                  </div>
                </div>
              )}

              {workOrder.assigneeName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{workOrder.assigneeName}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {workOrder.description && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {workOrder.description}
                  </p>
                </div>
              </>
            )}

            {/* Punch List Warning */}
            {punchListCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 rounded text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm">{punchListCount} punch list items require follow-up</span>
              </div>
            )}

            {/* Work Items */}
            <Separator />
            <WorkOrderItemList workOrderId={workOrder.id} items={workOrder.items} />

            {/* Overall Notes */}
            <Separator />
            <div className="space-y-2">
              <Label>Overall Notes</Label>
              <Textarea
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Add notes about this work order..."
                rows={3}
              />
            </div>

            {/* Signatures */}
            <Separator />
            <WorkOrderSignaturePanel workOrderId={workOrder.id} signatures={workOrder.signatures} />

            {/* Cost Summary (for completed orders) */}
            {workOrder.status === 'completed' && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cost Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Labor</span>
                      <p className="font-medium">${costs.laborCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Parts</span>
                      <p className="font-medium">${costs.partsCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total</span>
                      <p className="font-medium">${costs.totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Completion Warning */}
            {workOrder.status !== 'completed' && pendingRequired > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{pendingRequired} required items must be completed before finishing</span>
              </div>
            )}

            {/* Actions */}
            {canEdit && workOrder.status !== 'completed' && (
              <div className="flex gap-2 pt-4">
                {canComplete && (
                  <Button onClick={handleComplete} className="flex-1 gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Complete Work Order
                  </Button>
                )}
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}

            {/* Metadata */}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Created by {workOrder.createdBy}</p>
              <p>Created {new Date(workOrder.createdAt).toLocaleString()}</p>
              {workOrder.completedAt && (
                <p>Completed {new Date(workOrder.completedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Work Order"
        description={`Are you sure you want to delete "${workOrder.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
