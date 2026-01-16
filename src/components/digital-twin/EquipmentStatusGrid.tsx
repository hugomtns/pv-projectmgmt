/**
 * EquipmentStatusGrid - Grid display of inverter and transformer status
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Box, AlertTriangle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { InverterTelemetry, TransformerTelemetry, EquipmentStatus } from '@/lib/digitaltwin/types';
import { cn } from '@/lib/utils';

interface EquipmentStatusGridProps {
  inverters: InverterTelemetry[] | undefined;
  transformers: TransformerTelemetry[] | undefined;
  /** Called when equipment card is clicked - type is 'inverter' or 'transformer', index is 0-based */
  onEquipmentClick?: (type: 'inverter' | 'transformer', index: number) => void;
}

const statusConfig: Record<EquipmentStatus, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  online: {
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  fault: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
  offline: {
    icon: AlertCircle,
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
  },
};

export function EquipmentStatusGrid({
  inverters,
  transformers,
  onEquipmentClick,
}: EquipmentStatusGridProps) {
  const hasInverters = inverters && inverters.length > 0;
  const hasTransformers = transformers && transformers.length > 0;

  if (!hasInverters && !hasTransformers) {
    return (
      <div className="p-3 text-center text-muted-foreground text-sm">
        No equipment data
      </div>
    );
  }

  // Count statuses
  const inverterCounts = countStatuses(inverters || []);
  const transformerCounts = countStatuses(transformers || []);

  return (
    <div className="p-3 space-y-3">
      {/* Inverters */}
      {hasInverters && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Inverters ({inverters.length})
              </span>
              <StatusSummary counts={inverterCounts} />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ScrollArea className="h-[140px]">
              <div className="grid grid-cols-2 gap-2">
                {inverters.map((inv, index) => (
                  <InverterCard
                    key={inv.equipmentId}
                    inverter={inv}
                    onClick={onEquipmentClick ? () => onEquipmentClick('inverter', index) : undefined}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Transformers */}
      {hasTransformers && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Box className="h-4 w-4" />
                Transformers ({transformers.length})
              </span>
              <StatusSummary counts={transformerCounts} />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {transformers.map((xfr, index) => (
                <TransformerCard
                  key={xfr.equipmentId}
                  transformer={xfr}
                  onClick={onEquipmentClick ? () => onEquipmentClick('transformer', index) : undefined}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function countStatuses(
  equipment: Array<{ status: EquipmentStatus }>
): Record<EquipmentStatus, number> {
  const counts: Record<EquipmentStatus, number> = {
    online: 0,
    warning: 0,
    fault: 0,
    offline: 0,
  };

  equipment.forEach((e) => {
    counts[e.status]++;
  });

  return counts;
}

function StatusSummary({ counts }: { counts: Record<EquipmentStatus, number> }) {
  return (
    <div className="flex gap-1">
      {counts.online > 0 && (
        <Badge variant="outline" className="text-green-600 border-green-300 text-[10px] px-1">
          {counts.online}
        </Badge>
      )}
      {counts.warning > 0 && (
        <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-[10px] px-1">
          {counts.warning}
        </Badge>
      )}
      {counts.fault > 0 && (
        <Badge variant="outline" className="text-red-600 border-red-300 text-[10px] px-1">
          {counts.fault}
        </Badge>
      )}
      {counts.offline > 0 && (
        <Badge variant="outline" className="text-gray-500 border-gray-300 text-[10px] px-1">
          {counts.offline}
        </Badge>
      )}
    </div>
  );
}

function InverterCard({ inverter, onClick }: { inverter: InverterTelemetry; onClick?: () => void }) {
  const config = statusConfig[inverter.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        'p-2 rounded-md text-xs',
        config.bg,
        onClick && 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-shadow'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">{inverter.name}</span>
        <StatusIcon className={cn('h-3.5 w-3.5', config.color)} />
      </div>
      <div className="text-muted-foreground">
        {inverter.status === 'fault' ? (
          <span className="text-red-600 dark:text-red-400">
            {inverter.faultCode}
          </span>
        ) : (
          <>
            {inverter.acPower.toFixed(1)} kW
            <span className="mx-1">|</span>
            {inverter.temperature.toFixed(0)}°C
          </>
        )}
      </div>
    </div>
  );
}

function TransformerCard({ transformer, onClick }: { transformer: TransformerTelemetry; onClick?: () => void }) {
  const config = statusConfig[transformer.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        'p-2 rounded-md text-xs flex items-center justify-between',
        config.bg,
        onClick && 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-shadow'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{transformer.name}</span>
          <StatusIcon className={cn('h-3.5 w-3.5', config.color)} />
        </div>
        <div className="text-muted-foreground mt-0.5">
          {transformer.loadPercent.toFixed(0)}% load | {transformer.temperature.toFixed(0)}°C
        </div>
      </div>
    </div>
  );
}
