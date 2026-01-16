import { useState, useEffect, useMemo } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useComponentStore } from '@/stores/componentStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileBox, Package } from 'lucide-react';
import type { EquipmentType } from '@/lib/types/equipment';
import { EQUIPMENT_TYPE_LABELS } from '@/lib/types/equipment';
import type { Component } from '@/lib/types/component';

interface ImportEquipmentFromDesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface ImportItem {
  component: Component;
  designId: string;
  designName: string;
  type: EquipmentType;
  name: string;
  quantity: number;
  enabled: boolean;
}

export function ImportEquipmentFromDesignDialog({
  open,
  onOpenChange,
  projectId,
}: ImportEquipmentFromDesignDialogProps) {
  const [importItems, setImportItems] = useState<ImportItem[]>([]);

  const designs = useDesignStore((state) => state.designs);
  const importFromDesign = useEquipmentStore((state) => state.importFromDesign);
  const components = useComponentStore((state) => state.components);

  // Get designs for this project
  const projectDesigns = useMemo(
    () => designs.filter((d) => d.projectId === projectId),
    [designs, projectId]
  );

  // Build import items from components linked to project designs
  useEffect(() => {
    if (!open) {
      setImportItems([]);
      return;
    }

    const projectDesignIds = new Set(projectDesigns.map((d) => d.id));
    const items: ImportItem[] = [];

    // Find components that are linked to designs in this project
    components.forEach((component) => {
      const linkedDesigns = component.linkedDesigns || [];

      linkedDesigns.forEach((usage) => {
        if (projectDesignIds.has(usage.designId)) {
          const design = projectDesigns.find((d) => d.id === usage.designId);
          if (design && usage.quantity > 0) {
            items.push({
              component,
              designId: usage.designId,
              designName: design.name,
              type: component.type as EquipmentType,
              name: `${component.manufacturer} ${component.model}`,
              quantity: usage.quantity,
              enabled: true,
            });
          }
        }
      });
    });

    setImportItems(items);
  }, [open, components, projectDesigns]);

  // Update item
  const updateItem = (index: number, updates: Partial<ImportItem>) => {
    setImportItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  // Handle import
  const handleImport = () => {
    const enabledItems = importItems.filter((item) => item.enabled && item.quantity > 0);

    if (enabledItems.length === 0) return;

    // Group by design for the import
    const byDesign = new Map<string, typeof enabledItems>();
    enabledItems.forEach((item) => {
      const existing = byDesign.get(item.designId) || [];
      existing.push(item);
      byDesign.set(item.designId, existing);
    });

    // Import for each design
    byDesign.forEach((items, designId) => {
      const itemsToImport = items.map((item) => ({
        componentId: item.component.id,
        type: item.type,
        name: item.name,
        manufacturer: item.component.manufacturer,
        model: item.component.model,
        quantity: item.quantity,
      }));

      importFromDesign(projectId, designId, itemsToImport);
    });

    onOpenChange(false);
  };

  const hasItemsToImport = importItems.some((item) => item.enabled && item.quantity > 0);
  const enabledCount = importItems.filter((i) => i.enabled && i.quantity > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBox className="h-5 w-5" />
            Import Equipment from Design
          </DialogTitle>
          <DialogDescription>
            Import equipment from components linked to this project's designs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* No Components Found */}
          {importItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <h4 className="font-medium mb-1">No components linked to designs</h4>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Link components to your project's designs in the Component Library first,
                then return here to import them as equipment.
              </p>
            </div>
          )}

          {/* Import Items */}
          {importItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Components to Import ({importItems.length})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allEnabled = importItems.every((i) => i.enabled);
                    setImportItems((prev) =>
                      prev.map((item) => ({ ...item, enabled: !allEnabled }))
                    );
                  }}
                >
                  {importItems.every((i) => i.enabled) ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {importItems.map((item, index) => (
                <div
                  key={`${item.component.id}-${item.designId}`}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={item.enabled}
                      onCheckedChange={(checked) =>
                        updateItem(index, { enabled: checked === true })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {item.component.manufacturer} {item.component.model}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                          {EQUIPMENT_TYPE_LABELS[item.type]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        From design: {item.designName}
                      </p>
                    </div>
                  </div>

                  {item.enabled && (
                    <div className="grid grid-cols-2 gap-4 pl-7">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Name / Identifier</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(index, { name: e.target.value })}
                          placeholder="e.g., Module Array A"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, { quantity: parseInt(e.target.value) || 1 })
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!hasItemsToImport}>
            {hasItemsToImport ? `Import ${enabledCount} Item(s)` : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
