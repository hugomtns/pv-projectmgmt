import { useState } from 'react';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useComponentStore } from '@/stores/componentStore';
import { useUserStore } from '@/stores/userStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Equipment, EquipmentStatus } from '@/lib/types/equipment';
import {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_COLORS,
} from '@/lib/types/equipment';
import { Trash2, Edit2, Save, X, ExternalLink } from 'lucide-react';

interface EquipmentDetailProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentDetail({ equipment, open, onOpenChange }: EquipmentDetailProps) {
  const updateEquipment = useEquipmentStore((state) => state.updateEquipment);
  const deleteEquipment = useEquipmentStore((state) => state.deleteEquipment);
  const components = useComponentStore((state) => state.components);
  const currentUser = useUserStore((state) => state.currentUser);

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Partial<Equipment>>({});

  if (!equipment) return null;

  const linkedComponent = equipment.componentId
    ? components.find((c) => c.id === equipment.componentId)
    : null;

  const canEdit =
    currentUser?.roleId === 'role-admin' || currentUser?.id === equipment.creatorId;

  const handleStartEdit = () => {
    setEditData({
      name: equipment.name,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      quantity: equipment.quantity,
      status: equipment.status,
      warrantyExpiration: equipment.warrantyExpiration,
      warrantyProvider: equipment.warrantyProvider,
      commissionedDate: equipment.commissionedDate,
      location: equipment.location,
      notes: equipment.notes,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateEquipment(equipment.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({});
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteEquipment(equipment.id);
    onOpenChange(false);
  };

  const statusColor = EQUIPMENT_STATUS_COLORS[equipment.status];

  // Calculate warranty status
  let warrantyStatus: 'active' | 'expiring' | 'expired' | 'none' = 'none';
  let warrantyDaysRemaining: number | null = null;

  if (equipment.warrantyExpiration) {
    const now = new Date();
    const expDate = new Date(equipment.warrantyExpiration);
    warrantyDaysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (warrantyDaysRemaining < 0) {
      warrantyStatus = 'expired';
    } else if (warrantyDaysRemaining <= 90) {
      warrantyStatus = 'expiring';
    } else {
      warrantyStatus = 'active';
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle>{equipment.name}</SheetTitle>
                <SheetDescription>
                  {EQUIPMENT_TYPE_LABELS[equipment.type]}
                </SheetDescription>
              </div>
              <Badge
                variant="outline"
                className="mr-6"
                style={{
                  borderColor: statusColor,
                  color: statusColor,
                }}
              >
                {EQUIPMENT_STATUS_LABELS[equipment.status]}
              </Badge>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Edit Mode */}
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editData.name || ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input
                      value={editData.manufacturer || ''}
                      onChange={(e) => setEditData((prev) => ({ ...prev, manufacturer: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={editData.model || ''}
                      onChange={(e) => setEditData((prev) => ({ ...prev, model: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Serial Number</Label>
                    <Input
                      value={editData.serialNumber || ''}
                      onChange={(e) => setEditData((prev) => ({ ...prev, serialNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editData.quantity || 1}
                      onChange={(e) => setEditData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(v) => setEditData((prev) => ({ ...prev, status: v as EquipmentStatus }))}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warranty Expiration</Label>
                    <Input
                      type="date"
                      value={editData.warrantyExpiration || ''}
                      onChange={(e) => setEditData((prev) => ({ ...prev, warrantyExpiration: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Warranty Provider</Label>
                    <Input
                      value={editData.warrantyProvider || ''}
                      onChange={(e) => setEditData((prev) => ({ ...prev, warrantyProvider: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Commissioned Date</Label>
                    <Input
                      type="date"
                      value={editData.commissionedDate || ''}
                      onChange={(e) => setEditData((prev) => ({ ...prev, commissionedDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={editData.location || ''}
                      onChange={(e) => setEditData((prev) => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1 gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* View Mode */}
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {equipment.manufacturer && (
                      <div>
                        <span className="text-muted-foreground">Manufacturer</span>
                        <p className="font-medium">{equipment.manufacturer}</p>
                      </div>
                    )}
                    {equipment.model && (
                      <div>
                        <span className="text-muted-foreground">Model</span>
                        <p className="font-medium">{equipment.model}</p>
                      </div>
                    )}
                    {equipment.serialNumber && (
                      <div>
                        <span className="text-muted-foreground">Serial Number</span>
                        <p className="font-medium">{equipment.serialNumber}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Quantity</span>
                      <p className="font-medium">{equipment.quantity}</p>
                    </div>
                  </div>

                  {/* Linked Component */}
                  {linkedComponent && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          Linked Component
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </h4>
                        <p className="text-sm">
                          {linkedComponent.manufacturer} {linkedComponent.model}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Warranty */}
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Warranty</h4>
                    {warrantyStatus === 'none' ? (
                      <p className="text-sm text-muted-foreground">No warranty information</p>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              warrantyStatus === 'active'
                                ? 'default'
                                : warrantyStatus === 'expiring'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {warrantyStatus === 'active' && 'Active'}
                            {warrantyStatus === 'expiring' && `Expires in ${warrantyDaysRemaining} days`}
                            {warrantyStatus === 'expired' && 'Expired'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-muted-foreground">Expiration</span>
                            <p>{new Date(equipment.warrantyExpiration!).toLocaleDateString()}</p>
                          </div>
                          {equipment.warrantyProvider && (
                            <div>
                              <span className="text-muted-foreground">Provider</span>
                              <p>{equipment.warrantyProvider}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dates & Location */}
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {equipment.commissionedDate && (
                      <div>
                        <span className="text-muted-foreground">Commissioned</span>
                        <p className="font-medium">
                          {new Date(equipment.commissionedDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {equipment.location && (
                      <div>
                        <span className="text-muted-foreground">Location</span>
                        <p className="font-medium">{equipment.location}</p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {equipment.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {equipment.notes}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Metadata */}
                  <Separator />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Created by {equipment.createdBy}</p>
                    <p>Created {new Date(equipment.createdAt).toLocaleString()}</p>
                    <p>Updated {new Date(equipment.updatedAt).toLocaleString()}</p>
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleStartEdit} variant="outline" className="flex-1 gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
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
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Equipment"
        description={`Are you sure you want to delete "${equipment.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
