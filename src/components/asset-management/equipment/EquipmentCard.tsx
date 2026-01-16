import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Equipment } from '@/lib/types/equipment';
import {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_COLORS,
} from '@/lib/types/equipment';
import { AlertTriangle, Cpu, Zap, Box, Activity, Gauge, Settings } from 'lucide-react';

interface EquipmentCardProps {
  equipment: Equipment;
  onClick?: () => void;
  showWarrantyWarning?: boolean;
}

const TYPE_ICONS = {
  module: Cpu,
  inverter: Zap,
  transformer: Box,
  combiner_box: Box,
  tracker: Activity,
  meter: Gauge,
  other: Settings,
};

export function EquipmentCard({
  equipment,
  onClick,
  showWarrantyWarning = false,
}: EquipmentCardProps) {
  const TypeIcon = TYPE_ICONS[equipment.type];
  const statusColor = EQUIPMENT_STATUS_COLORS[equipment.status];

  // Calculate days until warranty expires
  let warrantyDaysRemaining: number | null = null;
  if (equipment.warrantyExpiration) {
    const now = new Date();
    const expDate = new Date(equipment.warrantyExpiration);
    warrantyDaysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        'hover:border-primary/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Type Icon */}
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
              style={{ backgroundColor: `${statusColor}20` }}
            >
              <TypeIcon className="h-5 w-5" style={{ color: statusColor }} />
            </div>

            {/* Main Info */}
            <div className="min-w-0 flex-1">
              <h3 className="font-medium truncate">{equipment.name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {EQUIPMENT_TYPE_LABELS[equipment.type]}
                {equipment.manufacturer && ` - ${equipment.manufacturer}`}
                {equipment.model && ` ${equipment.model}`}
              </p>
              {equipment.serialNumber && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  S/N: {equipment.serialNumber}
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <Badge
            variant="outline"
            className="shrink-0"
            style={{
              borderColor: statusColor,
              color: statusColor,
            }}
          >
            {EQUIPMENT_STATUS_LABELS[equipment.status]}
          </Badge>
        </div>

        {/* Additional info row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
          <span>Qty: {equipment.quantity}</span>
          {equipment.location && (
            <span className="truncate">{equipment.location}</span>
          )}
        </div>

        {/* Warranty warning */}
        {showWarrantyWarning && warrantyDaysRemaining !== null && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-orange-500/10 rounded text-sm text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Warranty expires in {warrantyDaysRemaining} days
              {equipment.warrantyExpiration && ` (${new Date(equipment.warrantyExpiration).toLocaleDateString()})`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
