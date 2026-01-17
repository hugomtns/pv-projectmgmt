/**
 * SimulationSettingsDialog - Configuration dialog for Digital Twin simulation
 *
 * Allows users to configure fault probability, losses, and other simulation parameters.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings2, Zap, CloudRain, AlertTriangle, Timer } from 'lucide-react';
import { useDigitalTwinStore } from '@/stores/digitalTwinStore';

interface SimulationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimulationSettingsDialog({
  open,
  onOpenChange,
}: SimulationSettingsDialogProps) {
  const {
    currentConfig,
    updateIntervalMs,
    setFaultProbability,
    setSoilingLoss,
    setMismatchLoss,
    setEnableRandomFaults,
    setUpdateInterval,
  } = useDigitalTwinStore();

  if (!currentConfig) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Simulation Settings
          </DialogTitle>
          <DialogDescription>
            Configure parameters for the Digital Twin simulation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Update Interval */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Timer className="h-4 w-4" />
              Update Interval
            </div>
            <Select
              value={String(updateIntervalMs)}
              onValueChange={(value) => setUpdateInterval(Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1 second (fast)</SelectItem>
                <SelectItem value="2000">2 seconds</SelectItem>
                <SelectItem value="5000">5 seconds (default)</SelectItem>
                <SelectItem value="10000">10 seconds</SelectItem>
                <SelectItem value="30000">30 seconds</SelectItem>
                <SelectItem value="60000">1 minute (slow)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often telemetry data is updated. Faster intervals use more resources.
            </p>
          </div>

          <Separator />

          {/* Fault Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Fault Simulation
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Random Faults</Label>
                <p className="text-xs text-muted-foreground">
                  Randomly generate equipment faults during simulation
                </p>
              </div>
              <Switch
                checked={currentConfig.enableRandomFaults}
                onCheckedChange={setEnableRandomFaults}
              />
            </div>

            {currentConfig.enableRandomFaults && (
              <div className="space-y-2 pl-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Fault Probability</Label>
                  <span className="text-sm text-muted-foreground">
                    {(currentConfig.faultProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <Slider
                  value={[currentConfig.faultProbability * 100]}
                  onValueChange={([value]) => setFaultProbability(value / 100)}
                  min={0}
                  max={10}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Chance of fault per equipment per update cycle
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Loss Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              System Losses
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Soiling Loss</Label>
                <span className="text-sm text-muted-foreground">
                  {(currentConfig.soilingLoss * 100).toFixed(1)}%
                </span>
              </div>
              <Slider
                value={[currentConfig.soilingLoss * 100]}
                onValueChange={([value]) => setSoilingLoss(value / 100)}
                min={0}
                max={20}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Power loss due to dust, dirt, and debris on panels
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Mismatch Loss</Label>
                <span className="text-sm text-muted-foreground">
                  {(currentConfig.mismatchLoss * 100).toFixed(1)}%
                </span>
              </div>
              <Slider
                value={[currentConfig.mismatchLoss * 100]}
                onValueChange={([value]) => setMismatchLoss(value / 100)}
                min={0}
                max={10}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Power loss due to module mismatch and wiring losses
              </p>
            </div>
          </div>

          <Separator />

          {/* Weather Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CloudRain className="h-4 w-4" />
              Weather Source
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p>
                Weather data is fetched from Open-Meteo API based on the design's
                GPS coordinates ({currentConfig.latitude.toFixed(4)}°,{' '}
                {currentConfig.longitude.toFixed(4)}°).
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
