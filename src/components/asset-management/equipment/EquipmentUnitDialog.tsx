import { useState, useEffect } from 'react';
import { useEquipmentUnitStore } from '@/stores/equipmentUnitStore';
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
import type { EquipmentUnit, UnitStatus } from '@/lib/types/equipment';
import { UNIT_STATUS_LABELS } from '@/lib/types/equipment';

interface EquipmentUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  unit?: EquipmentUnit | null; // If provided, editing mode
}

export function EquipmentUnitDialog({
  open,
  onOpenChange,
  equipmentId,
  unit,
}: EquipmentUnitDialogProps) {
  const createUnit = useEquipmentUnitStore((state) => state.createUnit);
  const updateUnit = useEquipmentUnitStore((state) => state.updateUnit);

  const [formData, setFormData] = useState({
    serialNumber: '',
    assetTag: '',
    status: 'operational' as UnitStatus,
    installedDate: '',
    warrantyExpiration: '',
    location: '',
    notes: '',
  });

  // Reset form when dialog opens/closes or unit changes
  useEffect(() => {
    if (open && unit) {
      // Edit mode - populate form
      setFormData({
        serialNumber: unit.serialNumber || '',
        assetTag: unit.assetTag || '',
        status: unit.status,
        installedDate: unit.installedDate || '',
        warrantyExpiration: unit.warrantyExpiration || '',
        location: unit.location || '',
        notes: unit.notes || '',
      });
    } else if (open) {
      // Create mode - reset form
      setFormData({
        serialNumber: '',
        assetTag: '',
        status: 'operational',
        installedDate: '',
        warrantyExpiration: '',
        location: '',
        notes: '',
      });
    }
  }, [open, unit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (unit) {
      // Update existing unit
      updateUnit(unit.id, {
        serialNumber: formData.serialNumber.trim() || undefined,
        assetTag: formData.assetTag.trim() || undefined,
        status: formData.status,
        installedDate: formData.installedDate || undefined,
        warrantyExpiration: formData.warrantyExpiration || undefined,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
    } else {
      // Create new unit
      createUnit({
        equipmentId,
        serialNumber: formData.serialNumber.trim() || undefined,
        assetTag: formData.assetTag.trim() || undefined,
        status: formData.status,
        installedDate: formData.installedDate || undefined,
        warrantyExpiration: formData.warrantyExpiration || undefined,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
    }

    onOpenChange(false);
  };

  const isEditing = !!unit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Serial Number & Asset Tag */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                value={formData.serialNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))}
                placeholder="e.g., SN-2024-00123"
              />
            </div>
            <div className="space-y-2">
              <Label>Asset Tag</Label>
              <Input
                value={formData.assetTag}
                onChange={(e) => setFormData((prev) => ({ ...prev, assetTag: e.target.value }))}
                placeholder="e.g., INV-01-A"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v as UnitStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(UNIT_STATUS_LABELS) as UnitStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {UNIT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Installed Date</Label>
              <Input
                type="date"
                value={formData.installedDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, installedDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Warranty Expiration</Label>
              <Input
                type="date"
                value={formData.warrantyExpiration}
                onChange={(e) => setFormData((prev) => ({ ...prev, warrantyExpiration: e.target.value }))}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Row 12, Position 45"
            />
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
            <Button type="submit">
              {isEditing ? 'Save Changes' : 'Add Unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
