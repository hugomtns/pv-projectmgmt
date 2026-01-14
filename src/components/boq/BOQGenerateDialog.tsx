import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { BOQGenerationOptions } from '@/lib/types/boq';
import { DEFAULT_GENERATION_OPTIONS } from '@/lib/types/boq';

interface BOQGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (options: BOQGenerationOptions) => Promise<boolean>;
  hasExistingItems: boolean;
  hasLinkedComponents: boolean;
}

export function BOQGenerateDialog({
  open,
  onOpenChange,
  onGenerate,
  hasExistingItems,
  hasLinkedComponents,
}: BOQGenerateDialogProps) {
  const [options, setOptions] = useState<BOQGenerationOptions>(DEFAULT_GENERATION_OPTIONS);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const success = await onGenerate(options);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Generate BOQ from Design</DialogTitle>
          <DialogDescription>
            Extract component quantities from the DXF design file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning for existing items */}
          {hasExistingItems && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-600">Existing auto-generated items will be replaced</p>
                <p className="text-muted-foreground mt-1">
                  Manually added items will be preserved.
                </p>
              </div>
            </div>
          )}

          {/* Component Selection */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Components to Extract</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-modules" className="cursor-pointer">
                Include PV Modules
              </Label>
              <Switch
                id="include-modules"
                checked={options.includeModules}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeModules: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-inverters" className="cursor-pointer">
                Include Inverters
              </Label>
              <Switch
                id="include-inverters"
                checked={options.includeInverters}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeInverters: checked })
                }
              />
            </div>
          </div>

          {/* Pricing Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Pricing</h4>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="use-library-prices" className="cursor-pointer">
                  Use Component Library Prices
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasLinkedComponents
                    ? 'Pull prices from linked components'
                    : 'No components linked to this design'}
                </p>
              </div>
              <Switch
                id="use-library-prices"
                checked={options.useComponentLibraryPrices}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, useComponentLibraryPrices: checked })
                }
                disabled={!hasLinkedComponents}
              />
            </div>

            {/* Fallback Prices */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="default-module-price" className="text-xs">
                  Default Module Price (EUR)
                </Label>
                <Input
                  id="default-module-price"
                  type="number"
                  min="0"
                  value={options.defaultModulePrice}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      defaultModulePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={options.useComponentLibraryPrices && hasLinkedComponents}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-inverter-price" className="text-xs">
                  Default Inverter Price (EUR)
                </Label>
                <Input
                  id="default-inverter-price"
                  type="number"
                  min="0"
                  value={options.defaultInverterPrice}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      defaultInverterPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={options.useComponentLibraryPrices && hasLinkedComponents}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Default prices are used when no component is linked or library prices are disabled.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!options.includeModules && !options.includeInverters)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
