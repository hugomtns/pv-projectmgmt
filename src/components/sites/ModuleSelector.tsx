/**
 * ModuleSelector - Select module specs from library or enter manually
 */

import { useState } from 'react';
import { useComponentStore } from '@/stores/componentStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ModuleInput } from '@/lib/types/layout';
import type { ModuleComponent, ModuleSpecs } from '@/lib/types/component';

interface ModuleSelectorProps {
  value: ModuleInput;
  onChange: (module: ModuleInput) => void;
}

const DEFAULT_MANUAL_MODULE: ModuleInput = {
  source: 'manual',
  name: 'Custom Module',
  widthMm: 1134,
  lengthMm: 2384,
  wattage: 665,
};

export function ModuleSelector({ value, onChange }: ModuleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const components = useComponentStore((state) => state.components);
  const modules = components.filter(
    (c): c is ModuleComponent => c.type === 'module'
  );

  // Filter modules by search query
  const filteredModules = modules.filter((m) => {
    const searchText = `${m.manufacturer} ${m.model}`.toLowerCase();
    return searchText.includes(searchQuery.toLowerCase());
  });

  const handleSourceChange = (source: 'manual' | 'library') => {
    if (source === 'manual') {
      onChange({
        ...DEFAULT_MANUAL_MODULE,
        source: 'manual',
      });
    } else if (source === 'library' && filteredModules.length > 0) {
      // Select first module from library
      const firstModule = filteredModules[0];
      onChange(moduleComponentToInput(firstModule));
    }
  };

  const handleLibrarySelect = (component: ModuleComponent) => {
    onChange(moduleComponentToInput(component));
  };

  const handleManualChange = (field: keyof ModuleInput, fieldValue: string | number) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Panel Source</Label>
        <RadioGroup
          value={value.source}
          onValueChange={(v) => handleSourceChange(v as 'manual' | 'library')}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="library" id="source-library" />
            <Label htmlFor="source-library" className="font-normal cursor-pointer">
              Import from Component Library
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="manual" id="source-manual" />
            <Label htmlFor="source-manual" className="font-normal cursor-pointer">
              Enter Manually
            </Label>
          </div>
        </RadioGroup>
      </div>

      {value.source === 'library' ? (
        <div className="space-y-3">
          <Input
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />

          {modules.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
              No modules in component library.
              <br />
              Add modules in the Components section or enter manually.
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
              No modules match your search.
            </div>
          ) : (
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredModules.map((module) => {
                  const isSelected = value.componentId === module.id;
                  return (
                    <button
                      key={module.id}
                      onClick={() => handleLibrarySelect(module)}
                      className={cn(
                        'w-full text-left p-3 rounded-md transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="font-medium text-sm">
                        {module.manufacturer} {module.model}
                      </div>
                      <div
                        className={cn(
                          'text-xs mt-0.5',
                          isSelected
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground'
                        )}
                      >
                        {module.specs.powerRating}W &nbsp;│&nbsp;{' '}
                        {module.specs.length} × {module.specs.width} mm &nbsp;│&nbsp;{' '}
                        {module.specs.efficiency}% eff
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Selected module summary */}
          {value.componentId && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="text-sm font-medium">{value.name}</div>
              <div className="text-xs text-muted-foreground grid grid-cols-3 gap-2">
                <div>
                  <span className="text-foreground font-medium">{value.wattage}</span> W
                </div>
                <div>
                  <span className="text-foreground font-medium">
                    {value.lengthMm} × {value.widthMm}
                  </span>{' '}
                  mm
                </div>
                <div>
                  <span className="text-foreground font-medium">
                    {((value.lengthMm * value.widthMm) / 1e6).toFixed(2)}
                  </span>{' '}
                  m²
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 bg-muted/50 rounded-lg p-4">
          <div>
            <Label htmlFor="module-name" className="text-xs">
              Module Name
            </Label>
            <Input
              id="module-name"
              value={value.name}
              onChange={(e) => handleManualChange('name', e.target.value)}
              placeholder="e.g., Generic 665W Module"
              className="mt-1 h-9"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="module-length" className="text-xs">
                Length (mm)
              </Label>
              <Input
                id="module-length"
                type="number"
                value={value.lengthMm}
                onChange={(e) =>
                  handleManualChange('lengthMm', parseInt(e.target.value) || 0)
                }
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label htmlFor="module-width" className="text-xs">
                Width (mm)
              </Label>
              <Input
                id="module-width"
                type="number"
                value={value.widthMm}
                onChange={(e) =>
                  handleManualChange('widthMm', parseInt(e.target.value) || 0)
                }
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label htmlFor="module-wattage" className="text-xs">
                Wattage (W)
              </Label>
              <Input
                id="module-wattage"
                type="number"
                value={value.wattage}
                onChange={(e) =>
                  handleManualChange('wattage', parseInt(e.target.value) || 0)
                }
                className="mt-1 h-9"
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Module area:{' '}
            <span className="font-medium text-foreground">
              {((value.lengthMm * value.widthMm) / 1e6).toFixed(2)} m²
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Convert a ModuleComponent to ModuleInput
 */
function moduleComponentToInput(component: ModuleComponent): ModuleInput {
  const specs: ModuleSpecs = component.specs;
  return {
    source: 'library',
    componentId: component.id,
    name: `${component.manufacturer} ${component.model}`,
    widthMm: specs.width,
    lengthMm: specs.length,
    wattage: specs.powerRating,
  };
}
