import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
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
// Actually, generic VersionUploadDialog might expect DocumentStore structure. 
// I should create a simple upload dialog for designs or adapt the existing one. 
// For speed, let's create a simple file input trigger for now since DesignVersionHistory has the button.

import {
    ZoomIn,
    ZoomOut,
    X,
    MessageSquare,
    History,
    Activity,
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DesignViewerProps {
    designId: string;
    onClose: () => void;
}

type ZoomLevel = 'fit-width' | 'fit-page' | number;

export function DesignViewer({ designId, onClose }: DesignViewerProps) {
    const designs = useDesignStore((state) => state.designs);

    const design = designs.find((d) => d.id === designId);
    const versionId = design?.currentVersionId;

    const [zoom, setZoom] = useState<ZoomLevel>('fit-width');
    const [containerWidth, setContainerWidth] = useState<number>(800);

    // Sidebars
    const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'workflow' | null>('comments');

    // State
    const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(versionId);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'image' | 'pdf' | 'dxf' | 'gltf' | 'fbx' | 'obj'>('image');
    const [loading, setLoading] = useState(true);

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

    const handleZoomIn = () => {
        if (typeof zoom === 'number') {
            setZoom(Math.min(200, zoom + 25));
        } else {
            setZoom(100);
        }
    };

    const handleZoomOut = () => {
        if (typeof zoom === 'number') {
            setZoom(Math.max(25, zoom - 25));
        } else {
            setZoom(100);
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
                    {/* View Actions */}
                    <div className="flex items-center gap-1 border-r pr-2 mr-2">
                        <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <div className="w-12 text-center text-sm">{typeof zoom === 'number' ? `${zoom}%` : 'Fit'}</div>
                        <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>

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
                <div className="flex-1 bg-muted/30 overflow-auto relative flex flex-col"
                    ref={(el) => {
                        if (el && el.clientWidth !== containerWidth) {
                            setContainerWidth(el.clientWidth);
                        }
                    }}
                >
                    {isOldVersion && (
                        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 p-2 text-center text-sm">
                            Viewing an older version. <button onClick={() => setSelectedVersionId(design.currentVersionId)} className="underline font-medium">Switch to Latest</button>
                        </div>
                    )}

                    {!fileUrl && !loading && (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <p>No design file uploaded yet.</p>
                            <label htmlFor="design-version-upload">
                                <Button variant="outline" className="mt-4" asChild>
                                    <span><ZoomIn className="mr-2 h-4 w-4" /> Upload Initial Design</span>
                                </Button>
                            </label>
                        </div>
                    )}

                    {loading && (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            Loading...
                        </div>
                    )}

                    {fileUrl && (
                        <div className="flex-1 p-8 flex justify-center min-h-0">
                            {fileType === 'dxf' || fileType === 'gltf' || fileType === 'fbx' || fileType === 'obj' ? (
                                <div className="w-full h-full">
                                    <PV3DCanvas
                                        designId={designId}
                                        versionId={selectedVersionId || design.currentVersionId}
                                        fileUrl={fileUrl}
                                    />
                                </div>
                            ) : fileType === 'pdf' ? (
                                <div className="shadow-lg">
                                    <Document
                                        file={fileUrl}
                                        // onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                        loading={<div className="h-96 w-64 flex items-center justify-center bg-white">Loading PDF...</div>}
                                    >
                                        <Page
                                            pageNumber={1}
                                            width={typeof zoom === 'number' ? (containerWidth * zoom / 100) : (containerWidth * 0.9)}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                        />
                                    </Document>
                                </div>
                            ) : (
                                <div className="relative shadow-lg inline-block" style={{
                                    width: typeof zoom === 'number' ? `${zoom}%` : 'auto',
                                    maxWidth: typeof zoom === 'number' ? 'none' : '90%',
                                    transition: 'width 0.2s ease-out'
                                }}>
                                    <img src={fileUrl} alt="Design" className="block w-full h-auto rounded-md bg-white" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                {activeTab === 'comments' && selectedVersionId && (
                    <DesignCommentPanel
                        designId={designId}
                        versionId={selectedVersionId}
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
