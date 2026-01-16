/**
 * DigitalTwinPanel - Main sidebar panel for Digital Twin functionality
 *
 * Combines weather widget, telemetry gauges, equipment status grid,
 * and alert log into a cohesive monitoring interface.
 */

import { useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Activity, Settings2 } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';
import { useDesignStore } from '@/stores/designStore';
import { WeatherWidget } from './WeatherWidget';
import { TelemetryGauges } from './TelemetryGauges';
import { EquipmentStatusGrid } from './EquipmentStatusGrid';
import { AlertLog } from './AlertLog';
import type { SimulationConfig } from '@/lib/digitaltwin/types';

interface EquipmentCounts {
  inverterCount: number;
  transformerCount: number;
  panelCount: number;
}

interface DigitalTwinPanelProps {
  designId: string;
  /** Callback when simulation starts/stops */
  onActiveChange?: (active: boolean) => void;
  /** Equipment counts from parsed DXF */
  equipmentCounts?: EquipmentCounts | null;
  /** Callback when equipment card is clicked - focuses camera on equipment */
  onEquipmentClick?: (type: 'inverter' | 'transformer', index: number) => void;
}

export function DigitalTwinPanel({ designId, onActiveChange, equipmentCounts, onEquipmentClick }: DigitalTwinPanelProps) {
  const {
    isActive,
    isLoading,
    currentSnapshot,
    alerts,
    currentConfig,
    startSimulation,
    stopSimulation,
    acknowledgeAlert,
    clearAlert,
    clearAllAlerts,
    setFaultProbability,
  } = useDigitalTwinStore();

  // Get design data for simulation config
  const design = useDesignStore((state) =>
    state.designs.find((d) => d.id === designId)
  );

  // Build simulation config from design data
  const simulationConfig = useMemo((): Omit<SimulationConfig, 'zoneCount' | 'enableRandomFaults' | 'faultProbability' | 'soilingLoss' | 'mismatchLoss'> | null => {
    if (!design) return null;

    // Extract coordinates from design
    const lat = design.gpsCoordinates?.latitude || 40.0; // Default to mid-latitude
    const lon = design.gpsCoordinates?.longitude || -74.0;

    // Use actual equipment counts from DXF parsing, or fallback to defaults
    const inverterCount = equipmentCounts?.inverterCount || 5;
    const transformerCount = equipmentCounts?.transformerCount || 1;
    const panelCount = equipmentCounts?.panelCount || 12000;

    // Estimate capacity from panel count (assuming ~500W per panel)
    const estimatedCapacityKwp = panelCount * 0.5;

    return {
      designId,
      capacityKwp: estimatedCapacityKwp,
      latitude: lat,
      longitude: lon,
      inverterCount,
      transformerCount,
      panelCount,
    };
  }, [design, designId, equipmentCounts]);

  // Toggle simulation
  const handleToggle = async (enabled: boolean) => {
    if (enabled && simulationConfig) {
      await startSimulation(simulationConfig);
    } else {
      stopSimulation();
    }
    onActiveChange?.(enabled);
  };

  // Notify parent of active state changes
  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        stopSimulation();
      }
    };
  }, []);

  return (
    <div className="w-80 border-l flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Digital Twin
        </h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="dt-toggle" className="text-xs text-muted-foreground">
            {isActive ? 'Active' : 'Off'}
          </Label>
          <Switch
            id="dt-toggle"
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={isLoading || !simulationConfig}
          />
        </div>
      </div>

      {/* Content */}
      {isActive && currentSnapshot ? (
        <ScrollArea className="flex-1">
          {/* Weather */}
          <WeatherWidget weather={currentSnapshot.weather} />

          {/* Telemetry Gauges */}
          <TelemetryGauges
            system={currentSnapshot.system}
            capacityKwp={currentConfig?.capacityKwp}
          />

          {/* Equipment Status */}
          <EquipmentStatusGrid
            inverters={currentSnapshot.inverters}
            transformers={currentSnapshot.transformers}
            onEquipmentClick={onEquipmentClick}
          />

          {/* Alerts */}
          <AlertLog
            alerts={alerts}
            onAcknowledge={acknowledgeAlert}
            onClear={clearAlert}
            onClearAll={clearAllAlerts}
          />

          {/* Settings */}
          <Collapsible className="mx-3 mb-3">
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full py-2">
              <Settings2 className="h-3 w-3" />
              Simulation Settings
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">
                  Fault Probability: {((currentConfig?.faultProbability || 0.01) * 100).toFixed(1)}%
                </Label>
                <Slider
                  value={[(currentConfig?.faultProbability || 0.01) * 100]}
                  onValueChange={([value]) => setFaultProbability(value / 100)}
                  min={0}
                  max={10}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center px-6">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-2">Digital Twin Simulation</p>
            <p className="text-xs">
              Enable the simulation to see real-time equipment telemetry,
              weather conditions, and performance metrics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
