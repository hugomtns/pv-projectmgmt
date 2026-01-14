import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileUploadDropzone } from '@/components/ui/file-upload-dropzone';
import { useDocumentStore } from '@/stores/documentStore';
import { useUserStore } from '@/stores/userStore';

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
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const uploadVersion = useDocumentStore((state) => state.uploadVersion);
  const getDocument = useDocumentStore((state) => state.getDocument);
  const currentUser = useUserStore((state) => state.currentUser);

  // Lock check logic
  const document = getDocument(documentId);
  const isLocked = document?.isLocked ?? false;
  const lockedBy = document?.lockedBy;
  const isAdmin = currentUser?.roleId === 'role-admin';
  const canUploadToLocked = isAdmin;

  const handleFileChange = (selectedFile: File | null) => {
    setError('');
    setFile(selectedFile);
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

          {isLocked && !canUploadToLocked && (
            <div className="bg-destructive/10 border border-destructive/50 p-3 rounded-md mt-2">
              <p className="text-sm text-destructive font-medium">
                This document is locked by {lockedBy}. Only administrators can upload versions to locked documents.
              </p>
            </div>
          )}

          {isLocked && canUploadToLocked && (
            <div className="bg-amber-500/10 border border-amber-500/50 p-3 rounded-md mt-2">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                This document is locked by {lockedBy}. You can upload as an administrator.
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* File Drop Zone */}
          <FileUploadDropzone
            value={file}
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            acceptDescription="PDF, PNG, JPG, or DOCX (max 50MB)"
            disabled={isUploading || (isLocked && !canUploadToLocked)}
            error={error}
            onError={setError}
          />

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
              disabled={!file || isUploading || (isLocked && !canUploadToLocked)}
            >
              {isUploading ? 'Uploading...' : 'Upload Version'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
