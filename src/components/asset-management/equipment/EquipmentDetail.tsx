import { useState, useMemo } from 'react';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useEquipmentUnitStore } from '@/stores/equipmentUnitStore';
import { useComponentStore } from '@/stores/componentStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { EquipmentUnitDialog } from './EquipmentUnitDialog';
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
import type { Equipment, EquipmentStatus, EquipmentUnit, TrackingMode } from '@/lib/types/equipment';
import {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_COLORS,
  UNIT_STATUS_LABELS,
  UNIT_STATUS_COLORS,
  TRACKING_MODE_LABELS,
} from '@/lib/types/equipment';
import { Trash2, Edit2, Save, X, ExternalLink, Plus, Package } from 'lucide-react';

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
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  // Units
  const allUnits = useEquipmentUnitStore((state) => state.units);
  const deleteUnit = useEquipmentUnitStore((state) => state.deleteUnit);
  const getUnitStats = useEquipmentUnitStore((state) => state.getUnitStats);

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Partial<Equipment>>({});
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<EquipmentUnit | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<EquipmentUnit | null>(null);

  // Get units for this equipment
  const units = useMemo(
    () => (equipment ? allUnits.filter((u) => u.equipmentId === equipment.id) : []),
    [allUnits, equipment]
  );

  // Get unit stats
  const unitStats = useMemo(
    () => (equipment ? getUnitStats(equipment.id) : null),
    [equipment, getUnitStats, units] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!equipment) return null;

  const linkedComponent = equipment.componentId
    ? components.find((c) => c.id === equipment.componentId)
    : null;

  const canEdit =
    currentUser?.roleId === 'role-admin' || currentUser?.id === equipment.creatorId;

  const canManageUnits = currentUser
    ? resolvePermissions(currentUser, 'equipment_units', undefined, permissionOverrides, roles).create
    : false;

  const handleStartEdit = () => {
    setEditData({
      name: equipment.name,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      quantity: equipment.quantity,
      status: equipment.status,
      trackingMode: equipment.trackingMode,
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

  const handleEditUnit = (unit: EquipmentUnit) => {
    setEditingUnit(unit);
    setIsUnitDialogOpen(true);
  };

  const handleDeleteUnit = () => {
    if (unitToDelete) {
      deleteUnit(unitToDelete.id);
      setUnitToDelete(null);
    }
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

  const isIndividualTracking = equipment.trackingMode === 'individual';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{equipment.name}</SheetTitle>
            <SheetDescription>
              {EQUIPMENT_TYPE_LABELS[equipment.type]}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex items-center gap-2">
            <Badge
              variant="outline"
              style={{
                borderColor: statusColor,
                color: statusColor,
              }}
            >
              {EQUIPMENT_STATUS_LABELS[equipment.status]}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {TRACKING_MODE_LABELS[equipment.trackingMode || 'batch']}
            </Badge>
          </div>

          <div className="mt-4 space-y-6">
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

                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label>Tracking Mode</Label>
                    <Select
                      value={editData.trackingMode}
                      onValueChange={(v) => setEditData((prev) => ({ ...prev, trackingMode: v as TrackingMode }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TRACKING_MODE_LABELS) as TrackingMode[]).map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {TRACKING_MODE_LABELS[mode]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

                  {/* Units Section */}
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">
                        {isIndividualTracking ? 'Tracked Units' : 'Logged Units'}
                      </h4>
                      {canManageUnits && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUnit(null);
                            setIsUnitDialogOpen(true);
                          }}
                          className="h-7 gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Add Unit
                        </Button>
                      )}
                    </div>

                    {/* Unit Stats Summary */}
                    {unitStats && unitStats.total > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {unitStats.total} tracked
                        </Badge>
                        {unitStats.operational > 0 && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                            {unitStats.operational} operational
                          </Badge>
                        )}
                        {unitStats.degraded > 0 && (
                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                            {unitStats.degraded} degraded
                          </Badge>
                        )}
                        {unitStats.offline > 0 && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                            {unitStats.offline} offline
                          </Badge>
                        )}
                        {unitStats.replaced > 0 && (
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                            {unitStats.replaced} replaced
                          </Badge>
                        )}
                      </div>
                    )}

                    {units.length === 0 ? (
                      <div className="text-center py-6 border rounded-lg bg-muted/30">
                        <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {isIndividualTracking
                            ? 'No units tracked yet. Add individual units to track serial numbers and status.'
                            : 'No exceptions logged. Add units to track failures, replacements, or special cases.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {units.map((unit) => (
                          <div
                            key={unit.id}
                            className="flex items-center justify-between p-2 border rounded-lg text-sm hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleEditUnit(unit)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {unit.serialNumber || unit.assetTag || 'Unit'}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: UNIT_STATUS_COLORS[unit.status],
                                    color: UNIT_STATUS_COLORS[unit.status],
                                  }}
                                >
                                  {UNIT_STATUS_LABELS[unit.status]}
                                </Badge>
                              </div>
                              {unit.location && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {unit.location}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 ml-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUnitToDelete(unit);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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

      <ConfirmDialog
        open={!!unitToDelete}
        onOpenChange={(open) => !open && setUnitToDelete(null)}
        onConfirm={handleDeleteUnit}
        title="Delete Unit"
        description={`Are you sure you want to delete this unit${unitToDelete?.serialNumber ? ` (${unitToDelete.serialNumber})` : ''}?`}
        confirmText="Delete"
        variant="destructive"
      />

      <EquipmentUnitDialog
        open={isUnitDialogOpen}
        onOpenChange={(open) => {
          setIsUnitDialogOpen(open);
          if (!open) setEditingUnit(null);
        }}
        equipmentId={equipment.id}
        unit={editingUnit}
      />
    </>
  );
}
