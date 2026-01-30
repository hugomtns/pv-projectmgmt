import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Box,
  Zap,
  Check,
  Loader2,
  AlertTriangle,
  CircleHelp,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useSpecSheetParser, getStageMessage } from '@/hooks/useSpecSheetParser';
import type {
  SharedModuleSpecs,
  ModuleVariant,
  SharedInverterSpecs,
  InverterVariant,
  ConfidenceLevel,
  ExtractedField,
} from '@/lib/types/specSheetParsing';
import type { ComponentType } from '@/lib/types/component';
import { cn } from '@/lib/utils';
import { CELL_TYPES, INVERTER_TYPES } from '@/lib/types/component';

interface SpecSheetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModuleImport: (shared: SharedModuleSpecs, variants: ModuleVariant[], selectedIndices: number[]) => void;
  onInverterImport: (shared: SharedInverterSpecs, variants: InverterVariant[], selectedIndices: number[]) => void;
}

export function SpecSheetImportDialog({
  open,
  onOpenChange,
  onModuleImport,
  onInverterImport,
}: SpecSheetImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { stage, moduleResult, inverterResult, error, warnings, isConfigured, parseFile, reset } =
    useSpecSheetParser();

  // Component type selection
  const [componentType, setComponentType] = useState<ComponentType>('module');

  // Selection state for variants
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [sharedExpanded, setSharedExpanded] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      setSelectedIndices(new Set());
      setSharedExpanded(false);
      setComponentType('module');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open, reset]);

  // Select all variants by default when extraction completes
  useEffect(() => {
    if (moduleResult?.variants) {
      setSelectedIndices(new Set(moduleResult.variants.map((_, i) => i)));
    } else if (inverterResult?.variants) {
      setSelectedIndices(new Set(inverterResult.variants.map((_, i) => i)));
    }
  }, [moduleResult, inverterResult]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file, componentType);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      parseFile(file, componentType);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleImport = () => {
    if (componentType === 'module' && moduleResult) {
      onModuleImport(moduleResult.shared, moduleResult.variants, Array.from(selectedIndices));
      onOpenChange(false);
    } else if (componentType === 'inverter' && inverterResult) {
      onInverterImport(inverterResult.shared, inverterResult.variants, Array.from(selectedIndices));
      onOpenChange(false);
    }
  };

  const handleRetry = () => {
    reset();
    setSelectedIndices(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectAll = () => {
    const variants = componentType === 'module' ? moduleResult?.variants : inverterResult?.variants;
    if (variants) {
      setSelectedIndices(new Set(variants.map((_, i) => i)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const toggleVariant = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const isLoading = stage === 'reading-pdf' || stage === 'extracting-text' || stage === 'analyzing';
  const hasResult = componentType === 'module' ? !!moduleResult : !!inverterResult;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Import from Spec Sheet
          </DialogTitle>
          <DialogDescription>
            Upload a datasheet PDF to extract specifications using AI.
          </DialogDescription>
        </DialogHeader>

        {/* API Key Warning */}
        {!isConfigured && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <span className="text-sm text-destructive">
              Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.
            </span>
          </div>
        )}

        {/* Component Type Selector */}
        {isConfigured && stage === 'idle' && (
          <div className="space-y-3">
            <label className="text-sm font-medium">What type of component?</label>
            <Tabs value={componentType} onValueChange={(v) => setComponentType(v as ComponentType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="module" className="gap-2">
                  <Box className="h-4 w-4" />
                  Module
                </TabsTrigger>
                <TabsTrigger value="inverter" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Inverter
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Info Text */}
        {stage === 'idle' && isConfigured && (
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              {componentType === 'module'
                ? 'Upload a PDF datasheet from module manufacturers like JinkoSolar, LONGi, Trina Solar, etc.'
                : 'Upload a PDF datasheet from inverter manufacturers like Huawei, SMA, Sungrow, etc.'}
              {' '}The AI will extract:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {componentType === 'module' ? (
                <>
                  <li>All power variants from the spec sheet</li>
                  <li>Manufacturer and model information</li>
                  <li>Electrical parameters (Voc, Isc, Vmp, Imp, efficiency)</li>
                  <li>Physical dimensions and weight</li>
                  <li>Temperature coefficients</li>
                </>
              ) : (
                <>
                  <li>All power variants from the spec sheet</li>
                  <li>Manufacturer and model information</li>
                  <li>DC input specs (voltage, MPPT range, current)</li>
                  <li>AC output specs (voltage, frequency, current)</li>
                  <li>Efficiency and physical dimensions</li>
                </>
              )}
            </ul>
          </div>
        )}

        {/* Upload Area */}
        {(stage === 'idle' || stage === 'error') && isConfigured && (
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={handleBrowse}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Drop your PDF spec sheet here</p>
            <p className="text-xs text-muted-foreground">or click to browse</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <div>
              <p className="font-medium">{getStageMessage(stage)}</p>
              {stage === 'analyzing' && (
                <p className="text-sm text-muted-foreground mt-1">
                  This may take 10-30 seconds
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {stage === 'error' && error && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="flex-1 flex items-center justify-between">
              <span className="text-sm text-destructive">{error}</span>
              <Button variant="ghost" size="sm" onClick={handleRetry} className="ml-2">
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && stage === 'complete' && (
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-400">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Module Preview */}
        {stage === 'complete' && moduleResult && componentType === 'module' && (
          <ModulePreview
            result={moduleResult}
            selectedIndices={selectedIndices}
            sharedExpanded={sharedExpanded}
            setSharedExpanded={setSharedExpanded}
            toggleVariant={toggleVariant}
            handleSelectAll={handleSelectAll}
            handleDeselectAll={handleDeselectAll}
            handleRetry={handleRetry}
          />
        )}

        {/* Inverter Preview */}
        {stage === 'complete' && inverterResult && componentType === 'inverter' && (
          <InverterPreview
            result={inverterResult}
            selectedIndices={selectedIndices}
            sharedExpanded={sharedExpanded}
            setSharedExpanded={setSharedExpanded}
            toggleVariant={toggleVariant}
            handleSelectAll={handleSelectAll}
            handleDeselectAll={handleDeselectAll}
            handleRetry={handleRetry}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={stage !== 'complete' || !hasResult || selectedIndices.size === 0}
            className="gap-2"
          >
            {componentType === 'module' ? <Box className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            Import {selectedIndices.size} {componentType === 'module' ? 'Module' : 'Inverter'}
            {selectedIndices.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MODULE PREVIEW
// ============================================================================

interface ModulePreviewProps {
  result: { shared: SharedModuleSpecs; variants: ModuleVariant[] };
  selectedIndices: Set<number>;
  sharedExpanded: boolean;
  setSharedExpanded: (expanded: boolean) => void;
  toggleVariant: (index: number) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleRetry: () => void;
}

function ModulePreview({
  result,
  selectedIndices,
  sharedExpanded,
  setSharedExpanded,
  toggleVariant,
  handleSelectAll,
  handleDeselectAll,
  handleRetry,
}: ModulePreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
        <Check className="h-4 w-4" />
        Extracted: {result.shared.manufacturer.value || 'Unknown'} -{' '}
        {result.variants.length} model{result.variants.length !== 1 ? 's' : ''}
      </div>

      {/* Shared Specifications (Collapsible) */}
      <Collapsible open={sharedExpanded} onOpenChange={setSharedExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start p-2 h-auto">
            {sharedExpanded ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            <span className="text-sm font-medium">Shared Specifications</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {formatModuleDimensions(result.shared)} | {getCellTypeLabel(result.shared.cellType.value)} |{' '}
              {result.shared.bifacial.value ? 'Bifacial' : 'Monofacial'}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4 mt-2">
            <SpecSection title="Physical">
              <SpecRow label="Length" field={result.shared.length} unit="mm" />
              <SpecRow label="Width" field={result.shared.width} unit="mm" />
              <SpecRow label="Thickness" field={result.shared.thickness} unit="mm" />
              <SpecRow label="Weight" field={result.shared.weight} unit="kg" />
            </SpecSection>
            <SpecSection title="Cell Info">
              <SpecRow
                label="Cell Type"
                field={result.shared.cellType}
                formatter={(v) => getCellTypeLabel(v as string)}
              />
              <SpecRow label="Cell Count" field={result.shared.cellCount} />
              <SpecRow
                label="Bifacial"
                field={result.shared.bifacial}
                formatter={(v) => (v ? 'Yes' : 'No')}
              />
              <SpecRow
                label="Bifaciality"
                field={result.shared.bifacialityFactor}
                formatter={(v) => `${((v as number) * 100).toFixed(0)}%`}
              />
            </SpecSection>
            <SpecSection title="Temperature Coefficients">
              <SpecRow label="Pmax" field={result.shared.tempCoeffPmax} unit="%/°C" />
              <SpecRow label="Voc" field={result.shared.tempCoeffVoc} unit="%/°C" />
              <SpecRow label="Isc" field={result.shared.tempCoeffIsc} unit="%/°C" />
            </SpecSection>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Variant Selection Table */}
      <VariantTable
        variants={result.variants}
        selectedIndices={selectedIndices}
        toggleVariant={toggleVariant}
        handleSelectAll={handleSelectAll}
        handleDeselectAll={handleDeselectAll}
        columns={[
          { key: 'model', label: 'Model', align: 'left', render: (v: ModuleVariant) => v.model.value || 'Unknown' },
          { key: 'power', label: 'Power', align: 'right', render: (v: ModuleVariant) => v.powerRating.value ? `${v.powerRating.value} Wp` : '-' },
          { key: 'eff', label: 'Eff.', align: 'right', render: (v: ModuleVariant) => v.efficiency.value ? `${v.efficiency.value}%` : '-' },
          { key: 'voc', label: 'Voc', align: 'right', render: (v: ModuleVariant) => v.voc.value ? `${v.voc.value} V` : '-' },
          { key: 'isc', label: 'Isc', align: 'right', render: (v: ModuleVariant) => v.isc.value ? `${v.isc.value} A` : '-' },
        ]}
      />

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleRetry}>
          Upload Different File
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// INVERTER PREVIEW
// ============================================================================

interface InverterPreviewProps {
  result: { shared: SharedInverterSpecs; variants: InverterVariant[] };
  selectedIndices: Set<number>;
  sharedExpanded: boolean;
  setSharedExpanded: (expanded: boolean) => void;
  toggleVariant: (index: number) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleRetry: () => void;
}

function InverterPreview({
  result,
  selectedIndices,
  sharedExpanded,
  setSharedExpanded,
  toggleVariant,
  handleSelectAll,
  handleDeselectAll,
  handleRetry,
}: InverterPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
        <Check className="h-4 w-4" />
        Extracted: {result.shared.manufacturer.value || 'Unknown'} -{' '}
        {result.variants.length} model{result.variants.length !== 1 ? 's' : ''}
      </div>

      {/* Shared Specifications (Collapsible) */}
      <Collapsible open={sharedExpanded} onOpenChange={setSharedExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start p-2 h-auto">
            {sharedExpanded ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            <span className="text-sm font-medium">Shared Specifications</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {result.shared.maxDcVoltage.value ? `${result.shared.maxDcVoltage.value}V DC` : ''} |{' '}
              {result.shared.mpptCount.value ? `${result.shared.mpptCount.value} MPPT` : ''} |{' '}
              {result.shared.maxEfficiency.value ? `${result.shared.maxEfficiency.value}% eff` : ''}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4 mt-2">
            <SpecSection title="DC Input">
              <SpecRow label="Max DC Voltage" field={result.shared.maxDcVoltage} unit="V" />
              <SpecRow label="MPPT Min" field={result.shared.mpptVoltageMin} unit="V" />
              <SpecRow label="MPPT Max" field={result.shared.mpptVoltageMax} unit="V" />
              <SpecRow label="MPPT Count" field={result.shared.mpptCount} />
              <SpecRow label="Strings/MPPT" field={result.shared.stringsPerMppt} />
            </SpecSection>
            <SpecSection title="AC Output">
              <SpecRow label="AC Voltage" field={result.shared.acVoltage} unit="V" />
              <SpecRow label="Frequency" field={result.shared.acFrequency} unit="Hz" />
            </SpecSection>
            <SpecSection title="Performance">
              <SpecRow label="Max Efficiency" field={result.shared.maxEfficiency} unit="%" />
              <SpecRow label="Euro Efficiency" field={result.shared.euroEfficiency} unit="%" />
            </SpecSection>
            <SpecSection title="Physical">
              <SpecRow label="Length" field={result.shared.length} unit="mm" />
              <SpecRow label="Width" field={result.shared.width} unit="mm" />
              <SpecRow label="Height" field={result.shared.height} unit="mm" />
              <SpecRow label="Weight" field={result.shared.weight} unit="kg" />
            </SpecSection>
            <SpecSection title="Type">
              <SpecRow
                label="Inverter Type"
                field={result.shared.inverterType}
                formatter={(v) => getInverterTypeLabel(v as string)}
              />
            </SpecSection>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Variant Selection Table */}
      <VariantTable
        variants={result.variants}
        selectedIndices={selectedIndices}
        toggleVariant={toggleVariant}
        handleSelectAll={handleSelectAll}
        handleDeselectAll={handleDeselectAll}
        columns={[
          { key: 'model', label: 'Model', align: 'left', render: (v: InverterVariant) => v.model.value || 'Unknown' },
          { key: 'power', label: 'AC Power', align: 'right', render: (v: InverterVariant) => v.acPowerRating.value ? `${v.acPowerRating.value} kW` : '-' },
          { key: 'dcCurrent', label: 'DC Current', align: 'right', render: (v: InverterVariant) => v.maxDcCurrent.value ? `${v.maxDcCurrent.value} A` : '-' },
          { key: 'acCurrent', label: 'AC Current', align: 'right', render: (v: InverterVariant) => v.maxAcCurrent.value ? `${v.maxAcCurrent.value} A` : '-' },
        ]}
      />

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleRetry}>
          Upload Different File
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface VariantTableProps<T> {
  variants: T[];
  selectedIndices: Set<number>;
  toggleVariant: (index: number) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  columns: Array<{
    key: string;
    label: string;
    align: 'left' | 'right';
    render: (variant: T) => string;
  }>;
}

function VariantTable<T>({
  variants,
  selectedIndices,
  toggleVariant,
  handleSelectAll,
  handleDeselectAll,
  columns,
}: VariantTableProps<T>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Select models to import:</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            None
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="w-10 p-2"></th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('p-2 font-medium', col.align === 'right' ? 'text-right' : 'text-left')}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variants.map((variant, index) => (
              <tr
                key={index}
                className={cn(
                  'border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors',
                  selectedIndices.has(index) && 'bg-primary/5'
                )}
                onClick={() => toggleVariant(index)}
              >
                <td className="p-2 text-center">
                  <Checkbox
                    checked={selectedIndices.has(index)}
                    onCheckedChange={() => toggleVariant(index)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('p-2', col.align === 'right' ? 'text-right' : '', col.key === 'model' && 'font-medium')}
                  >
                    {col.render(variant)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-muted-foreground">
        {selectedIndices.size} of {variants.length} model
        {variants.length !== 1 ? 's' : ''} selected
      </div>
    </div>
  );
}

// Helper functions

function formatModuleDimensions(shared: SharedModuleSpecs): string {
  const l = shared.length.value;
  const w = shared.width.value;
  const t = shared.thickness.value;
  if (l && w && t) {
    return `${l} × ${w} × ${t} mm`;
  }
  if (l && w) {
    return `${l} × ${w} mm`;
  }
  return 'Dimensions unknown';
}

function getCellTypeLabel(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  const cellType = CELL_TYPES.find((t) => t.value === value);
  return cellType?.label || value;
}

function getInverterTypeLabel(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  const inverterType = INVERTER_TYPES.find((t) => t.value === value);
  return inverterType?.label || value;
}

// Spec display components

function SpecSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">{children}</div>
    </div>
  );
}

function SpecRow<T>({
  label,
  field,
  unit,
  formatter,
}: {
  label: string;
  field: ExtractedField<T>;
  unit?: string;
  formatter?: (value: T) => string;
}) {
  if (field.confidence === 'missing' || field.value === null) {
    return null;
  }

  const displayValue = formatter
    ? formatter(field.value)
    : `${field.value}${unit ? ` ${unit}` : ''}`;

  return (
    <>
      <span className="text-muted-foreground">{label}:</span>
      <span className="flex items-center gap-1.5">
        <span className="font-medium">{displayValue}</span>
        <ConfidenceBadge confidence={field.confidence} source={field.source} />
      </span>
    </>
  );
}

function ConfidenceBadge({
  confidence,
  source,
}: {
  confidence: ConfidenceLevel;
  source?: string;
}) {
  const colors: Record<ConfidenceLevel, string> = {
    high: 'bg-green-500/20 text-green-700 dark:text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    low: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    missing: 'bg-red-500/20 text-red-700 dark:text-red-400',
  };

  const icons: Record<ConfidenceLevel, React.ReactNode> = {
    high: <Check className="h-3 w-3" />,
    medium: <AlertTriangle className="h-3 w-3" />,
    low: <CircleHelp className="h-3 w-3" />,
    missing: null,
  };

  if (confidence === 'high' && !source) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center rounded px-1 py-0.5 text-xs',
              colors[confidence]
            )}
          >
            {icons[confidence]}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs">
            <div className="font-medium capitalize">{confidence} confidence</div>
            {source && (
              <div className="text-muted-foreground mt-1">Source: "{source}"</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
