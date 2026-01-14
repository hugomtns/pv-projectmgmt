import { useState, useEffect } from 'react';
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
import { FileBox, Box, Zap, AlertCircle, Loader2, Info } from 'lucide-react';
import {
  extractComponentsFromDesign,
  type ExtractedComponentData,
} from '@/lib/dxf/componentExtractor';

export interface ImportedComponentData {
  type: 'module' | 'inverter';
  designId: string;
  quantity: number;
  // Pre-filled specs from DXF (modules only)
  widthMm?: number | null;
  heightMm?: number | null;
  tiltAngle?: number | null;
}

interface ImportFromDesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ImportedComponentData) => void;
}

export function ImportFromDesignDialog({
  open,
  onOpenChange,
  onImport,
}: ImportFromDesignDialogProps) {
  const designs = useDesignStore((state) => state.designs);
  const projects = useProjectStore((state) => state.projects);
  const [selectedDesignId, setSelectedDesignId] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedComponentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [addedModules, setAddedModules] = useState(false);
  const [addedInverters, setAddedInverters] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedDesignId('');
      setExtractedData(null);
      setLoading(false);
      setAddedModules(false);
      setAddedInverters(false);
    }
  }, [open]);

  // Extract components when design is selected
  useEffect(() => {
    if (!selectedDesignId) {
      setExtractedData(null);
      setAddedModules(false);
      setAddedInverters(false);
      return;
    }

    const extractData = async () => {
      setLoading(true);
      setAddedModules(false);
      setAddedInverters(false);
      try {
        const data = await extractComponentsFromDesign(selectedDesignId);
        setExtractedData(data);
      } catch (error) {
        console.error('Failed to extract components:', error);
        setExtractedData({
          modules: null,
          inverters: null,
          error: 'Failed to parse design file'
        });
      } finally {
        setLoading(false);
      }
    };

    extractData();
  }, [selectedDesignId]);

  // Get project name for each design
  const designsWithProjects = designs.map((design) => {
    const project = projects.find((p) => p.id === design.projectId);
    return { design, projectName: project?.name || 'Unknown Project' };
  });

  const handleImportModule = () => {
    if (!extractedData?.modules || !selectedDesignId) return;

    onImport({
      type: 'module',
      designId: selectedDesignId,
      quantity: extractedData.modules.count,
      widthMm: extractedData.modules.widthMm,
      heightMm: extractedData.modules.heightMm,
      tiltAngle: extractedData.modules.tiltAngle,
    });
    setAddedModules(true);
  };

  const handleImportInverter = () => {
    if (!extractedData?.inverters || !selectedDesignId) return;

    onImport({
      type: 'inverter',
      designId: selectedDesignId,
      quantity: extractedData.inverters.count,
    });
    setAddedInverters(true);
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
            Select a design to extract component data from the DXF file. Only quantities and physical dimensions can be detected - you will need to enter manufacturer, model, and electrical specifications.
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

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Parsing DXF file...</span>
            </div>
          )}

          {/* Error State */}
          {extractedData?.error && (
            <div className="flex items-center gap-2 p-3 border border-destructive/50 bg-destructive/10 rounded-lg text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {extractedData.error}
            </div>
          )}

          {/* Results */}
          {!loading && extractedData && !extractedData.error && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-blue-500" />
                Detected Components
              </div>

              {/* Modules Section */}
              {extractedData.modules ? (
                <div
                  className={`p-4 border rounded-lg ${
                    addedModules ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Badge variant="outline" className="gap-1">
                        <Box className="h-3 w-3 text-blue-500" />
                        Module
                      </Badge>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Count: </span>
                          <span className="font-medium">{extractedData.modules.count.toLocaleString()} modules</span>
                        </div>
                        {extractedData.modules.widthMm && extractedData.modules.heightMm ? (
                          <div>
                            <span className="text-muted-foreground">Dimensions: </span>
                            <span className="font-medium">
                              {extractedData.modules.heightMm.toLocaleString()} x {extractedData.modules.widthMm.toLocaleString()} mm
                            </span>
                          </div>
                        ) : (
                          <div className="text-muted-foreground italic">Dimensions not available</div>
                        )}
                        {extractedData.modules.tiltAngle !== null && (
                          <div>
                            <span className="text-muted-foreground">Tilt: </span>
                            <span className="font-medium">{extractedData.modules.tiltAngle}°</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-amber-600 mt-2">
                        You will need to enter: manufacturer, model, electrical specs, and pricing
                      </p>
                    </div>
                    {addedModules ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Added
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={handleImportModule}>
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
                  No PV modules detected in this design.
                </div>
              )}

              {/* Inverters Section */}
              {extractedData.inverters ? (
                <div
                  className={`p-4 border rounded-lg ${
                    addedInverters ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Badge variant="outline" className="gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        Inverter
                      </Badge>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Count: </span>
                          <span className="font-medium">{extractedData.inverters.count.toLocaleString()} inverters</span>
                        </div>
                      </div>
                      <p className="text-xs text-amber-600 mt-2">
                        All specifications must be entered manually
                      </p>
                    </div>
                    {addedInverters ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Added
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={handleImportInverter}>
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
                  No inverters detected in this design.
                </div>
              )}

              {/* Add All button */}
              {(extractedData.modules || extractedData.inverters) &&
               (!addedModules || !addedInverters) &&
               (extractedData.modules && !addedModules) !== (extractedData.inverters && !addedInverters) === false && (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => {
                    if (extractedData.modules && !addedModules) handleImportModule();
                    if (extractedData.inverters && !addedInverters) handleImportInverter();
                  }}
                >
                  Add All
                </Button>
              )}
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
