/**
 * TelemetryGauges - Real-time power and energy metrics display
 */

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, Battery, TrendingUp, Activity } from 'lucide-react';
import type { SystemMetrics } from '@/lib/digitaltwin/types';
import { cn } from '@/lib/utils';

interface TelemetryGaugesProps {
  system: SystemMetrics | undefined;
  capacityKwp?: number;
}

export function TelemetryGauges({ system, capacityKwp: _capacityKwp = 1000 }: TelemetryGaugesProps) {
  if (!system) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Waiting for telemetry data...
      </div>
    );
  }

  const prPercent = system.performanceRatio * 100;
  const powerPercent = system.expectedPower > 0
    ? (system.powerOutput / system.expectedPower) * 100
    : 0;

  // PR color coding
  const prColor =
    prPercent >= 80
      ? 'text-green-600 dark:text-green-400'
      : prPercent >= 70
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

  // Availability color
  const availColor =
    system.availability >= 95
      ? 'text-green-600 dark:text-green-400'
      : system.availability >= 85
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="p-3 space-y-3">
      {/* Power & Energy Row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Current Power */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs">Power</span>
            </div>
            <div className="text-xl font-bold">
              {system.powerOutput > 1000
                ? `${(system.powerOutput / 1000).toFixed(1)} MW`
                : `${system.powerOutput.toFixed(1)} kW`}
            </div>
            <Progress value={Math.min(100, powerPercent)} className="h-1.5 mt-2" />
            <div className="text-[10px] text-muted-foreground mt-1">
              {powerPercent.toFixed(0)}% of expected
            </div>
          </CardContent>
        </Card>

        {/* Energy Today */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Battery className="h-3.5 w-3.5" />
              <span className="text-xs">Today</span>
            </div>
            <div className="text-xl font-bold">
              {system.energyToday > 1000
                ? `${(system.energyToday / 1000).toFixed(1)} MWh`
                : `${system.energyToday.toFixed(0)} kWh`}
            </div>
            <div className="text-[10px] text-muted-foreground mt-3">
              Grid export: {system.gridExport > 1000
                ? `${(system.gridExport / 1000).toFixed(1)} MW`
                : `${system.gridExport.toFixed(1)} kW`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Ratio */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Performance Ratio</span>
        </div>
        <span className={cn('text-lg font-semibold', prColor)}>
          {prPercent.toFixed(1)}%
        </span>
      </div>

      {/* Availability */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Availability</span>
        </div>
        <span className={cn('text-lg font-semibold', availColor)}>
          {system.availability.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
