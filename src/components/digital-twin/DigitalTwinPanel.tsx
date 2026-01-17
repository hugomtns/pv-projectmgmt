/**
 * DigitalTwinPanel - Main sidebar panel for Digital Twin functionality
 *
 * Combines weather widget, telemetry gauges, equipment status grid,
 * and alert log into a cohesive monitoring interface.
 */

import { useEffect, useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Activity, Settings2 } from 'lucide-react';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';
import { useDesignStore } from '@/stores/designStore';
import { WeatherWidget } from './WeatherWidget';
import { TelemetryGauges } from './TelemetryGauges';
import { EquipmentStatusGrid } from './EquipmentStatusGrid';
import { PanelZoneStatusGrid } from './PanelZoneStatusGrid';
import { AlertLog } from './AlertLog';
import { SimulationSettingsDialog } from './SimulationSettingsDialog';
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
  onEquipmentClick?: (type: 'inverter' | 'transformer' | 'panel', index: number) => void;
}

export function DigitalTwinPanel({ designId, onActiveChange, equipmentCounts, onEquipmentClick }: DigitalTwinPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  } = useDigitalTwinStore();

  // Get design data for simulation config
  const design = useDesignStore((state) =>
    state.designs.find((d) => d.id === designId)
  );

  // Build simulation config from design data
  const simulationConfig = useMemo((): Omit<SimulationConfig, 'enableRandomFaults' | 'faultProbability' | 'soilingLoss' | 'mismatchLoss' | 'maxConcurrentPanelFaults'> | null => {
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
    <div className="w-[640px] border-l flex flex-col h-full bg-background">
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
          <WeatherWidget
            weather={currentSnapshot.weather}
            latitude={currentConfig?.latitude}
            longitude={currentConfig?.longitude}
          />

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

          {/* Panel Frames Status */}
          <PanelZoneStatusGrid
            panelZones={currentSnapshot.panelFrames}
            onZoneClick={(panelIndex) => onEquipmentClick?.('panel', panelIndex)}
          />

          {/* Alerts */}
          <AlertLog
            alerts={alerts}
            onAcknowledge={acknowledgeAlert}
            onClear={clearAlert}
            onClearAll={clearAllAlerts}
            onAlertClick={onEquipmentClick}
          />

          {/* Settings Button */}
          <div className="mx-3 mb-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
              Simulation Settings
            </Button>
          </div>
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

      {/* Settings Dialog */}
      <SimulationSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
