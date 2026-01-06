import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, Clock } from 'lucide-react';

interface VersionHistoryProps {
  documentId: string;
  currentVersionId: string;
  selectedVersionId: string;
  onVersionSelect: (versionId: string) => void;
  onUploadVersion: () => void;
  canUpload: boolean;
}

export function VersionHistory({
  documentId,
  currentVersionId,
  selectedVersionId,
  onVersionSelect,
  onUploadVersion,
  canUpload,
}: VersionHistoryProps) {
  // Fetch versions from IndexedDB
  const versions = useLiveQuery(
    () =>
      db.documentVersions
        .where('documentId')
        .equals(documentId)
        .toArray()
        .then((versions) => versions.sort((a, b) => b.versionNumber - a.versionNumber)),
    [documentId]
  ) || [];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-64 border-l border-border bg-muted/20 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Version History</h3>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        {canUpload && (
          <Button
            onClick={onUploadVersion}
            size="sm"
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload New Version
          </Button>
        )}
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto">
        {versions.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No versions found
          </div>
        )}

        {versions.map((version) => {
          const isSelected = version.id === selectedVersionId;
          const isCurrent = version.id === currentVersionId;

          return (
            <button
              key={version.id}
              onClick={() => onVersionSelect(version.id)}
              className={cn(
                'w-full p-3 border-b border-border text-left transition-colors hover:bg-muted/50',
                isSelected && 'bg-muted'
              )}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-sm">
                  Version {version.versionNumber}
                </span>
                {isCurrent && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div>{version.uploadedBy}</div>
                <div>{new Date(version.uploadedAt).toLocaleDateString()}</div>
                <div className="flex items-center gap-2">
                  <span>{formatFileSize(version.fileSize)}</span>
                  <span>•</span>
                  <span>{version.pageCount} {version.pageCount === 1 ? 'page' : 'pages'}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
