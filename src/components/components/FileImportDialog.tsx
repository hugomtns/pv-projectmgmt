import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Box, Zap, Clock, Check, Loader2 } from 'lucide-react';
import { parsePANFile, isPANFile, type ParsedPANData } from '@/lib/pan/parser';
import { CELL_TYPES } from '@/lib/types/component';

interface FileImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (data: ParsedPANData) => void;
}

export function FileImportDialog({ open, onOpenChange, onImport }: FileImportDialogProps) {
  const [selectedTab, setSelectedTab] = useState<'pan' | 'ond'>('pan');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedPANData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setParsedData(null);
      setParseError(null);
      setParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  // Parse file when selected
  useEffect(() => {
    if (!selectedFile || selectedTab !== 'pan') {
      setParsedData(null);
      setParseError(null);
      return;
    }

    const parseFile = async () => {
      setParsing(true);
      setParseError(null);
      try {
        const content = await selectedFile.text();
        if (!isPANFile(content)) {
          setParseError('Invalid PAN file format');
          setParsedData(null);
        } else {
          const data = parsePANFile(content);
          setParsedData(data);
        }
      } catch (error) {
        console.error('Failed to parse PAN file:', error);
        setParseError('Failed to read file');
        setParsedData(null);
      } finally {
        setParsing(false);
      }
    };

    parseFile();
  }, [selectedFile, selectedTab]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if ((selectedTab === 'pan' && ext === 'pan') || (selectedTab === 'ond' && ext === 'ond')) {
        setSelectedFile(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    if (parsedData && onImport) {
      onImport(parsedData);
      onOpenChange(false);
    }
  };

  // Get cell type label
  const getCellTypeLabel = (value: string | undefined): string => {
    if (!value) return 'Unknown';
    const cellType = CELL_TYPES.find((t) => t.value === value);
    return cellType?.label || value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import from PAN/OND File
          </DialogTitle>
          <DialogDescription>
            Upload PVsyst parameter files to automatically extract component specifications.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(v) => { setSelectedTab(v as 'pan' | 'ond'); clearFile(); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pan" className="gap-2">
              <Box className="h-4 w-4" />
              PAN (Modules)
            </TabsTrigger>
            <TabsTrigger value="ond" className="gap-2">
              <Zap className="h-4 w-4" />
              OND (Inverters)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pan" className="space-y-4 pt-4">
            {!parsedData && !parsing && (
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">PAN files contain PV module parameters from PVsyst:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Manufacturer and model information</li>
                  <li>Electrical parameters (Voc, Isc, Vmp, Imp, efficiency)</li>
                  <li>Physical dimensions and weight</li>
                  <li>Temperature coefficients</li>
                  <li>Cell technology and configuration</li>
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ond" className="space-y-4 pt-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">OND files contain inverter parameters from PVsyst:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Manufacturer and model information</li>
                <li>DC input specifications (voltage range, MPPT)</li>
                <li>AC output specifications (power, voltage)</li>
                <li>Efficiency curves</li>
                <li>Physical dimensions</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload Area - only show if no parsed data yet */}
        {!parsedData && (
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={handleBrowse}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={selectedTab === 'pan' ? '.pan' : '.ond'}
              onChange={handleFileSelect}
              className="hidden"
            />

            {parsing ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Parsing file...</span>
              </div>
            ) : selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  Drop your .{selectedTab.toUpperCase()} file here
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
              </>
            )}
          </div>
        )}

        {/* Parse Error */}
        {parseError && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
            <div className="text-sm text-destructive">{parseError}</div>
          </div>
        )}

        {/* Parsed Data Preview */}
        {parsedData && selectedTab === 'pan' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Parsed: {parsedData.manufacturer} - {parsedData.model}
            </div>

            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="text-sm font-medium">Extracted specifications:</div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {parsedData.specs.powerRating !== undefined && (
                  <>
                    <span className="text-muted-foreground">Power:</span>
                    <span className="font-medium">{parsedData.specs.powerRating} Wp</span>
                  </>
                )}

                {parsedData.specs.length !== undefined && parsedData.specs.width !== undefined && (
                  <>
                    <span className="text-muted-foreground">Dimensions:</span>
                    <span className="font-medium">
                      {parsedData.specs.length} x {parsedData.specs.width}
                      {parsedData.specs.thickness ? ` x ${parsedData.specs.thickness}` : ''} mm
                    </span>
                  </>
                )}

                {parsedData.specs.weight !== undefined && (
                  <>
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="font-medium">{parsedData.specs.weight} kg</span>
                  </>
                )}

                {parsedData.specs.voc !== undefined && parsedData.specs.isc !== undefined && (
                  <>
                    <span className="text-muted-foreground">Voc / Isc:</span>
                    <span className="font-medium">
                      {parsedData.specs.voc} V / {parsedData.specs.isc} A
                    </span>
                  </>
                )}

                {parsedData.specs.vmp !== undefined && parsedData.specs.imp !== undefined && (
                  <>
                    <span className="text-muted-foreground">Vmp / Imp:</span>
                    <span className="font-medium">
                      {parsedData.specs.vmp} V / {parsedData.specs.imp} A
                    </span>
                  </>
                )}

                {parsedData.specs.efficiency !== undefined && (
                  <>
                    <span className="text-muted-foreground">Efficiency:</span>
                    <span className="font-medium">{parsedData.specs.efficiency}%</span>
                  </>
                )}

                {parsedData.specs.cellType !== undefined && (
                  <>
                    <span className="text-muted-foreground">Cell type:</span>
                    <span className="font-medium">
                      {getCellTypeLabel(parsedData.specs.cellType)}
                      {parsedData.specs.cellCount ? ` (${parsedData.specs.cellCount} cells)` : ''}
                    </span>
                  </>
                )}

                {parsedData.specs.tempCoeffPmax !== undefined && (
                  <>
                    <span className="text-muted-foreground">Temp coeff Pmax:</span>
                    <span className="font-medium">{parsedData.specs.tempCoeffPmax}%/°C</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={clearFile}>
                  Choose Different File
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Coming Soon Notice for OND */}
        {selectedTab === 'ond' && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Coming Soon
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Automatic parsing of OND files is under development.
                For now, please enter inverter specifications manually.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {selectedTab === 'pan' ? (
            <Button
              onClick={handleImport}
              disabled={!parsedData}
              className="gap-2"
            >
              <Box className="h-4 w-4" />
              Create Module
            </Button>
          ) : (
            <Button disabled className="gap-2">
              <Clock className="h-4 w-4" />
              Coming Soon
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
