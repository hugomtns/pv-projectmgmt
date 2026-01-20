/**
 * GenerateDesignDialog - Configure and generate preliminary design from site
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ModuleSelector } from './ModuleSelector';
import { useDesignStore } from '@/stores/designStore';
import { useComponentStore } from '@/stores/componentStore';
import { useUserStore } from '@/stores/userStore';
import { generatePanelLayout, estimatePanelCount } from '@/lib/layout';
import { squareMetersToAcres } from '@/lib/kml/parser';
import {
  DEFAULT_LAYOUT_PARAMETERS,
  LAYOUT_PARAMETER_LIMITS,
  LAYOUT_PARAMETER_DESCRIPTIONS,
} from '@/lib/types/layout';
import type { Site } from '@/lib/types/site';
import type { ModuleInput, LayoutParameters } from '@/lib/types/layout';
import { Zap, Grid3X3, Percent, Ruler, LayoutGrid, Info } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateDesignDialogProps {
  site: Site;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_MODULE: ModuleInput = {
  source: 'manual',
  name: 'Generic 665W Module',
  widthMm: 1134,
  lengthMm: 2384,
  wattage: 665,
};

export function GenerateDesignDialog({
  site,
  open,
  onOpenChange,
}: GenerateDesignDialogProps) {
  const navigate = useNavigate();
  const [module, setModule] = useState<ModuleInput>(DEFAULT_MODULE);
  const [parameters, setParameters] = useState<LayoutParameters>(
    DEFAULT_LAYOUT_PARAMETERS
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const addDesign = useDesignStore((state) => state.addDesign);
  const linkDesignToComponent = useComponentStore(
    (state) => state.linkDesignToComponent
  );
  const currentUser = useUserStore((state) => state.currentUser);

  // Calculate usable area in square meters
  const usableAreaSqm = site.usableArea ?? site.totalArea ?? 0;
  const usableAreaAcres = squareMetersToAcres(usableAreaSqm);

  // Live estimate based on parameters
  const estimate = useMemo(() => {
    if (!module.wattage || !module.lengthMm || !module.widthMm) {
      return { panelCount: 0, dcCapacityKw: 0, dcCapacityMw: 0 };
    }
    return estimatePanelCount(usableAreaSqm, module, parameters.gcr);
  }, [usableAreaSqm, module, parameters.gcr]);

  const handleParameterChange = useCallback(
    (param: keyof LayoutParameters, value: number) => {
      setParameters((prev) => ({ ...prev, [param]: value }));
    },
    []
  );

  const handleGenerate = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to create designs');
      return;
    }

    if (!module.name || !module.wattage || !module.lengthMm || !module.widthMm) {
      toast.error('Please enter valid module specifications');
      return;
    }

    setIsGenerating(true);

    try {
      // Generate the layout
      const layout = generatePanelLayout(site, module, parameters);

      // Create the design
      const designId = addDesign({
        projectId: site.projectId,
        name: `${site.name} - Preliminary Layout`,
        description: `Auto-generated layout: ${layout.summary.totalPanels.toLocaleString()} panels, ${layout.summary.dcCapacityMw.toFixed(2)} MW DC`,
        siteId: site.id,
        generatedLayout: layout,
        gpsCoordinates: site.centroid
          ? {
              latitude: site.centroid.latitude,
              longitude: site.centroid.longitude,
            }
          : undefined,
      });

      if (!designId) {
        toast.error('Failed to create design');
        return;
      }

      // Link to component library if module from library
      if (module.source === 'library' && module.componentId) {
        linkDesignToComponent(module.componentId, designId, layout.summary.totalPanels);
      }

      toast.success(
        `Design created: ${layout.summary.totalPanels.toLocaleString()} panels, ${layout.summary.dcCapacityMw.toFixed(2)} MW`
      );

      onOpenChange(false);

      // Navigate to the new design
      navigate(`/designs/${designId}`);
    } catch (error) {
      console.error('Layout generation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate layout'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Generate Preliminary Design
          </DialogTitle>
          <DialogDescription>
            Create an auto-generated panel layout for {site.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Site summary */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium mb-2">Site: {site.name}</div>
            <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
              <div>
                Usable Area:{' '}
                <span className="text-foreground font-medium">
                  {usableAreaAcres.toFixed(1)} acres
                </span>
              </div>
              <div>
                Exclusions:{' '}
                <span className="text-foreground font-medium">
                  {site.exclusionZones.length}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Module selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Grid3X3 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Panel Specifications</Label>
            </div>
            <ModuleSelector value={module} onChange={setModule} />
          </div>

          <Separator />

          {/* Layout parameters */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Layout Parameters</Label>
            </div>

            {/* Tilt Angle */}
            <ParameterSlider
              label="Tilt Angle"
              value={parameters.tiltAngle}
              onChange={(v) => handleParameterChange('tiltAngle', v)}
              min={LAYOUT_PARAMETER_LIMITS.tiltAngle.min}
              max={LAYOUT_PARAMETER_LIMITS.tiltAngle.max}
              step={LAYOUT_PARAMETER_LIMITS.tiltAngle.step}
              unit="°"
              description={LAYOUT_PARAMETER_DESCRIPTIONS.tiltAngle}
            />

            {/* GCR */}
            <ParameterSlider
              label="Ground Coverage Ratio (GCR)"
              value={parameters.gcr}
              onChange={(v) => handleParameterChange('gcr', v)}
              min={LAYOUT_PARAMETER_LIMITS.gcr.min}
              max={LAYOUT_PARAMETER_LIMITS.gcr.max}
              step={LAYOUT_PARAMETER_LIMITS.gcr.step}
              unit=""
              displayValue={(v) => v.toFixed(2)}
              description={LAYOUT_PARAMETER_DESCRIPTIONS.gcr}
              icon={<Percent className="h-3 w-3" />}
            />

            {/* Boundary Setback */}
            <ParameterSlider
              label="Boundary Setback"
              value={parameters.boundarySetbackM}
              onChange={(v) => handleParameterChange('boundarySetbackM', v)}
              min={LAYOUT_PARAMETER_LIMITS.boundarySetbackM.min}
              max={LAYOUT_PARAMETER_LIMITS.boundarySetbackM.max}
              step={LAYOUT_PARAMETER_LIMITS.boundarySetbackM.step}
              unit="m"
              description={LAYOUT_PARAMETER_DESCRIPTIONS.boundarySetbackM}
              icon={<Ruler className="h-3 w-3" />}
            />

            {/* Row Gap */}
            <ParameterSlider
              label="Row Gap"
              value={parameters.rowGapM}
              onChange={(v) => handleParameterChange('rowGapM', v)}
              min={LAYOUT_PARAMETER_LIMITS.rowGapM.min}
              max={LAYOUT_PARAMETER_LIMITS.rowGapM.max}
              step={LAYOUT_PARAMETER_LIMITS.rowGapM.step}
              unit="m"
              description={LAYOUT_PARAMETER_DESCRIPTIONS.rowGapM}
            />

            {/* Azimuth - simplified for now */}
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Azimuth fixed at 180° (south-facing). More options coming soon.
            </div>
          </div>

          <Separator />

          {/* Estimate summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="text-sm font-medium mb-3 text-primary">
              Estimated Output
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">
                  {estimate.panelCount.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Panels</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {estimate.dcCapacityMw.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">MW DC</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {(estimate.dcCapacityKw / usableAreaAcres).toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">kW/acre</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !module.wattage}
          >
            {isGenerating ? 'Generating...' : 'Create Design'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Reusable parameter slider component
 */
interface ParameterSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  description?: string;
  displayValue?: (value: number) => string;
  icon?: React.ReactNode;
}

function ParameterSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  description,
  displayValue,
  icon,
}: ParameterSliderProps) {
  const display = displayValue ? displayValue(value) : value.toString();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm flex items-center gap-1.5">
          {icon}
          {label}
        </Label>
        <span className="text-sm font-medium tabular-nums">
          {display}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
