import { useState, useMemo } from 'react';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { EquipmentCard } from './EquipmentCard';
import { CreateEquipmentDialog } from './CreateEquipmentDialog';
import { ImportEquipmentFromDesignDialog } from './ImportEquipmentFromDesignDialog';
import { EquipmentDetail } from './EquipmentDetail';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Cpu, AlertCircle, FileBox } from 'lucide-react';
import type { Equipment, EquipmentType } from '@/lib/types/equipment';
import { EQUIPMENT_TYPE_ORDER, EQUIPMENT_TYPE_LABELS } from '@/lib/types/equipment';

interface EquipmentListProps {
  projectId: string;
}

export function EquipmentList({ projectId }: EquipmentListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'warranty'>('all');
  const [filterType, setFilterType] = useState<EquipmentType | 'all'>('all');

  // Get all equipment for this project
  const allEquipment = useEquipmentStore((state) => state.equipment);
  const equipment = useMemo(
    () => allEquipment.filter((e) => e.projectId === projectId),
    [allEquipment, projectId]
  );

  // Get expiring warranties (computed in component to avoid infinite loop)
  const expiringWarranties = useMemo(() => {
    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() + 90);

    return equipment.filter((e) => {
      if (!e.warrantyExpiration) return false;
      const expirationDate = new Date(e.warrantyExpiration);
      return expirationDate <= thresholdDate && expirationDate >= now;
    });
  }, [equipment]);

  const currentUser = useUserStore((state) => state.currentUser);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const roles = useUserStore((state) => state.roles);

  // Permission check
  const canCreate = currentUser
    ? resolvePermissions(currentUser, 'equipment', undefined, permissionOverrides, roles).create
    : false;

  // Filter equipment
  const filteredEquipment = useMemo(() => {
    if (activeTab === 'warranty') {
      return expiringWarranties;
    }
    if (filterType === 'all') {
      return equipment;
    }
    return equipment.filter((e) => e.type === filterType);
  }, [equipment, expiringWarranties, activeTab, filterType]);

  // Group by type for display
  const groupedByType = useMemo(() => {
    const groups: Record<EquipmentType, Equipment[]> = {
      module: [],
      inverter: [],
      transformer: [],
      combiner_box: [],
      tracker: [],
      meter: [],
      other: [],
    };

    filteredEquipment.forEach((e) => {
      groups[e.type].push(e);
    });

    return groups;
  }, [filteredEquipment]);

  const hasEquipment = equipment.length > 0;
  const selectedEquipment = selectedEquipmentId
    ? equipment.find((e) => e.id === selectedEquipmentId) || null
    : null;

  return (
    <div className="space-y-6">
      {/* Header with tabs and actions */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'warranty')}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Cpu className="h-4 w-4" />
              All Equipment {hasEquipment && `(${equipment.length})`}
            </TabsTrigger>
            <TabsTrigger value="warranty" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Warranty Alerts
              {expiringWarranties.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {expiringWarranties.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {canCreate && activeTab === 'all' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              className="gap-1"
            >
              <FileBox className="h-4 w-4" />
              Import from Design
            </Button>
            <Button
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Equipment
            </Button>
          </div>
        )}
      </div>

      {/* Type filter (only for All tab) */}
      {activeTab === 'all' && hasEquipment && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          {EQUIPMENT_TYPE_ORDER.map((type) => {
            const count = equipment.filter((e) => e.type === type).length;
            if (count === 0) return null;
            return (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
              >
                {EQUIPMENT_TYPE_LABELS[type]} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Equipment content */}
      {activeTab === 'all' && (
        <>
          {/* Empty state */}
          {!hasEquipment && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No equipment registered</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add equipment to track installed assets and warranties.
              </p>
              {canCreate && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsImportDialogOpen(true)}
                    className="gap-1"
                  >
                    <FileBox className="h-4 w-4" />
                    Import from Design
                  </Button>
                  <Button onClick={() => setIsDialogOpen(true)} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add Equipment
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Equipment grouped by type */}
          {hasEquipment && filterType === 'all' && (
            <div className="space-y-6">
              {EQUIPMENT_TYPE_ORDER.map((type) => {
                const items = groupedByType[type];
                if (items.length === 0) return null;

                return (
                  <div key={type}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      {EQUIPMENT_TYPE_LABELS[type]} ({items.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((item) => (
                        <EquipmentCard
                          key={item.id}
                          equipment={item}
                          onClick={() => setSelectedEquipmentId(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filtered equipment (single type) */}
          {hasEquipment && filterType !== 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEquipment.map((item) => (
                <EquipmentCard
                  key={item.id}
                  equipment={item}
                  onClick={() => setSelectedEquipmentId(item.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Warranty tab content */}
      {activeTab === 'warranty' && (
        <>
          {expiringWarranties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No warranty alerts</h3>
              <p className="text-sm text-muted-foreground">
                All warranties are current. Equipment with warranties expiring within 90 days will appear here.
              </p>
            </div>
          )}

          {expiringWarranties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expiringWarranties.map((item) => (
                <EquipmentCard
                  key={item.id}
                  equipment={item}
                  onClick={() => setSelectedEquipmentId(item.id)}
                  showWarrantyWarning
                />
              ))}
            </div>
          )}
        </>
      )}

      <CreateEquipmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
      />

      <ImportEquipmentFromDesignDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        projectId={projectId}
      />

      <EquipmentDetail
        equipment={selectedEquipment}
        open={!!selectedEquipmentId}
        onOpenChange={(open) => !open && setSelectedEquipmentId(null)}
      />
    </div>
  );
}
