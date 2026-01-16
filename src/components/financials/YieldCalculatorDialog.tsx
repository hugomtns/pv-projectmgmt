import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  MapPin,
  HelpCircle,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sun,
  Thermometer,
  Zap,
} from 'lucide-react';
import { useFinancialStore } from '@/stores/financialStore';
import { useDesignStore } from '@/stores/designStore';
import { useSiteStore } from '@/stores/siteStore';
import { useComponentStore } from '@/stores/componentStore';
import type { YieldEstimate } from '@/lib/yield/types';
import {
  getOptimalTilt,
  getOptimalAzimuth,
  formatYield,
  getSourceDescription,
  formatLossBreakdown,
} from '@/lib/yield';
import { cn } from '@/lib/utils';

interface YieldCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: string;
  projectId: string;
}

export function YieldCalculatorDialog({
  open,
  onOpenChange,
  modelId,
  projectId,
}: YieldCalculatorDialogProps) {
  // Stores
  const calculateYieldForModel = useFinancialStore((s) => s.calculateYieldForModel);
  const applyYieldEstimate = useFinancialStore((s) => s.applyYieldEstimate);
  const getModelById = useFinancialStore((s) => s.getModelById);
  const designs = useDesignStore((s) => s.designs);
  const sites = useSiteStore((s) => s.sites);
  const components = useComponentStore((s) => s.components);

  // Form state
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [tiltAngle, setTiltAngle] = useState('');
  const [azimuth, setAzimuth] = useState('');
  const [systemLosses, setSystemLosses] = useState('14');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [selectedDesignId, setSelectedDesignId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<YieldEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get project's designs and sites
  const projectDesigns = designs.filter((d) => d.projectId === projectId);
  const projectSites = sites.filter((s) => s.projectId === projectId);
  const model = getModelById(modelId);

  // Get modules from component library for PR calculation
  const modules = components.filter((c) => c.type === 'module');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);

      // Try to pre-fill from design or site
      const designWithCoords = projectDesigns.find((d) => d.gpsCoordinates);
      const siteWithCoords = projectSites.find((s) => s.centroid);

      if (designWithCoords?.gpsCoordinates) {
        setLatitude(designWithCoords.gpsCoordinates.latitude.toString());
        setLongitude(designWithCoords.gpsCoordinates.longitude.toString());
        setSelectedDesignId(designWithCoords.id);
        setSelectedSiteId('');
      } else if (siteWithCoords?.centroid) {
        setLatitude(siteWithCoords.centroid.latitude.toString());
        setLongitude(siteWithCoords.centroid.longitude.toString());
        setSelectedDesignId('');
        setSelectedSiteId(siteWithCoords.id);
      } else {
        setLatitude('');
        setLongitude('');
        setSelectedDesignId('');
        setSelectedSiteId('');
      }

      // Set optimal defaults based on latitude
      const lat = designWithCoords?.gpsCoordinates?.latitude ??
        siteWithCoords?.centroid?.latitude;
      if (lat) {
        setTiltAngle(getOptimalTilt(lat).toFixed(0));
        setAzimuth(getOptimalAzimuth(lat).toFixed(0));
      } else {
        setTiltAngle('');
        setAzimuth('');
      }

      setSystemLosses('14');
      setSelectedComponentId('');
    }
  }, [open, projectDesigns, projectSites]);

  // Update optimal tilt/azimuth when latitude changes
  useEffect(() => {
    const lat = parseFloat(latitude);
    if (!isNaN(lat) && lat >= -90 && lat <= 90) {
      if (!tiltAngle) {
        setTiltAngle(getOptimalTilt(lat).toFixed(0));
      }
      if (!azimuth) {
        setAzimuth(getOptimalAzimuth(lat).toFixed(0));
      }
    }
  }, [latitude]);

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    setResult(null);

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      setError('Please enter valid coordinates');
      setIsCalculating(false);
      return;
    }

    // Get component specs if selected (only modules have tempCoeffPmax)
    const selectedComponent = selectedComponentId
      ? components.find((c) => c.id === selectedComponentId)
      : undefined;

    // Extract module specs if we have a module with temp coefficient
    let moduleSpecs: { tempCoeffPmax: number } | undefined;
    if (selectedComponent?.type === 'module' && selectedComponent.specs.tempCoeffPmax !== undefined) {
      moduleSpecs = {
        tempCoeffPmax: selectedComponent.specs.tempCoeffPmax,
      };
    }

    try {
      const estimate = await calculateYieldForModel(modelId, {
        latitude: lat,
        longitude: lon,
        tiltAngle: tiltAngle ? parseFloat(tiltAngle) : undefined,
        azimuth: azimuth ? parseFloat(azimuth) : undefined,
        systemLosses: systemLosses ? parseFloat(systemLosses) : undefined,
        moduleSpecs,
      });

      if (estimate) {
        setResult(estimate);
      } else {
        setError('Failed to calculate yield. Please check your inputs.');
      }
    } catch (err) {
      setError('An error occurred during calculation');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleApply = () => {
    if (result) {
      applyYieldEstimate(modelId, result);
      onOpenChange(false);
    }
  };

  const isValid = latitude && longitude &&
    !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude)) &&
    parseFloat(latitude) >= -90 && parseFloat(latitude) <= 90 &&
    parseFloat(longitude) >= -180 && parseFloat(longitude) <= 180;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculate Yield from Location
          </DialogTitle>
          <DialogDescription>
            Estimate annual energy production based on location and system configuration.
            {model && ` System capacity: ${model.inputs.capacity} MW`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Location Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Location
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  placeholder="e.g., 37.7749"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  step="0.0001"
                  min={-90}
                  max={90}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  placeholder="e.g., -122.4194"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  step="0.0001"
                  min={-180}
                  max={180}
                />
              </div>
            </div>

            {/* Get coordinates from design or site */}
            {(projectDesigns.some(d => d.gpsCoordinates) || projectSites.some(s => s.centroid)) && (
              <div className="space-y-3">
                {projectDesigns.some(d => d.gpsCoordinates) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Get from design</Label>
                    <Select
                      value={selectedDesignId || '__none__'}
                      onValueChange={(value) => {
                        if (value === '__none__') return;
                        const design = projectDesigns.find(d => d.id === value);
                        if (design?.gpsCoordinates) {
                          setLatitude(design.gpsCoordinates.latitude.toString());
                          setLongitude(design.gpsCoordinates.longitude.toString());
                          setSelectedDesignId(design.id);
                          setSelectedSiteId('');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select design..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-muted-foreground">
                          Select design...
                        </SelectItem>
                        {projectDesigns
                          .filter((d) => d.gpsCoordinates)
                          .map((design) => (
                            <SelectItem key={design.id} value={design.id}>
                              {design.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {projectSites.some(s => s.centroid) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Get from site</Label>
                    <Select
                      value={selectedSiteId || '__none__'}
                      onValueChange={(value) => {
                        if (value === '__none__') return;
                        const site = projectSites.find(s => s.id === value);
                        if (site?.centroid) {
                          setLatitude(site.centroid.latitude.toString());
                          setLongitude(site.centroid.longitude.toString());
                          setSelectedDesignId('');
                          setSelectedSiteId(site.id);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select site..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-muted-foreground">
                          Select site...
                        </SelectItem>
                        {projectSites
                          .filter((s) => s.centroid)
                          .map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* System Configuration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label htmlFor="tilt">Tilt Angle</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">Panel tilt from horizontal (0-90°)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Input
                  id="tilt"
                  type="number"
                  placeholder="Auto"
                  value={tiltAngle}
                  onChange={(e) => setTiltAngle(e.target.value)}
                  step="1"
                  min={0}
                  max={90}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  °
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label htmlFor="azimuth">Azimuth</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">Compass direction (180° = South)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Input
                  id="azimuth"
                  type="number"
                  placeholder="Auto"
                  value={azimuth}
                  onChange={(e) => setAzimuth(e.target.value)}
                  step="1"
                  min={0}
                  max={360}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  °
                </span>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    advancedOpen && "rotate-180"
                  )}
                />
                Advanced Options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="losses">System Losses</Label>
                  <div className="relative">
                    <Input
                      id="losses"
                      type="number"
                      value={systemLosses}
                      onChange={(e) => setSystemLosses(e.target.value)}
                      step="1"
                      min={0}
                      max={50}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Module (for temp. coeff.)</Label>
                  <Select
                    value={selectedComponentId || '__default__'}
                    onValueChange={(v) => setSelectedComponentId(v === '__default__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Use default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Use default (-0.35%/°C)</SelectItem>
                      {modules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.manufacturer} {m.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Calculate Button */}
          <Button
            onClick={handleCalculate}
            disabled={!isValid || isCalculating}
            className="w-full"
          >
            {isCalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Yield
              </>
            )}
          </Button>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Calculation Complete
              </div>

              {/* Main Result */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" />
                    Annual Yield
                  </div>
                  <div className="text-2xl font-bold">
                    {formatYield(result.annualYield)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Sun className="h-3.5 w-3.5" />
                    Capacity Factor
                  </div>
                  <div className="text-2xl font-bold">
                    {model ? ((result.annualYield / (model.inputs.capacity * 1000 * 8760)) * 100).toFixed(1) : '-'}%
                  </div>
                </div>
              </div>

              {/* Secondary Info */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">GHI</div>
                  <div className="font-medium">{result.annualGHI.toFixed(0)} kWh/m²</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">PR</div>
                  <div className="font-medium">{(result.performanceRatio * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Source</div>
                  <div className="font-medium capitalize">{result.source}</div>
                </div>
              </div>

              {/* Monthly Breakdown (collapsed by default) */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto text-xs">
                    <ChevronDown className="h-3 w-3" />
                    Monthly Breakdown
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                      <div key={month} className="text-center p-1 bg-background rounded">
                        <div className="text-muted-foreground">{month}</div>
                        <div className="font-medium">
                          {(result.monthlyYield[i] / 1000).toFixed(0)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    Values in MWh
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Loss Breakdown */}
              {result.losses.totalLoss > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto text-xs">
                      <Thermometer className="h-3 w-3" />
                      Loss Breakdown ({result.losses.totalLoss.toFixed(1)}% total)
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-1 text-xs">
                      {formatLossBreakdown(result.losses).map((loss) => (
                        <div key={loss.name} className="flex justify-between">
                          <span className="text-muted-foreground">{loss.name}</span>
                          <span>{loss.formatted}</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <div className="text-xs text-muted-foreground">
                Data source: {getSourceDescription(result.source)}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!result}>
            Apply Estimate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
