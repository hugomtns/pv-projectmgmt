import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, Clock, FileImage, FileText } from 'lucide-react';
import { DesignVersionUploadDialog } from './DesignVersionUploadDialog';

interface DesignVersionHistoryProps {
    designId: string;
    currentVersionId: string;
    selectedVersionId: string;
    onVersionSelect: (versionId: string) => void;
    canUpload: boolean;
}

export function DesignVersionHistory({
    designId,
    currentVersionId,
    selectedVersionId,
    onVersionSelect,
    canUpload,
}: DesignVersionHistoryProps) {
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

    // Fetch versions from IndexedDB
    const versions = useLiveQuery(
        () =>
            db.designVersions
                .where('designId')
                .equals(designId)
                .toArray()
                .then((versions) => versions.sort((a, b) => b.versionNumber - a.versionNumber)),
        [designId]
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
                        onClick={() => setUploadDialogOpen(true)}
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
                        No versions found. Upload a design to get started.
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
                                <span className="font-medium text-sm flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">
                                        v{version.versionNumber}
                                    </span>
                                    {version.fileType === 'pdf' ? (
                                        <FileText className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                        <FileImage className="h-3 w-3 text-muted-foreground" />
                                    )}
                                </span>
                                {isCurrent && (
                                    <span className="text-[10px] uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                                        Latest
                                    </span>
                                )}
                            </div>

                            <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                <div>{version.uploadedBy}</div>
                                <div>{new Date(version.uploadedAt).toLocaleDateString()}</div>
                                <div>{formatFileSize(version.fileSize)}</div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Upload Dialog */}
            <DesignVersionUploadDialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
                designId={designId}
                currentVersionNumber={versions.length}
            />
        </div>
    );
}
