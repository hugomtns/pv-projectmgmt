/**
 * PanelZoneStatusGrid - Grid display of panel zone status
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Flame,
  Cloud,
  Droplets,
  Activity,
} from 'lucide-react';
import type { PanelZonePerformance, PanelZoneFaultType } from '@/lib/digitaltwin/types';
import { cn } from '@/lib/utils';

interface PanelZoneStatusGridProps {
  panelZones: PanelZonePerformance[] | undefined;
  /** Called when zone card is clicked - index is 0-based */
  onZoneClick?: (zoneIndex: number) => void;
}

type ZoneStatus = 'healthy' | 'warning' | 'fault';

const statusConfig: Record<ZoneStatus, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  healthy: {
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
};

const faultConfig: Record<PanelZoneFaultType, { icon: typeof Flame; label: string; color: string }> = {
  hot_spot: {
    icon: Flame,
    label: 'Hot Spot',
    color: 'text-red-600 dark:text-red-400',
  },
  shading: {
    icon: Cloud,
    label: 'Shading',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  soiling_heavy: {
    icon: Droplets,
    label: 'Heavy Soiling',
    color: 'text-amber-600 dark:text-amber-400',
  },
  module_degradation: {
    icon: Activity,
    label: 'Degradation',
    color: 'text-red-600 dark:text-red-400',
  },
};

function getZoneStatus(zone: PanelZonePerformance): ZoneStatus {
  if (zone.faultType) return 'fault';
  if (zone.performanceIndex < 0.8) return 'warning';
  return 'healthy';
}

function getZoneName(index: number): string {
  return `Zone ${String.fromCharCode(65 + index)}`;
}

export function PanelZoneStatusGrid({
  panelZones,
  onZoneClick,
}: PanelZoneStatusGridProps) {
  const hasZones = panelZones && panelZones.length > 0;

  if (!hasZones) {
    return null;
  }

  // Count statuses
  const counts = countStatuses(panelZones);

  return (
    <div className="p-3">
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Panel Frames ({panelZones.length})
            </span>
            <StatusSummary counts={counts} />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <ScrollArea className="h-[160px]">
            <div className="grid grid-cols-2 gap-2">
              {panelZones.map((zone, index) => (
                <ZoneCard
                  key={zone.zoneId}
                  zone={zone}
                  index={index}
                  onClick={onZoneClick ? () => onZoneClick(index) : undefined}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function countStatuses(
  zones: PanelZonePerformance[]
): Record<ZoneStatus, number> {
  const counts: Record<ZoneStatus, number> = {
    healthy: 0,
    warning: 0,
    fault: 0,
  };

  zones.forEach((z) => {
    counts[getZoneStatus(z)]++;
  });

  return counts;
}

function StatusSummary({ counts }: { counts: Record<ZoneStatus, number> }) {
  return (
    <div className="flex gap-1">
      {counts.healthy > 0 && (
        <Badge variant="outline" className="text-green-600 border-green-300 text-[10px] px-1">
          {counts.healthy}
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
    </div>
  );
}

function ZoneCard({ zone, index, onClick }: { zone: PanelZonePerformance; index: number; onClick?: () => void }) {
  const status = getZoneStatus(zone);
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const fault = zone.faultType ? faultConfig[zone.faultType] : null;
  const FaultIcon = fault?.icon;

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
        <span className="font-medium">{getZoneName(index)}</span>
        <StatusIcon className={cn('h-3.5 w-3.5', config.color)} />
      </div>
      <div className="text-muted-foreground">
        {fault && FaultIcon ? (
          <span className={cn('flex items-center gap-1', fault.color)}>
            <FaultIcon className="h-3 w-3" />
            {fault.label}
          </span>
        ) : (
          <>
            {zone.avgTemperature.toFixed(0)}°C
            <span className="mx-1">|</span>
            {(zone.performanceIndex * 100).toFixed(0)}%
          </>
        )}
      </div>
    </div>
  );
}
