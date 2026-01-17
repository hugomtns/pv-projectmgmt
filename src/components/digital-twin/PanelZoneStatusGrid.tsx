/**
 * PanelZoneStatusGrid - Grid display of individual panel frame status
 *
 * Shows each panel's performance status with fault indicators.
 * Supports clicking to focus camera on specific panels.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Flame,
  Cloud,
  Droplets,
  Activity,
  Search,
} from 'lucide-react';
import type { PanelFramePerformance, PanelFaultType } from '@/lib/digitaltwin/types';
import { cn } from '@/lib/utils';

interface PanelZoneStatusGridProps {
  panelZones: PanelFramePerformance[] | undefined;
  /** Called when panel card is clicked - index is the panel index */
  onZoneClick?: (panelIndex: number) => void;
}

type PanelStatus = 'healthy' | 'warning' | 'fault';

const statusConfig: Record<PanelStatus, { icon: typeof CheckCircle2; color: string; bg: string }> = {
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

const faultConfig: Record<PanelFaultType, { icon: typeof Flame; label: string; color: string }> = {
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

function getPanelStatus(panel: PanelFramePerformance): PanelStatus {
  if (panel.faultType) return 'fault';
  if (panel.performanceIndex < 0.8) return 'warning';
  return 'healthy';
}

export function PanelZoneStatusGrid({
  panelZones: panelFrames,
  onZoneClick: onPanelClick,
}: PanelZoneStatusGridProps) {
  const [searchFilter, setSearchFilter] = useState('');

  const hasPanels = panelFrames && panelFrames.length > 0;

  // Count statuses
  const counts = useMemo(() => {
    if (!hasPanels) return { healthy: 0, warning: 0, fault: 0 };
    return countStatuses(panelFrames);
  }, [panelFrames, hasPanels]);

  // Filter panels with faults first, then by search term
  const displayPanels = useMemo(() => {
    if (!hasPanels) return [];

    // Separate faulted panels from healthy ones
    const faultedPanels = panelFrames.filter((p) => p.faultType);
    const nonFaultedPanels = panelFrames.filter((p) => !p.faultType);

    // If there are faults, show faulted panels first
    const sorted = [...faultedPanels, ...nonFaultedPanels];

    // Apply search filter
    if (searchFilter) {
      const searchNum = parseInt(searchFilter, 10);
      if (!isNaN(searchNum)) {
        // Filter by panel number (1-based in search)
        return sorted.filter((p) => (p.panelIndex + 1).toString().includes(searchFilter));
      }
    }

    // For large panel counts, limit display to first 100 + all faulted panels
    if (sorted.length > 100) {
      const faultedCount = faultedPanels.length;
      return sorted.slice(0, Math.max(100, faultedCount));
    }

    return sorted;
  }, [panelFrames, hasPanels, searchFilter]);

  if (!hasPanels) {
    return null;
  }

  const showSearch = panelFrames.length > 20;
  const totalPanels = panelFrames.length;
  const displayedPanels = displayPanels.length;

  return (
    <div className="p-3">
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Panel Frames ({totalPanels})
            </span>
            <StatusSummary counts={counts} />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          {/* Search filter for large panel counts */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search panel #..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-7 text-xs pl-7"
              />
            </div>
          )}

          <ScrollArea className="h-[200px]">
            <div className="grid grid-cols-3 gap-1.5">
              {displayPanels.map((panel) => (
                <PanelCard
                  key={panel.panelIndex}
                  panel={panel}
                  onClick={onPanelClick ? () => onPanelClick(panel.panelIndex) : undefined}
                />
              ))}
            </div>
            {displayedPanels < totalPanels && !searchFilter && (
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Showing {displayedPanels} of {totalPanels} panels (faulted panels shown first)
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function countStatuses(
  panels: PanelFramePerformance[]
): Record<PanelStatus, number> {
  const counts: Record<PanelStatus, number> = {
    healthy: 0,
    warning: 0,
    fault: 0,
  };

  panels.forEach((p) => {
    counts[getPanelStatus(p)]++;
  });

  return counts;
}

function StatusSummary({ counts }: { counts: Record<PanelStatus, number> }) {
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

function PanelCard({ panel, onClick }: { panel: PanelFramePerformance; onClick?: () => void }) {
  const status = getPanelStatus(panel);
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const fault = panel.faultType ? faultConfig[panel.faultType] : null;
  const FaultIcon = fault?.icon;

  return (
    <div
      className={cn(
        'p-1.5 rounded-md text-[10px]',
        config.bg,
        onClick && 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-shadow'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-medium">#{panel.panelIndex + 1}</span>
        <StatusIcon className={cn('h-3 w-3', config.color)} />
      </div>
      <div className="text-muted-foreground truncate">
        {fault && FaultIcon ? (
          <span className={cn('flex items-center gap-0.5', fault.color)}>
            <FaultIcon className="h-2.5 w-2.5" />
            {fault.label}
          </span>
        ) : (
          <>
            {panel.temperature.toFixed(0)}°C | {(panel.performanceIndex * 100).toFixed(0)}%
          </>
        )}
      </div>
    </div>
  );
}
