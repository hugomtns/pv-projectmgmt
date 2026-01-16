import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sun, MapPin, Gauge, Loader2, Info, Calculator, Zap } from 'lucide-react';
import type { GPSCoordinates } from '@/lib/types';
import type { YieldEstimate } from '@/lib/yield/types';
import { calculateYield } from '@/lib/yield';
import { formatYield, getSourceDescription } from '@/lib/yield/yieldCalculator';

interface DesignYieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designName: string;
  gpsCoordinates?: GPSCoordinates;
  parsedData?: {
    panels: Array<{
      tiltAngle?: number;
      tableWidth?: number;
      tableHeight?: number;
    }>;
  };
}

export function DesignYieldModal({
  open,
  onOpenChange,
  designName,
  gpsCoordinates,
  parsedData,
}: DesignYieldModalProps) {
  // Form state
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [capacityKwp, setCapacityKwp] = useState('');
  const [tiltAngle, setTiltAngle] = useState('');

  // Calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<YieldEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill from design data when dialog opens
  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);

      // Auto-fill GPS coordinates
      if (gpsCoordinates) {
        setLatitude(gpsCoordinates.latitude.toString());
        setLongitude(gpsCoordinates.longitude.toString());
      } else {
        setLatitude('');
        setLongitude('');
      }

      // Auto-fill tilt angle from parsed DXF panels
      if (parsedData?.panels && parsedData.panels.length > 0) {
        const firstPanel = parsedData.panels[0];
        if (firstPanel.tiltAngle !== undefined) {
          setTiltAngle(firstPanel.tiltAngle.toString());
        } else {
          setTiltAngle('');
        }

        // Estimate capacity from panel count (default 500W per panel if count is available)
        const panelCount = parsedData.panels.length;
        if (panelCount > 0) {
          // Default to 500W per panel = 0.5 kWp
          const estimatedCapacity = (panelCount * 0.5).toFixed(1);
          setCapacityKwp(estimatedCapacity);
        } else {
          setCapacityKwp('');
        }
      } else {
        setTiltAngle('');
        setCapacityKwp('');
      }
    }
  }, [open, gpsCoordinates, parsedData]);

  const panelCount = parsedData?.panels?.length ?? 0;
  const hasGPS = !!gpsCoordinates;
  const hasTilt = parsedData?.panels?.[0]?.tiltAngle !== undefined;

  const handleCalculate = async () => {
    setError(null);
    setIsCalculating(true);

    try {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const capacity = parseFloat(capacityKwp);
      const tilt = tiltAngle ? parseFloat(tiltAngle) : undefined;

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Invalid coordinates. Please enter valid latitude and longitude.');
      }

      if (isNaN(capacity) || capacity <= 0) {
        throw new Error('Please enter a valid system capacity (kWp).');
      }

      const calcResult = await calculateYield({
        latitude: lat,
        longitude: lon,
        capacityKwp: capacity,
        tiltAngle: tilt,
      });

      if (calcResult.success && calcResult.estimate) {
        setResult(calcResult.estimate);
      } else {
        setError(calcResult.error || 'Calculation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setIsCalculating(false);
    }
  };

  const canCalculate =
    latitude.trim() !== '' &&
    longitude.trim() !== '' &&
    capacityKwp.trim() !== '' &&
    parseFloat(capacityKwp) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            Yield Estimate
          </DialogTitle>
          <DialogDescription>
            Calculate estimated annual energy yield for <span className="font-medium">{designName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Auto-fill indicators */}
          <div className="flex flex-wrap gap-2">
            {hasGPS && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                GPS from design
              </Badge>
            )}
            {panelCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Gauge className="h-3 w-3" />
                {panelCount} panels detected
              </Badge>
            )}
            {hasTilt && (
              <Badge variant="secondary" className="gap-1">
                <Calculator className="h-3 w-3" />
                Tilt from design
              </Badge>
            )}
          </div>

          {/* Input fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.0001"
                placeholder="e.g., 37.7749"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.0001"
                placeholder="e.g., -122.4194"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">System Capacity (kWp)</Label>
              <Input
                id="capacity"
                type="number"
                step="0.1"
                placeholder="e.g., 100"
                value={capacityKwp}
                onChange={(e) => setCapacityKwp(e.target.value)}
              />
              {panelCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Estimated from {panelCount} panels @ 500W
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tilt">Tilt Angle (degrees)</Label>
              <Input
                id="tilt"
                type="number"
                step="1"
                placeholder="Auto from latitude"
                value={tiltAngle}
                onChange={(e) => setTiltAngle(e.target.value)}
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Calculation Results</span>
                  <Badge variant="outline" className="gap-1">
                    <Info className="h-3 w-3" />
                    {getSourceDescription(result.source)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Zap className="h-4 w-4" />
                      Annual Yield
                    </div>
                    <div className="text-2xl font-bold">
                      {formatYield(result.annualYield)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(result.annualYield / 1000)} MWh/year
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Sun className="h-4 w-4" />
                      Performance Ratio
                    </div>
                    <div className="text-2xl font-bold">
                      {(result.performanceRatio * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      System efficiency
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-muted-foreground">GHI</div>
                    <div className="font-medium">
                      {result.annualGHI?.toFixed(0) ?? '-'} kWh/m²
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Tilt</div>
                    <div className="font-medium">{result.tiltAngle}°</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Azimuth</div>
                    <div className="font-medium">{result.azimuth}°</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleCalculate} disabled={!canCalculate || isCalculating}>
            {isCalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                {result ? 'Recalculate' : 'Calculate Yield'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
