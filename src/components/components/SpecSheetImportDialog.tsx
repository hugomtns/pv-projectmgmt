import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  Upload,
  Box,
  Check,
  Loader2,
  AlertTriangle,
  CircleHelp,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useSpecSheetParser, getStageMessage } from '@/hooks/useSpecSheetParser';
import type { ExtractedModuleData, ConfidenceLevel, ExtractedField } from '@/lib/types/specSheetParsing';
import { cn } from '@/lib/utils';
import { CELL_TYPES } from '@/lib/types/component';

interface SpecSheetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ExtractedModuleData) => void;
}

export function SpecSheetImportDialog({
  open,
  onOpenChange,
  onImport,
}: SpecSheetImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { stage, result, error, warnings, isConfigured, parseFile, reset } =
    useSpecSheetParser();

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open, reset]);

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
      onImport(result);
      onOpenChange(false);
    }
  };

  const handleRetry = () => {
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isLoading = stage === 'reading-pdf' || stage === 'extracting-text' || stage === 'analyzing';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
              <li>Manufacturer and model information</li>
              <li>Electrical parameters (Voc, Isc, Vmp, Imp, efficiency)</li>
              <li>Physical dimensions and weight</li>
              <li>Temperature coefficients</li>
              <li>Cell technology and configuration</li>
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

        {/* Preview */}
        {stage === 'complete' && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Extracted: {result.manufacturer.value || 'Unknown'} -{' '}
              {result.model.value || 'Unknown'}
            </div>

            <div className="p-4 border rounded-lg bg-muted/30 space-y-4 max-h-[300px] overflow-y-auto">
              {/* Electrical */}
              <SpecSection title="Electrical (STC)">
                <SpecRow label="Power Rating" field={result.specs.powerRating} unit="Wp" />
                <SpecRow label="Efficiency" field={result.specs.efficiency} unit="%" />
                <SpecRow label="Voc" field={result.specs.voc} unit="V" />
                <SpecRow label="Isc" field={result.specs.isc} unit="A" />
                <SpecRow label="Vmp" field={result.specs.vmp} unit="V" />
                <SpecRow label="Imp" field={result.specs.imp} unit="A" />
              </SpecSection>

              {/* Physical */}
              <SpecSection title="Physical">
                <SpecRow label="Length" field={result.specs.length} unit="mm" />
                <SpecRow label="Width" field={result.specs.width} unit="mm" />
                <SpecRow label="Thickness" field={result.specs.thickness} unit="mm" />
                <SpecRow label="Weight" field={result.specs.weight} unit="kg" />
              </SpecSection>

              {/* Cell Info */}
              <SpecSection title="Cell Info">
                <SpecRow
                  label="Cell Type"
                  field={result.specs.cellType}
                  formatter={(v) => getCellTypeLabel(v as string)}
                />
                <SpecRow label="Cell Count" field={result.specs.cellCount} />
                <SpecRow
                  label="Bifacial"
                  field={result.specs.bifacial}
                  formatter={(v) => (v ? 'Yes' : 'No')}
                />
                <SpecRow
                  label="Bifaciality"
                  field={result.specs.bifacialityFactor}
                  formatter={(v) => `${((v as number) * 100).toFixed(0)}%`}
                />
              </SpecSection>

              {/* Temperature */}
              <SpecSection title="Temperature Coefficients">
                <SpecRow label="Pmax" field={result.specs.tempCoeffPmax} unit="%/°C" />
                <SpecRow label="Voc" field={result.specs.tempCoeffVoc} unit="%/°C" />
                <SpecRow label="Isc" field={result.specs.tempCoeffIsc} unit="%/°C" />
              </SpecSection>
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
            disabled={stage !== 'complete' || !result}
            className="gap-2"
          >
            <Box className="h-4 w-4" />
            Create Module
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper components

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

function getCellTypeLabel(value: string | undefined): string {
  if (!value) return 'Unknown';
  const cellType = CELL_TYPES.find((t) => t.value === value);
  return cellType?.label || value;
}
