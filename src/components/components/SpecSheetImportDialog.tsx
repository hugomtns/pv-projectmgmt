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
import {
  Upload,
  Box,
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
  ConfidenceLevel,
  ExtractedField,
} from '@/lib/types/specSheetParsing';
import { cn } from '@/lib/utils';
import { CELL_TYPES } from '@/lib/types/component';

interface SpecSheetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (shared: SharedModuleSpecs, variants: ModuleVariant[], selectedIndices: number[]) => void;
}

export function SpecSheetImportDialog({
  open,
  onOpenChange,
  onImport,
}: SpecSheetImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { stage, result, error, warnings, isConfigured, parseFile, reset } =
    useSpecSheetParser();

  // Selection state for variants
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [sharedExpanded, setSharedExpanded] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      setSelectedIndices(new Set());
      setSharedExpanded(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open, reset]);

  // Select all variants by default when extraction completes
  useEffect(() => {
    if (result?.variants) {
      setSelectedIndices(new Set(result.variants.map((_, i) => i)));
    }
  }, [result]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      parseFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleImport = () => {
    if (result) {
      onImport(result.shared, result.variants, Array.from(selectedIndices));
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
    if (result?.variants) {
      setSelectedIndices(new Set(result.variants.map((_, i) => i)));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Import from Spec Sheet
          </DialogTitle>
          <DialogDescription>
            Upload a module datasheet PDF to extract specifications using AI.
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

        {/* Info Text */}
        {stage === 'idle' && isConfigured && (
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              Upload a PDF datasheet from module manufacturers like JinkoSolar, LONGi, Trina
              Solar, etc. The AI will extract:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>All power variants from the spec sheet</li>
              <li>Manufacturer and model information</li>
              <li>Electrical parameters (Voc, Isc, Vmp, Imp, efficiency)</li>
              <li>Physical dimensions and weight</li>
              <li>Temperature coefficients</li>
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

        {/* Preview - Multi-Model View */}
        {stage === 'complete' && result && (
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
                    {formatDimensions(result.shared)} | {getCellTypeLabel(result.shared.cellType.value)} |{' '}
                    {result.shared.bifacial.value ? 'Bifacial' : 'Monofacial'}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4 mt-2">
                  {/* Physical */}
                  <SpecSection title="Physical">
                    <SpecRow label="Length" field={result.shared.length} unit="mm" />
                    <SpecRow label="Width" field={result.shared.width} unit="mm" />
                    <SpecRow label="Thickness" field={result.shared.thickness} unit="mm" />
                    <SpecRow label="Weight" field={result.shared.weight} unit="kg" />
                  </SpecSection>

                  {/* Cell Info */}
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

                  {/* Temperature */}
                  <SpecSection title="Temperature Coefficients">
                    <SpecRow label="Pmax" field={result.shared.tempCoeffPmax} unit="%/°C" />
                    <SpecRow label="Voc" field={result.shared.tempCoeffVoc} unit="%/°C" />
                    <SpecRow label="Isc" field={result.shared.tempCoeffIsc} unit="%/°C" />
                  </SpecSection>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Variant Selection Table */}
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
                      <th className="text-left p-2 font-medium">Model</th>
                      <th className="text-right p-2 font-medium">Power</th>
                      <th className="text-right p-2 font-medium">Eff.</th>
                      <th className="text-right p-2 font-medium">Voc</th>
                      <th className="text-right p-2 font-medium">Isc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.variants.map((variant, index) => (
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
                        <td className="p-2 font-medium">
                          {variant.model.value || `Variant ${index + 1}`}
                          {variant.model.confidence !== 'high' && (
                            <ConfidenceBadge confidence={variant.model.confidence} />
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {variant.powerRating.value ? `${variant.powerRating.value} Wp` : '-'}
                        </td>
                        <td className="p-2 text-right">
                          {variant.efficiency.value ? `${variant.efficiency.value}%` : '-'}
                        </td>
                        <td className="p-2 text-right">
                          {variant.voc.value ? `${variant.voc.value} V` : '-'}
                        </td>
                        <td className="p-2 text-right">
                          {variant.isc.value ? `${variant.isc.value} A` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-sm text-muted-foreground">
                {selectedIndices.size} of {result.variants.length} model
                {result.variants.length !== 1 ? 's' : ''} selected
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Upload Different File
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={stage !== 'complete' || !result || selectedIndices.size === 0}
            className="gap-2"
          >
            <Box className="h-4 w-4" />
            Import {selectedIndices.size} Module{selectedIndices.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions

function formatDimensions(shared: SharedModuleSpecs): string {
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
    // Don't show badge for high confidence without source
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
