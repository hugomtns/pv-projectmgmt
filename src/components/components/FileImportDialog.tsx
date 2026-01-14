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
import { Upload, FileText, Box, Zap, Check, Loader2 } from 'lucide-react';
import { parsePANFile, isPANFile, type ParsedPANData } from '@/lib/pan/parser';
import { parseONDFile, isONDFile, type ParsedONDData } from '@/lib/ond/parser';
import { CELL_TYPES, INVERTER_TYPES } from '@/lib/types/component';

// Union type for parsed data
export type ParsedFileData =
  | { type: 'pan'; data: ParsedPANData }
  | { type: 'ond'; data: ParsedONDData };

interface FileImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportPAN?: (data: ParsedPANData) => void;
  onImportOND?: (data: ParsedONDData) => void;
}

export function FileImportDialog({ open, onOpenChange, onImportPAN, onImportOND }: FileImportDialogProps) {
  const [selectedTab, setSelectedTab] = useState<'pan' | 'ond'>('pan');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedPAN, setParsedPAN] = useState<ParsedPANData | null>(null);
  const [parsedOND, setParsedOND] = useState<ParsedONDData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setParsedPAN(null);
      setParsedOND(null);
      setParseError(null);
      setParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  // Parse file when selected
  useEffect(() => {
    if (!selectedFile) {
      setParsedPAN(null);
      setParsedOND(null);
      setParseError(null);
      return;
    }

    const parseFile = async () => {
      setParsing(true);
      setParseError(null);
      setParsedPAN(null);
      setParsedOND(null);

      try {
        const content = await selectedFile.text();

        if (selectedTab === 'pan') {
          if (!isPANFile(content)) {
            setParseError('Invalid PAN file format');
          } else {
            const data = parsePANFile(content);
            setParsedPAN(data);
          }
        } else {
          if (!isONDFile(content)) {
            setParseError('Invalid OND file format');
          } else {
            const data = parseONDFile(content);
            setParsedOND(data);
          }
        }
      } catch (error) {
        console.error('Failed to parse file:', error);
        setParseError('Failed to read file');
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
    setParsedPAN(null);
    setParsedOND(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    if (selectedTab === 'pan' && parsedPAN && onImportPAN) {
      onImportPAN(parsedPAN);
      onOpenChange(false);
    } else if (selectedTab === 'ond' && parsedOND && onImportOND) {
      onImportOND(parsedOND);
      onOpenChange(false);
    }
  };

  // Get cell type label
  const getCellTypeLabel = (value: string | undefined): string => {
    if (!value) return 'Unknown';
    const cellType = CELL_TYPES.find((t) => t.value === value);
    return cellType?.label || value;
  };

  // Get inverter type label
  const getInverterTypeLabel = (value: string | undefined): string => {
    if (!value) return 'Unknown';
    const invType = INVERTER_TYPES.find((t) => t.value === value);
    return invType?.label || value;
  };

  const hasParsedData = (selectedTab === 'pan' && parsedPAN) || (selectedTab === 'ond' && parsedOND);

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
            {!parsedPAN && !parsing && (
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
            {!parsedOND && !parsing && (
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">OND files contain inverter parameters from PVsyst:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Manufacturer and model information</li>
                  <li>DC input specifications (voltage range, MPPT)</li>
                  <li>AC output specifications (power, voltage)</li>
                  <li>Efficiency values</li>
                  <li>Physical dimensions</li>
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Upload Area - only show if no parsed data yet */}
        {!hasParsedData && (
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

        {/* PAN Parsed Data Preview */}
        {parsedPAN && selectedTab === 'pan' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Parsed: {parsedPAN.manufacturer} - {parsedPAN.model}
            </div>

            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="text-sm font-medium">Extracted specifications:</div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {parsedPAN.specs.powerRating !== undefined && (
                  <>
                    <span className="text-muted-foreground">Power:</span>
                    <span className="font-medium">{parsedPAN.specs.powerRating} Wp</span>
                  </>
                )}

                {parsedPAN.specs.length !== undefined && parsedPAN.specs.width !== undefined && (
                  <>
                    <span className="text-muted-foreground">Dimensions:</span>
                    <span className="font-medium">
                      {parsedPAN.specs.length} x {parsedPAN.specs.width}
                      {parsedPAN.specs.thickness ? ` x ${parsedPAN.specs.thickness}` : ''} mm
                    </span>
                  </>
                )}

                {parsedPAN.specs.weight !== undefined && (
                  <>
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="font-medium">{parsedPAN.specs.weight} kg</span>
                  </>
                )}

                {parsedPAN.specs.voc !== undefined && parsedPAN.specs.isc !== undefined && (
                  <>
                    <span className="text-muted-foreground">Voc / Isc:</span>
                    <span className="font-medium">
                      {parsedPAN.specs.voc} V / {parsedPAN.specs.isc} A
                    </span>
                  </>
                )}

                {parsedPAN.specs.vmp !== undefined && parsedPAN.specs.imp !== undefined && (
                  <>
                    <span className="text-muted-foreground">Vmp / Imp:</span>
                    <span className="font-medium">
                      {parsedPAN.specs.vmp} V / {parsedPAN.specs.imp} A
                    </span>
                  </>
                )}

                {parsedPAN.specs.efficiency !== undefined && (
                  <>
                    <span className="text-muted-foreground">Efficiency:</span>
                    <span className="font-medium">{parsedPAN.specs.efficiency}%</span>
                  </>
                )}

                {parsedPAN.specs.cellType !== undefined && (
                  <>
                    <span className="text-muted-foreground">Cell type:</span>
                    <span className="font-medium">
                      {getCellTypeLabel(parsedPAN.specs.cellType)}
                      {parsedPAN.specs.cellCount ? ` (${parsedPAN.specs.cellCount} cells)` : ''}
                    </span>
                  </>
                )}

                {parsedPAN.specs.tempCoeffPmax !== undefined && (
                  <>
                    <span className="text-muted-foreground">Temp coeff Pmax:</span>
                    <span className="font-medium">{parsedPAN.specs.tempCoeffPmax}%/°C</span>
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

        {/* OND Parsed Data Preview */}
        {parsedOND && selectedTab === 'ond' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Parsed: {parsedOND.manufacturer} - {parsedOND.model}
            </div>

            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="text-sm font-medium">Extracted specifications:</div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {parsedOND.specs.acPowerRating !== undefined && (
                  <>
                    <span className="text-muted-foreground">AC Power:</span>
                    <span className="font-medium">{parsedOND.specs.acPowerRating} kW</span>
                  </>
                )}

                {parsedOND.specs.maxDcPower !== undefined && (
                  <>
                    <span className="text-muted-foreground">Max DC Power:</span>
                    <span className="font-medium">{parsedOND.specs.maxDcPower} kW</span>
                  </>
                )}

                {parsedOND.specs.length !== undefined && parsedOND.specs.width !== undefined && (
                  <>
                    <span className="text-muted-foreground">Dimensions:</span>
                    <span className="font-medium">
                      {parsedOND.specs.length} x {parsedOND.specs.width}
                      {parsedOND.specs.height ? ` x ${parsedOND.specs.height}` : ''} mm
                    </span>
                  </>
                )}

                {parsedOND.specs.weight !== undefined && (
                  <>
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="font-medium">{parsedOND.specs.weight} kg</span>
                  </>
                )}

                {parsedOND.specs.mpptVoltageMin !== undefined && parsedOND.specs.mpptVoltageMax !== undefined && (
                  <>
                    <span className="text-muted-foreground">MPPT Range:</span>
                    <span className="font-medium">
                      {parsedOND.specs.mpptVoltageMin} - {parsedOND.specs.mpptVoltageMax} V
                    </span>
                  </>
                )}

                {parsedOND.specs.maxDcVoltage !== undefined && (
                  <>
                    <span className="text-muted-foreground">Max DC Voltage:</span>
                    <span className="font-medium">{parsedOND.specs.maxDcVoltage} V</span>
                  </>
                )}

                {parsedOND.specs.acVoltage !== undefined && (
                  <>
                    <span className="text-muted-foreground">AC Voltage:</span>
                    <span className="font-medium">{parsedOND.specs.acVoltage} V</span>
                  </>
                )}

                {parsedOND.specs.mpptCount !== undefined && (
                  <>
                    <span className="text-muted-foreground">MPPT Count:</span>
                    <span className="font-medium">{parsedOND.specs.mpptCount}</span>
                  </>
                )}

                {parsedOND.specs.maxEfficiency !== undefined && (
                  <>
                    <span className="text-muted-foreground">Max Efficiency:</span>
                    <span className="font-medium">{parsedOND.specs.maxEfficiency}%</span>
                  </>
                )}

                {parsedOND.specs.euroEfficiency !== undefined && (
                  <>
                    <span className="text-muted-foreground">Euro Efficiency:</span>
                    <span className="font-medium">{parsedOND.specs.euroEfficiency}%</span>
                  </>
                )}

                {parsedOND.specs.inverterType !== undefined && (
                  <>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{getInverterTypeLabel(parsedOND.specs.inverterType)}</span>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {selectedTab === 'pan' ? (
            <Button
              onClick={handleImport}
              disabled={!parsedPAN}
              className="gap-2"
            >
              <Box className="h-4 w-4" />
              Create Module
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={!parsedOND}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Create Inverter
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
