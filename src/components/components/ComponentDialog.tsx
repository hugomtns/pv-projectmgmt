import { useState, useEffect } from 'react';
import { useComponentStore } from '@/stores/componentStore';
import type {
  Component,
  ComponentType,
  ModuleSpecs,
  InverterSpecs,
  DesignUsage,
} from '@/lib/types/component';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CELL_TYPES, INVERTER_TYPES, CURRENCIES } from '@/lib/types/component';
import { Box, Zap, FileBox, Upload } from 'lucide-react';

// Pre-filled data from design import or PAN file
export interface PrefilledComponentData {
  type: 'module' | 'inverter';
  linkedDesigns?: DesignUsage[];
  // From DXF import
  widthMm?: number | null;
  heightMm?: number | null;
  // From PAN file import
  manufacturer?: string;
  model?: string;
  specs?: Partial<ModuleSpecs>;
  fromPAN?: boolean;
}

interface ComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component?: Component | null;
  prefilledData?: PrefilledComponentData | null;
}

export function ComponentDialog({ open, onOpenChange, component, prefilledData }: ComponentDialogProps) {
  const addComponent = useComponentStore((state) => state.addComponent);
  const updateComponent = useComponentStore((state) => state.updateComponent);

  const isEditing = !!component;
  const isFromDesign = !!prefilledData && !prefilledData.fromPAN;
  const isFromPAN = !!prefilledData?.fromPAN;
  const [componentType, setComponentType] = useState<ComponentType>('module');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [linkedDesigns, setLinkedDesigns] = useState<DesignUsage[]>([]);

  // Module specs
  const [moduleSpecs, setModuleSpecs] = useState<ModuleSpecs>({
    length: 2278,
    width: 1134,
    thickness: 30,
    weight: 28,
    powerRating: 580,
    voc: 51.5,
    isc: 14.35,
    vmp: 43.2,
    imp: 13.43,
    efficiency: 22.5,
    cellType: 'mono-Si',
    cellCount: 144,
    bifacial: true,
    bifacialityFactor: 0.7,
    tempCoeffPmax: -0.34,
    tempCoeffVoc: -0.25,
    tempCoeffIsc: 0.04,
  });

  // Inverter specs
  const [inverterSpecs, setInverterSpecs] = useState<InverterSpecs>({
    length: 1055,
    width: 660,
    height: 2094,
    weight: 1850,
    maxDcPower: 5500,
    maxDcVoltage: 1500,
    mpptVoltageMin: 860,
    mpptVoltageMax: 1300,
    maxDcCurrent: 6500,
    mpptCount: 18,
    stringsPerMppt: 24,
    acPowerRating: 5000,
    acVoltage: 690,
    acFrequency: 50,
    maxAcCurrent: 4184,
    maxEfficiency: 98.9,
    euroEfficiency: 98.7,
    inverterType: 'central',
  });

  // Reset form when dialog opens/closes or component changes
  useEffect(() => {
    if (open) {
      if (component) {
        // Editing existing component
        setComponentType(component.type);
        setManufacturer(component.manufacturer);
        setModel(component.model);
        setUnitPrice(component.unitPrice);
        setCurrency(component.currency);
        setLinkedDesigns(component.linkedDesigns || []);
        if (component.type === 'module') {
          setModuleSpecs(component.specs as ModuleSpecs);
        } else {
          setInverterSpecs(component.specs as InverterSpecs);
        }
      } else if (prefilledData) {
        // Importing from design or PAN file - use prefilled data
        setComponentType(prefilledData.type);
        setManufacturer(prefilledData.manufacturer || '');
        setModel(prefilledData.model || '');
        setUnitPrice(0);
        setCurrency('USD');
        setLinkedDesigns(prefilledData.linkedDesigns || []);

        if (prefilledData.type === 'module') {
          // If from PAN file, use all extracted specs
          if (prefilledData.fromPAN && prefilledData.specs) {
            const panSpecs = prefilledData.specs;
            setModuleSpecs({
              length: panSpecs.length ?? 2278,
              width: panSpecs.width ?? 1134,
              thickness: panSpecs.thickness ?? 30,
              weight: panSpecs.weight ?? 28,
              powerRating: panSpecs.powerRating ?? 580,
              voc: panSpecs.voc ?? 51.5,
              isc: panSpecs.isc ?? 14.35,
              vmp: panSpecs.vmp ?? 43.2,
              imp: panSpecs.imp ?? 13.43,
              efficiency: panSpecs.efficiency ?? 22.5,
              cellType: panSpecs.cellType ?? 'mono-Si',
              cellCount: panSpecs.cellCount ?? 144,
              bifacial: panSpecs.bifacial ?? false,
              bifacialityFactor: panSpecs.bifacialityFactor,
              tempCoeffPmax: panSpecs.tempCoeffPmax ?? -0.34,
              tempCoeffVoc: panSpecs.tempCoeffVoc ?? -0.25,
              tempCoeffIsc: panSpecs.tempCoeffIsc ?? 0.04,
            });
          } else {
            // Use extracted dimensions from DXF if available, otherwise defaults
            setModuleSpecs({
              length: prefilledData.heightMm || 2278,
              width: prefilledData.widthMm || 1134,
              thickness: 30,
              weight: 28,
              powerRating: 580,
              voc: 51.5,
              isc: 14.35,
              vmp: 43.2,
              imp: 13.43,
              efficiency: 22.5,
              cellType: 'mono-Si',
              cellCount: 144,
              bifacial: true,
              bifacialityFactor: 0.7,
              tempCoeffPmax: -0.34,
              tempCoeffVoc: -0.25,
              tempCoeffIsc: 0.04,
            });
          }
        } else {
          setInverterSpecs({
            length: 1055,
            width: 660,
            height: 2094,
            weight: 1850,
            maxDcPower: 5500,
            maxDcVoltage: 1500,
            mpptVoltageMin: 860,
            mpptVoltageMax: 1300,
            maxDcCurrent: 6500,
            mpptCount: 18,
            stringsPerMppt: 24,
            acPowerRating: 5000,
            acVoltage: 690,
            acFrequency: 50,
            maxAcCurrent: 4184,
            maxEfficiency: 98.9,
            euroEfficiency: 98.7,
            inverterType: 'central',
          });
        }
      } else {
        // Creating new component - reset to defaults
        setComponentType('module');
        setManufacturer('');
        setModel('');
        setUnitPrice(0);
        setCurrency('USD');
        setLinkedDesigns([]);
        setModuleSpecs({
          length: 2278,
          width: 1134,
          thickness: 30,
          weight: 28,
          powerRating: 580,
          voc: 51.5,
          isc: 14.35,
          vmp: 43.2,
          imp: 13.43,
          efficiency: 22.5,
          cellType: 'mono-Si',
          cellCount: 144,
          bifacial: true,
          bifacialityFactor: 0.7,
          tempCoeffPmax: -0.34,
          tempCoeffVoc: -0.25,
          tempCoeffIsc: 0.04,
        });
        setInverterSpecs({
          length: 1055,
          width: 660,
          height: 2094,
          weight: 1850,
          maxDcPower: 5500,
          maxDcVoltage: 1500,
          mpptVoltageMin: 860,
          mpptVoltageMax: 1300,
          maxDcCurrent: 6500,
          mpptCount: 18,
          stringsPerMppt: 24,
          acPowerRating: 5000,
          acVoltage: 690,
          acFrequency: 50,
          maxAcCurrent: 4184,
          maxEfficiency: 98.9,
          euroEfficiency: 98.7,
          inverterType: 'central',
        });
      }
    }
  }, [open, component, prefilledData]);

  const handleSubmit = () => {
    if (!manufacturer.trim() || !model.trim()) return;

    const specs = componentType === 'module' ? moduleSpecs : inverterSpecs;

    if (isEditing && component) {
      updateComponent(component.id, {
        manufacturer,
        model,
        unitPrice,
        currency,
        specs,
      });
    } else {
      addComponent(componentType, {
        manufacturer,
        model,
        unitPrice,
        currency,
        specs,
        linkedDesigns,
      });
    }

    onOpenChange(false);
  };

  const updateModuleSpec = <K extends keyof ModuleSpecs>(key: K, value: ModuleSpecs[K]) => {
    setModuleSpecs((prev) => ({ ...prev, [key]: value }));
  };

  const updateInverterSpec = <K extends keyof InverterSpecs>(key: K, value: InverterSpecs[K]) => {
    setInverterSpecs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? 'Edit Component'
              : isFromPAN
              ? 'Add Module from PAN File'
              : isFromDesign
              ? 'Add Component from Design'
              : 'Add New Component'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the component specifications and pricing.'
              : isFromPAN
              ? 'Review the extracted specifications and adjust if needed.'
              : isFromDesign
              ? 'Enter manufacturer and model. Specifications can be added later.'
              : 'Add a PV module or inverter to your component library.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Import from PAN file info */}
          {isFromPAN && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Upload className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                Specifications extracted from PAN file. All fields are editable.
              </span>
            </div>
          )}

          {/* Import from design info */}
          {isFromDesign && (
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <FileBox className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                Importing from design with {linkedDesigns[0]?.quantity.toLocaleString()} {componentType === 'module' ? 'modules' : 'inverters'}
              </span>
            </div>
          )}

          {/* Component Type Selection - only for new components without prefill */}
          {!isEditing && !isFromDesign && !isFromPAN && (
            <div className="space-y-2">
              <Label>Component Type</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={componentType === 'module' ? 'default' : 'outline'}
                  className="flex-1 gap-2"
                  onClick={() => setComponentType('module')}
                >
                  <Box className="h-4 w-4" />
                  PV Module
                </Button>
                <Button
                  type="button"
                  variant={componentType === 'inverter' ? 'default' : 'outline'}
                  className="flex-1 gap-2"
                  onClick={() => setComponentType('inverter')}
                >
                  <Zap className="h-4 w-4" />
                  Inverter
                </Button>
              </div>
            </div>
          )}

          {/* Show locked type when from design or PAN */}
          {!isEditing && (isFromDesign || isFromPAN) && (
            <div className="space-y-2">
              <Label>Component Type</Label>
              <div className="flex gap-4">
                <Badge variant="secondary" className="gap-2 px-4 py-2">
                  {componentType === 'module' ? (
                    <>
                      <Box className="h-4 w-4" />
                      PV Module
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Inverter
                    </>
                  )}
                </Badge>
              </div>
            </div>
          )}

          {/* General Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer *</Label>
              <Input
                id="manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g., Trina Solar, Huawei"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., TSM-DE21, SUN2000-330KTL"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price</Label>
              <Input
                id="unitPrice"
                type="number"
                min={0}
                step={0.01}
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Specification Tabs */}
          {componentType === 'module' ? (
            <ModuleSpecsForm specs={moduleSpecs} onUpdate={updateModuleSpec} />
          ) : (
            <InverterSpecsForm specs={inverterSpecs} onUpdate={updateInverterSpec} />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!manufacturer.trim() || !model.trim()}
          >
            {isEditing ? 'Save Changes' : 'Add Component'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Module Specs Form
interface ModuleSpecsFormProps {
  specs: ModuleSpecs;
  onUpdate: <K extends keyof ModuleSpecs>(key: K, value: ModuleSpecs[K]) => void;
}

function ModuleSpecsForm({ specs, onUpdate }: ModuleSpecsFormProps) {
  return (
    <Tabs defaultValue="electrical" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="electrical">Electrical</TabsTrigger>
        <TabsTrigger value="physical">Physical</TabsTrigger>
        <TabsTrigger value="cell">Cell Info</TabsTrigger>
        <TabsTrigger value="temperature">Temperature</TabsTrigger>
      </TabsList>

      <TabsContent value="electrical" className="space-y-4 pt-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="powerRating">Power Rating (Wp)</Label>
            <Input
              id="powerRating"
              type="number"
              value={specs.powerRating}
              onChange={(e) => onUpdate('powerRating', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="efficiency">Efficiency (%)</Label>
            <Input
              id="efficiency"
              type="number"
              step={0.1}
              value={specs.efficiency}
              onChange={(e) => onUpdate('efficiency', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voc">Voc (V)</Label>
            <Input
              id="voc"
              type="number"
              step={0.1}
              value={specs.voc}
              onChange={(e) => onUpdate('voc', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="isc">Isc (A)</Label>
            <Input
              id="isc"
              type="number"
              step={0.01}
              value={specs.isc}
              onChange={(e) => onUpdate('isc', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vmp">Vmp (V)</Label>
            <Input
              id="vmp"
              type="number"
              step={0.1}
              value={specs.vmp}
              onChange={(e) => onUpdate('vmp', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imp">Imp (A)</Label>
            <Input
              id="imp"
              type="number"
              step={0.01}
              value={specs.imp}
              onChange={(e) => onUpdate('imp', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="physical" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="length">Length (mm)</Label>
            <Input
              id="length"
              type="number"
              value={specs.length}
              onChange={(e) => onUpdate('length', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Width (mm)</Label>
            <Input
              id="width"
              type="number"
              value={specs.width}
              onChange={(e) => onUpdate('width', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thickness">Thickness (mm)</Label>
            <Input
              id="thickness"
              type="number"
              value={specs.thickness || ''}
              onChange={(e) => onUpdate('thickness', parseInt(e.target.value) || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              step={0.1}
              value={specs.weight || ''}
              onChange={(e) => onUpdate('weight', parseFloat(e.target.value) || undefined)}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="cell" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cellType">Cell Type</Label>
            <Select
              value={specs.cellType || ''}
              onValueChange={(v) => onUpdate('cellType', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cell type" />
              </SelectTrigger>
              <SelectContent>
                {CELL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cellCount">Cell Count</Label>
            <Input
              id="cellCount"
              type="number"
              value={specs.cellCount || ''}
              onChange={(e) => onUpdate('cellCount', parseInt(e.target.value) || undefined)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="bifacial">Bifacial</Label>
            <p className="text-sm text-muted-foreground">
              Module can generate power from both sides
            </p>
          </div>
          <Switch
            id="bifacial"
            checked={specs.bifacial || false}
            onCheckedChange={(checked) => onUpdate('bifacial', checked)}
          />
        </div>
        {specs.bifacial && (
          <div className="space-y-2">
            <Label htmlFor="bifacialityFactor">Bifaciality Factor (0-1)</Label>
            <Input
              id="bifacialityFactor"
              type="number"
              step={0.01}
              min={0}
              max={1}
              value={specs.bifacialityFactor || ''}
              onChange={(e) => onUpdate('bifacialityFactor', parseFloat(e.target.value) || undefined)}
            />
          </div>
        )}
      </TabsContent>

      <TabsContent value="temperature" className="space-y-4 pt-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tempCoeffPmax">Pmax Coeff (%/C)</Label>
            <Input
              id="tempCoeffPmax"
              type="number"
              step={0.01}
              value={specs.tempCoeffPmax || ''}
              onChange={(e) => onUpdate('tempCoeffPmax', parseFloat(e.target.value) || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tempCoeffVoc">Voc Coeff (%/C)</Label>
            <Input
              id="tempCoeffVoc"
              type="number"
              step={0.01}
              value={specs.tempCoeffVoc || ''}
              onChange={(e) => onUpdate('tempCoeffVoc', parseFloat(e.target.value) || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tempCoeffIsc">Isc Coeff (%/C)</Label>
            <Input
              id="tempCoeffIsc"
              type="number"
              step={0.01}
              value={specs.tempCoeffIsc || ''}
              onChange={(e) => onUpdate('tempCoeffIsc', parseFloat(e.target.value) || undefined)}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Temperature coefficients define how module performance changes with temperature.
          Negative values for Pmax and Voc indicate power/voltage decreases as temperature rises.
        </p>
      </TabsContent>
    </Tabs>
  );
}

// Inverter Specs Form
interface InverterSpecsFormProps {
  specs: InverterSpecs;
  onUpdate: <K extends keyof InverterSpecs>(key: K, value: InverterSpecs[K]) => void;
}

function InverterSpecsForm({ specs, onUpdate }: InverterSpecsFormProps) {
  return (
    <Tabs defaultValue="dc" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="dc">DC Input</TabsTrigger>
        <TabsTrigger value="ac">AC Output</TabsTrigger>
        <TabsTrigger value="physical">Physical</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="dc" className="space-y-4 pt-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxDcPower">Max DC Power (kW)</Label>
            <Input
              id="maxDcPower"
              type="number"
              value={specs.maxDcPower}
              onChange={(e) => onUpdate('maxDcPower', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxDcVoltage">Max DC Voltage (V)</Label>
            <Input
              id="maxDcVoltage"
              type="number"
              value={specs.maxDcVoltage}
              onChange={(e) => onUpdate('maxDcVoltage', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxDcCurrent">Max DC Current (A)</Label>
            <Input
              id="maxDcCurrent"
              type="number"
              value={specs.maxDcCurrent}
              onChange={(e) => onUpdate('maxDcCurrent', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpptVoltageMin">MPPT Min (V)</Label>
            <Input
              id="mpptVoltageMin"
              type="number"
              value={specs.mpptVoltageMin}
              onChange={(e) => onUpdate('mpptVoltageMin', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpptVoltageMax">MPPT Max (V)</Label>
            <Input
              id="mpptVoltageMax"
              type="number"
              value={specs.mpptVoltageMax}
              onChange={(e) => onUpdate('mpptVoltageMax', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpptCount">MPPT Count</Label>
            <Input
              id="mpptCount"
              type="number"
              value={specs.mpptCount}
              onChange={(e) => onUpdate('mpptCount', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stringsPerMppt">Strings per MPPT</Label>
            <Input
              id="stringsPerMppt"
              type="number"
              value={specs.stringsPerMppt || ''}
              onChange={(e) => onUpdate('stringsPerMppt', parseInt(e.target.value) || undefined)}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="ac" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="acPowerRating">AC Power Rating (kW)</Label>
            <Input
              id="acPowerRating"
              type="number"
              value={specs.acPowerRating}
              onChange={(e) => onUpdate('acPowerRating', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acVoltage">AC Voltage (V)</Label>
            <Input
              id="acVoltage"
              type="number"
              value={specs.acVoltage}
              onChange={(e) => onUpdate('acVoltage', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acFrequency">Frequency (Hz)</Label>
            <Select
              value={specs.acFrequency?.toString() || ''}
              onValueChange={(v) => onUpdate('acFrequency', parseInt(v) || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 Hz</SelectItem>
                <SelectItem value="60">60 Hz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxAcCurrent">Max AC Current (A)</Label>
            <Input
              id="maxAcCurrent"
              type="number"
              value={specs.maxAcCurrent || ''}
              onChange={(e) => onUpdate('maxAcCurrent', parseFloat(e.target.value) || undefined)}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="physical" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="length">Length (mm)</Label>
            <Input
              id="length"
              type="number"
              value={specs.length || ''}
              onChange={(e) => onUpdate('length', parseInt(e.target.value) || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Width (mm)</Label>
            <Input
              id="width"
              type="number"
              value={specs.width || ''}
              onChange={(e) => onUpdate('width', parseInt(e.target.value) || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (mm)</Label>
            <Input
              id="height"
              type="number"
              value={specs.height || ''}
              onChange={(e) => onUpdate('height', parseInt(e.target.value) || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              step={0.1}
              value={specs.weight || ''}
              onChange={(e) => onUpdate('weight', parseFloat(e.target.value) || undefined)}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="performance" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxEfficiency">Max Efficiency (%)</Label>
            <Input
              id="maxEfficiency"
              type="number"
              step={0.1}
              value={specs.maxEfficiency}
              onChange={(e) => onUpdate('maxEfficiency', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="euroEfficiency">Euro Efficiency (%)</Label>
            <Input
              id="euroEfficiency"
              type="number"
              step={0.1}
              value={specs.euroEfficiency || ''}
              onChange={(e) => onUpdate('euroEfficiency', parseFloat(e.target.value) || undefined)}
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="inverterType">Inverter Type</Label>
            <Select
              value={specs.inverterType || ''}
              onValueChange={(v) => onUpdate('inverterType', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select inverter type" />
              </SelectTrigger>
              <SelectContent>
                {INVERTER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Euro efficiency is a weighted average based on typical European irradiance conditions.
        </p>
      </TabsContent>
    </Tabs>
  );
}
