import { useState, useEffect, useRef, useCallback } from 'react';
import { db, getBlob } from '@/lib/db';
import { blobCache } from '@/lib/blobCache';
import { useDesignStore } from '@/stores/designStore';
import { Button } from '@/components/ui/button';
import { DesignCommentPanel } from './DesignCommentPanel';
import { DesignVersionHistory } from './DesignVersionHistory';
import { DesignWorkflowActions } from './DesignWorkflowActions';
import { DesignStatusBadge } from './DesignStatusBadge';
import { DesignWorkflowHistory } from './DesignWorkflowHistory';
import { PV3DCanvas } from './viewer3d/PV3DCanvas';
import type { PV3DCanvasRef } from './viewer3d/PV3DCanvas';

import {
    X,
    MessageSquare,
    History,
    Activity,
    Upload,
} from 'lucide-react';

interface DesignViewerProps {
    designId: string;
    onClose: () => void;
}

export function DesignViewer({ designId, onClose }: DesignViewerProps) {
    const designs = useDesignStore((state) => state.designs);
    const addVersion = useDesignStore((state) => state.addVersion);

    const design = designs.find((d) => d.id === designId);
    const versionId = design?.currentVersionId;

    // Sidebars
    const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'workflow' | null>('comments');

    // State
    const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(versionId);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'dxf' | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Bidirectional navigation between 3D badges and comment panel
    const [highlightedElementKey, setHighlightedElementKey] = useState<string | null>(null);
    const pv3DCanvasRef = useRef<PV3DCanvasRef>(null);

    // Handle badge click in 3D view → highlight comment in panel
    const handleBadgeClick = useCallback((elementType: string, elementId: string) => {
        setHighlightedElementKey(`${elementType}:${elementId}`);
        // Ensure comments panel is visible
        if (activeTab !== 'comments') {
            setActiveTab('comments');
        }
    }, [activeTab]);

    // Handle jump to element from comment panel → focus camera on element
    const handleJumpToElement = useCallback((elementType: string, elementId: string) => {
        setHighlightedElementKey(`${elementType}:${elementId}`);
        pv3DCanvasRef.current?.focusOnElement(elementType, elementId);
    }, []);

    // Sync selected version if design updates (e.g. initial load)
    useEffect(() => {
        if (design && !selectedVersionId) {
            setSelectedVersionId(design.currentVersionId);
        }
    }, [design, selectedVersionId]);

    // Load File Logic
    useEffect(() => {
        let previousBlobId: string | null = null;

        const loadVersionFile = async () => {
            if (!design) return;

            if (!selectedVersionId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // We need to fetch the version record from DB to get the blob ID
                const version = await db.designVersions.get(selectedVersionId);

                if (!version) {
                    console.warn("Version record not found for", selectedVersionId);
                    setLoading(false);
                    return;
                }

                setFileType(version.fileType);

                const blobId = version.fileBlob;

                // Release previous blob
                if (previousBlobId && previousBlobId !== blobId) {
                    blobCache.release(previousBlobId);
                }

                const url = await blobCache.get(blobId, getBlob);
                if (!url) {
                    // setError("Failed to load file blob");
                    return;
                }

                setFileUrl(url);
                previousBlobId = blobId;
            } catch (err) {
                console.error('Failed to load version file:', err);
                // setError("Error loading file");
            } finally {
                setLoading(false);
            }
        };

        loadVersionFile();

        return () => {
            if (previousBlobId) {
                blobCache.release(previousBlobId);
            }
        };
    }, [selectedVersionId, design]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const newVersionId = await addVersion(designId, file);
            if (newVersionId) {
                setSelectedVersionId(newVersionId);
            }
        } catch (error) {
            console.error('Failed to upload file:', error);
        } finally {
            setUploading(false);
            // Reset the input so the same file can be uploaded again if needed
            event.target.value = '';
        }
    };

    if (!design) return <div className="p-8 text-center">Design not found</div>;

    const isOldVersion = selectedVersionId !== design.currentVersionId;

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
            {/* Toolbar */}
            <div className="border-b px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="font-semibold text-lg truncate max-w-md">{design.name}</h2>
                        <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{design.createdBy}</span>
                            <span>•</span>
                            <span>{new Date(design.updatedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <DesignStatusBadge status={design.status} />
                    <DesignWorkflowActions designId={design.id} currentStatus={design.status} />
                </div>

                <div className="flex items-center gap-2">
                    {/* Sidebar Toggles */}
                    <Button
                        variant={activeTab === 'comments' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="gap-2"
                        onClick={() => setActiveTab(activeTab === 'comments' ? null : 'comments')}
                    >
                        <MessageSquare className="h-4 w-4" />
                        Comments
                    </Button>
                    <Button
                        variant={activeTab === 'history' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="gap-2"
                        onClick={() => setActiveTab(activeTab === 'history' ? null : 'history')}
                    >
                        <History className="h-4 w-4" />
                        History
                    </Button>
                    <Button
                        variant={activeTab === 'workflow' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="gap-2"
                        onClick={() => setActiveTab(activeTab === 'workflow' ? null : 'workflow')}
                    >
                        <Activity className="h-4 w-4" />
                        Workflow
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Canvas / Viewer */}
                <div className="flex-1 bg-muted/30 overflow-auto relative flex flex-col">
                    {isOldVersion && (
                        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 p-2 text-center text-sm">
                            Viewing an older version. <button onClick={() => setSelectedVersionId(design.currentVersionId)} className="underline font-medium">Switch to Latest</button>
                        </div>
                    )}

                    {!fileUrl && !loading && (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <p>No design file uploaded yet.</p>
                            <input
                                id="design-version-upload"
                                type="file"
                                className="hidden"
                                accept=".dxf"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            <label htmlFor="design-version-upload">
                                <Button variant="outline" className="mt-4" asChild disabled={uploading}>
                                    <span>
                                        <Upload className="mr-2 h-4 w-4" />
                                        {uploading ? 'Uploading...' : 'Upload DXF Design'}
                                    </span>
                                </Button>
                            </label>
                        </div>
                    )}

                    {loading && (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            Loading...
                        </div>
                    )}

                    {fileUrl && fileType === 'dxf' && (
                        <div className="flex-1 min-h-0">
                            <PV3DCanvas
                                ref={pv3DCanvasRef}
                                designId={designId}
                                versionId={selectedVersionId || design.currentVersionId}
                                fileUrl={fileUrl}
                                gpsCoordinates={design.gpsCoordinates}
                                groundSizeMeters={design.groundSizeMeters}
                                highlightedElementKey={highlightedElementKey}
                                onBadgeClick={handleBadgeClick}
                            />
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                {activeTab === 'comments' && selectedVersionId && (
                    <DesignCommentPanel
                        designId={designId}
                        versionId={selectedVersionId}
                        onJumpToElement={handleJumpToElement}
                        highlightedElementKey={highlightedElementKey}
                    />
                )}
                {activeTab === 'history' && selectedVersionId && (
                    <DesignVersionHistory
                        designId={designId}
                        currentVersionId={design.currentVersionId}
                        selectedVersionId={selectedVersionId}
                        onVersionSelect={setSelectedVersionId}
                        canUpload={true}
                    />
                )}
                {activeTab === 'workflow' && (
                    <DesignWorkflowHistory designId={designId} />
                )}
            </div>
        </div>
    );
}
