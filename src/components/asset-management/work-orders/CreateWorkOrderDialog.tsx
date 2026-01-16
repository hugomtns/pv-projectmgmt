import { useState, useMemo } from 'react';
import { useWorkOrderStore } from '@/stores/workOrderStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useUserStore } from '@/stores/userStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserSelectField } from '@/components/users/UserSelectField';
import type { WorkOrderType, WorkOrderPriority } from '@/lib/types/workOrder';
import {
  WORK_ORDER_TYPE_LABELS,
  WORK_ORDER_PRIORITY_LABELS,
} from '@/lib/types/workOrder';
import { EQUIPMENT_TYPE_LABELS } from '@/lib/types/equipment';

interface CreateWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
  projectId,
}: CreateWorkOrderDialogProps) {
  const createWorkOrder = useWorkOrderStore((state) => state.createWorkOrder);
  const allEquipment = useEquipmentStore((state) => state.equipment);
  const equipment = useMemo(
    () => allEquipment.filter((e) => e.projectId === projectId),
    [allEquipment, projectId]
  );
  const users = useUserStore((state) => state.users);

  const [formData, setFormData] = useState({
    type: 'corrective' as WorkOrderType,
    priority: 'medium' as WorkOrderPriority,
    title: '',
    description: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    assigneeId: '',
    equipmentId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) return;

    const assignee = users.find((u) => u.id === formData.assigneeId);

    createWorkOrder({
      projectId,
      type: formData.type,
      priority: formData.priority,
      title: formData.title.trim(),
      description: formData.description.trim(),
      scheduledDate: formData.scheduledDate,
      dueDate: formData.dueDate || undefined,
      assigneeId: formData.assigneeId || undefined,
      assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : undefined,
      equipmentId: formData.equipmentId || undefined,
    });

    // Reset form
    setFormData({
      type: 'corrective',
      priority: 'medium',
      title: '',
      description: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      assigneeId: '',
      equipmentId: '',
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Work Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, type: v as WorkOrderType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WORK_ORDER_TYPE_LABELS) as WorkOrderType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {WORK_ORDER_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, priority: v as WorkOrderPriority }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WORK_ORDER_PRIORITY_LABELS) as WorkOrderPriority[]).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {WORK_ORDER_PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Replace failed inverter"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the work to be done..."
              rows={3}
            />
          </div>

          {/* Scheduled Date & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, scheduledDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>Assignee</Label>
            <UserSelectField
              value={formData.assigneeId}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, assigneeId: v }))}
              placeholder="Select assignee (optional)"
            />
          </div>

          {/* Related Equipment */}
          {equipment.length > 0 && (
            <div className="space-y-2">
              <Label>Related Equipment (optional)</Label>
              <Select
                value={formData.equipmentId}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, equipmentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipment.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({EQUIPMENT_TYPE_LABELS[e.type]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title.trim()}>
              Create Work Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
