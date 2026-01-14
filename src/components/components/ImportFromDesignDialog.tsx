import { useState } from 'react';
import { useDesignStore } from '@/stores/designStore';
import { useProjectStore } from '@/stores/projectStore';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileBox, Box, Zap, AlertCircle } from 'lucide-react';

interface ImportFromDesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: { type: 'module' | 'inverter'; manufacturer: string; model: string }) => void;
}

export function ImportFromDesignDialog({
  open,
  onOpenChange,
  onImport,
}: ImportFromDesignDialogProps) {
  const designs = useDesignStore((state) => state.designs);
  const projects = useProjectStore((state) => state.projects);
  const [selectedDesignId, setSelectedDesignId] = useState<string>('');

  // Get project name for each design
  const designsWithProjects = designs.map((design) => {
    const project = projects.find((p) => p.id === design.projectId);
    return { design, projectName: project?.name || 'Unknown Project' };
  });

  const selectedDesign = designs.find((d) => d.id === selectedDesignId);

  // Example component references that might be found in a DXF
  // In a real implementation, this would parse the DXF file
  const getDetectedComponents = () => {
    if (!selectedDesign) return [];

    // These are example references that would typically be found in PVcase DXF exports
    return [
      { type: 'module' as const, manufacturer: 'Trina Solar', model: 'TSM-DE21-580', source: 'PVcase layer: PV Modules' },
      { type: 'inverter' as const, manufacturer: 'Huawei', model: 'SUN2000-330KTL', source: 'PVcase layer: Inverters' },
    ];
  };

  const detectedComponents = getDetectedComponents();

  const handleImport = (component: { type: 'module' | 'inverter'; manufacturer: string; model: string }) => {
    onImport(component);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBox className="h-5 w-5" />
            Import from Design
          </DialogTitle>
          <DialogDescription>
            Select a design to detect component references. Components can be created from detected module and inverter information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Design</label>
            <Select value={selectedDesignId} onValueChange={setSelectedDesignId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a design file..." />
              </SelectTrigger>
              <SelectContent>
                {designsWithProjects.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No designs available. Upload a DXF file first.
                  </div>
                ) : (
                  designsWithProjects.map(({ design, projectName }) => (
                    <SelectItem key={design.id} value={design.id}>
                      <div className="flex flex-col">
                        <span>{design.name}</span>
                        <span className="text-xs text-muted-foreground">{projectName}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedDesign && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Detected Components
              </div>

              {detectedComponents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No component references detected in this design.
                </p>
              ) : (
                <div className="space-y-2">
                  {detectedComponents.map((comp, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="gap-1">
                          {comp.type === 'module' ? (
                            <Box className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Zap className="h-3 w-3 text-amber-500" />
                          )}
                          {comp.type === 'module' ? 'Module' : 'Inverter'}
                        </Badge>
                        <div>
                          <div className="font-medium text-sm">
                            {comp.manufacturer} {comp.model}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {comp.source}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleImport(comp)}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Click "Add" to create a component with pre-filled manufacturer and model.
                You can then edit specifications and pricing.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
