import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/stores/documentStore';
import { validateFileSize, validateFileType, formatFileSize } from './utils/fileConversion';
import { Upload, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VersionUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  currentVersionNumber: number;
}

export function VersionUploadDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  currentVersionNumber,
}: VersionUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadVersion = useDocumentStore((state) => state.uploadVersion);

  const handleFileSelect = (selectedFile: File) => {
    setError('');

    // Validate file type
    if (!validateFileType(selectedFile)) {
      setError('Invalid file type. Please upload PDF, PNG, JPG, or DOCX files.');
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
      const versionId = await uploadVersion(documentId, file);

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
            Upload a new version of "{documentName}". This will become version {currentVersionNumber + 1}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              error && 'border-destructive'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              onChange={handleFileInputChange}
            />

            {file ? (
              <div className="space-y-2">
                <FileText className="h-12 w-12 mx-auto text-primary" />
                <div className="font-medium">{file.name}</div>
                <div className="text-sm text-muted-foreground">{formatFileSize(file.size)}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div className="text-sm">
                  <span className="font-medium text-primary">Click to upload</span> or drag and drop
                </div>
                <div className="text-xs text-muted-foreground">
                  PDF, PNG, JPG, or DOCX (max 50MB)
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
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
      </DialogContent>
    </Dialog>
  );
}
