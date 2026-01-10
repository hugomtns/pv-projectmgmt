import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDesignStore } from '@/stores/designStore';
import { Upload, X, FileImage, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesignVersionUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designId: string;
  currentVersionNumber: number;
}

// File validation helpers
const validateFileType = (file: File): boolean => {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  return validTypes.includes(file.type);
};

const validateFileSize = (file: File): boolean => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  return file.size <= maxSize;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DesignVersionUploadDialog({
  open,
  onOpenChange,
  designId,
  currentVersionNumber,
}: DesignVersionUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addVersion = useDesignStore((state) => state.addVersion);
  const designs = useDesignStore((state) => state.designs);
  const design = designs.find(d => d.id === designId);

  const handleFileSelect = (selectedFile: File) => {
    setError('');

    // Validate file type
    if (!validateFileType(selectedFile)) {
      setError('Invalid file type. Please upload images (PNG, JPG) or PDF files.');
      return;
    }

    // Validate file size (max 50MB)
    if (!validateFileSize(selectedFile)) {
      setError('File size exceeds 50MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const versionId = await addVersion(designId, file);

      if (versionId) {
        // Success - close dialog and reset
        onOpenChange(false);
        setFile(null);
        setError('');
      }
    } catch (err) {
      console.error('Failed to upload version:', err);
      setError('Failed to upload version. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false);
      setFile(null);
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            Upload a new version of "{design?.name || 'this design'}". This will become version {currentVersionNumber + 1}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50',
              error && 'border-destructive'
            )}
          >
            {!file && (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop a file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supported: Images (PNG, JPG) and PDF files (max 50MB)
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Select File
                </Button>
              </>
            )}

            {file && (
              <div className="flex items-center justify-between gap-4 p-4 bg-muted rounded-md">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {file.type.includes('pdf') ? (
                    <FileText className="h-8 w-8 text-destructive shrink-0" />
                  ) : (
                    <FileImage className="h-8 w-8 text-primary shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 p-3 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!file || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload Version'}
            </Button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </DialogContent>
    </Dialog>
  );
}
