import { useState } from 'react';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useComponentStore } from '@/stores/componentStore';
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
import type { EquipmentType, EquipmentStatus } from '@/lib/types/equipment';
import {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_TYPE_ORDER,
  EQUIPMENT_STATUS_LABELS,
} from '@/lib/types/equipment';

interface CreateEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateEquipmentDialog({
  open,
  onOpenChange,
  projectId,
}: CreateEquipmentDialogProps) {
  const createEquipment = useEquipmentStore((state) => state.createEquipment);
  const components = useComponentStore((state) => state.components);

  const [formData, setFormData] = useState({
    type: 'module' as EquipmentType,
    name: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    quantity: 1,
    status: 'operational' as EquipmentStatus,
    warrantyExpiration: '',
    warrantyProvider: '',
    commissionedDate: '',
    location: '',
    notes: '',
    componentId: '',
  });

  // Filter components by type
  const matchingComponents = components.filter((c) => {
    if (formData.type === 'module') return c.type === 'module';
    if (formData.type === 'inverter') return c.type === 'inverter';
    return false;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return;

    createEquipment({
      projectId,
      type: formData.type,
      name: formData.name.trim(),
      manufacturer: formData.manufacturer.trim() || undefined,
      model: formData.model.trim() || undefined,
      serialNumber: formData.serialNumber.trim() || undefined,
      quantity: formData.quantity,
      status: formData.status,
      warrantyExpiration: formData.warrantyExpiration || undefined,
      warrantyProvider: formData.warrantyProvider.trim() || undefined,
      commissionedDate: formData.commissionedDate || undefined,
      location: formData.location.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      componentId: formData.componentId || undefined,
    });

    // Reset form
    setFormData({
      type: 'module',
      name: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      quantity: 1,
      status: 'operational',
      warrantyExpiration: '',
      warrantyProvider: '',
      commissionedDate: '',
      location: '',
      notes: '',
      componentId: '',
    });

    onOpenChange(false);
  };

  const handleComponentSelect = (componentId: string) => {
    setFormData((prev) => ({ ...prev, componentId }));

    // Auto-fill manufacturer and model from component
    const component = components.find((c) => c.id === componentId);
    if (component) {
      setFormData((prev) => ({
        ...prev,
        componentId,
        manufacturer: component.manufacturer,
        model: component.model,
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Equipment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Equipment Type</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, type: v as EquipmentType, componentId: '' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPE_ORDER.map((type) => (
                  <SelectItem key={type} value={type}>
                    {EQUIPMENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link to Component Library */}
          {matchingComponents.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Component (optional)</Label>
              <Select
                value={formData.componentId}
                onValueChange={handleComponentSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select from component library" />
                </SelectTrigger>
                <SelectContent>
                  {matchingComponents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.manufacturer} {c.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label>Name / Identifier *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., INV-01, Module Array A"
              required
            />
          </div>

          {/* Manufacturer & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))}
                placeholder="e.g., SMA, Trina"
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="e.g., Sunny Tripower"
              />
            </div>
          </div>

          {/* Serial Number & Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                value={formData.serialNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v as EquipmentStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EQUIPMENT_STATUS_LABELS) as EquipmentStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {EQUIPMENT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warranty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Warranty Expiration</Label>
              <Input
                type="date"
                value={formData.warrantyExpiration}
                onChange={(e) => setFormData((prev) => ({ ...prev, warrantyExpiration: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Warranty Provider</Label>
              <Input
                value={formData.warrantyProvider}
                onChange={(e) => setFormData((prev) => ({ ...prev, warrantyProvider: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Commissioned Date & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Commissioned Date</Label>
              <Input
                type="date"
                value={formData.commissionedDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, commissionedDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Array 1, Building A"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name.trim()}>
              Add Equipment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
