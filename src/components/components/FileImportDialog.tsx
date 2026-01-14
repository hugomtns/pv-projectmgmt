import { useState, useRef } from 'react';
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
import { Upload, FileText, Box, Zap, Clock, AlertCircle } from 'lucide-react';

interface FileImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileImportDialog({ open, onOpenChange }: FileImportDialogProps) {
  const [selectedTab, setSelectedTab] = useState<'pan' | 'ond'>('pan');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

        {/* Upload Area */}
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

          {selectedFile ? (
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

        {/* Coming Soon Notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Coming Soon
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Automatic parsing of PAN and OND files is under development.
              For now, please enter component specifications manually.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Parse File (Coming Soon)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
