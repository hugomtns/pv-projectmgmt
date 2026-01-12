import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getBlob } from '@/lib/db';
import { blobCache } from '@/lib/blobCache';
import { useDocumentStore } from '@/stores/documentStore';
import { useUserStore } from '@/stores/userStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { AnnotationLayer } from './AnnotationLayer';
import { CommentPanel } from './CommentPanel';
import { DrawingToolbar, type DrawingTool, type DrawingColor, type StrokeWidth } from './DrawingToolbar';
import { DrawingLayer } from './DrawingLayer';
import { VersionHistory } from './VersionHistory';
import type { HighlightColor } from '@/lib/types/document';
import { VersionUploadDialog } from './VersionUploadDialog';
import { AddLocationCommentDialog } from './AddLocationCommentDialog';
import { WorkflowActions } from './WorkflowActions';
import { WorkflowHistory } from './WorkflowHistory';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  MapPin,
  Pencil,
  History,
  ListTodo,
  Lock,
  Unlock,
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  documentId: string;
  versionId: string;
  documentName: string;
  status: import('@/lib/types/document').DocumentStatus;
  fileUrl: string; // Blob URL or data URL
  onClose: () => void;
}

type ZoomLevel = 'fit-width' | 'fit-page' | number;

export function DocumentViewer({
  documentId,
  versionId,
  documentName,
  status,
  fileUrl,
  onClose,
}: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<ZoomLevel>('fit-width');
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string>();
  const [showComments, setShowComments] = useState(true);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('select');
  const [drawingColor, setDrawingColor] = useState<DrawingColor>('#EF4444');
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState<StrokeWidth>(4);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(versionId);
  const [selectedVersionFileUrl, setSelectedVersionFileUrl] = useState<string | null>(null);
  const [showVersionUpload, setShowVersionUpload] = useState(false);
  const [showWorkflowHistory, setShowWorkflowHistory] = useState(false);
  const [showAddCommentDialog, setShowAddCommentDialog] = useState(false);
  const [pendingCommentLocation, setPendingCommentLocation] = useState<{
    x: number;
    y: number;
    page: number;
  } | null>(null);
  const [pendingHighlight, setPendingHighlight] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    color: HighlightColor;
  } | null>(null);

  const addComment = useDocumentStore((state) => state.addComment);
  const deleteDrawing = useDocumentStore((state) => state.deleteDrawing);
  const lockDocument = useDocumentStore((state) => state.lockDocument);
  const unlockDocument = useDocumentStore((state) => state.unlockDocument);
  const doc = useDocumentStore((state) =>
    state.documents.find(d => d.id === documentId)
  );

  const currentUser = useUserStore((state) => state.currentUser);
  const roles = useUserStore((state) => state.roles);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);

  // Fetch comments from IndexedDB
  const comments = useLiveQuery(
    () =>
      db.documentComments
        .where('documentId')
        .equals(documentId)
        .toArray(),
    [documentId]
  ) || [];

  // Load file when selected version changes
  useEffect(() => {
    let previousBlobId: string | null = null;

    const loadVersionFile = async () => {
      if (!selectedVersionId) return;

      try {
        const version = await db.documentVersions.get(selectedVersionId);
        if (!version) return;

        const blobId = version.pdfFileBlob || version.originalFileBlob;

        // Release previous blob from cache
        if (previousBlobId && previousBlobId !== blobId) {
          blobCache.release(previousBlobId);
        }

        // Get URL from cache
        const url = await blobCache.get(blobId, getBlob);
        if (!url) return;

        setSelectedVersionFileUrl(url);
        previousBlobId = blobId;
      } catch (err) {
        console.error('Failed to load version file:', err);
      }
    };

    loadVersionFile();

    // Cleanup on unmount
    return () => {
      if (previousBlobId) {
        blobCache.release(previousBlobId);
      }
    };
  }, [selectedVersionId]);

  // Determine which file URL to use (selected version or prop)
  const activeFileUrl = selectedVersionFileUrl || fileUrl;
  const activeVersionId = selectedVersionId;
  const isViewingOldVersion = selectedVersionId !== versionId;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // Generate array of page numbers for rendering
  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
    // Scroll to previous page
    const pageElement = document.querySelector(`[data-page-number="${currentPage - 1}"]`);
    pageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(numPages, prev + 1));
    // Scroll to next page
    const pageElement = document.querySelector(`[data-page-number="${currentPage + 1}"]`);
    pageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const handleFitWidth = () => {
    setZoom('fit-width');
  };

  const handleAddLocationComment = (
    x: number,
    y: number,
    page: number,
    highlight?: { width: number; height: number; color: HighlightColor }
  ) => {
    // Store the location/highlight and show dialog
    if (highlight) {
      setPendingHighlight({ x, y, ...highlight, page });
      setPendingCommentLocation(null);
    } else {
      setPendingCommentLocation({ x, y, page });
      setPendingHighlight(null);
    }
    setShowAddCommentDialog(true);
  };

  const handleCommentSubmit = async (comment: string, highlightColor?: HighlightColor) => {
    if (pendingHighlight) {
      // Handle highlight comment
      const { x, y, width, height, page, color } = pendingHighlight;
      const commentId = await addComment(documentId, selectedVersionId, comment, {
        x,
        y,
        page,
        width,
        height,
        highlightColor: highlightColor || color,
      });

      if (commentId) {
        setHighlightedCommentId(commentId);
        setAnnotationMode(false);
      }

      setPendingHighlight(null);
    } else if (pendingCommentLocation) {
      // Handle point comment
      const { x, y, page } = pendingCommentLocation;
      const commentId = await addComment(documentId, selectedVersionId, comment, { x, y, page });

      if (commentId) {
        setHighlightedCommentId(commentId);
        setAnnotationMode(false);
      }

      setPendingCommentLocation(null);
    }
  };

  const handlePinClick = (commentId: string) => {
    // Toggle selection: if already highlighted, deselect it
    setHighlightedCommentId((prev) => (prev === commentId ? undefined : commentId));
  };

  const handleLocationCommentClick = (commentId: string, page: number, commentVersionId: string) => {
    // Switch version if different from currently selected version
    if (commentVersionId !== selectedVersionId) {
      setSelectedVersionId(commentVersionId);
      setHighlightedCommentId(commentId);
      // The useEffect will handle loading the new version file
      // Navigate to the page after a short delay to let the version load
      if (page > 0) {
        setTimeout(() => {
          setCurrentPage(page);
          const pageElement = document.querySelector(`[data-page-number="${page}"]`);
          pageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    } else {
      // Same version, navigate immediately (only if page specified)
      setHighlightedCommentId(commentId);
      if (page > 0) {
        setCurrentPage(page);
        const pageElement = document.querySelector(`[data-page-number="${page}"]`);
        pageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleClearAllDrawings = async () => {
    if (!confirm('Clear all drawings on this document? This cannot be undone.')) return;

    const pageDrawings = await db.drawings
      .where('documentId')
      .equals(documentId)
      .toArray();

    for (const drawing of pageDrawings) {
      await deleteDrawing(drawing.id);
    }
  };

  // Lock management
  const canManageLock = (() => {
    if (!currentUser || !doc) return false;

    const permissions = getDocumentPermissions(
      currentUser,
      documentId,
      permissionOverrides,
      roles
    );

    if (!permissions.update) return false;

    if (doc.isLocked) {
      const isAdmin = currentUser.roleId === 'role-admin';
      const isLocker = doc.lockedByUserId === currentUser.id;
      return isAdmin || isLocker;
    }

    return true;
  })();

  const handleLockToggle = async () => {
    if (!doc) return;

    if (doc.isLocked) {
      await unlockDocument(documentId);
    } else {
      await lockDocument(documentId);
    }
  };

  const getPageWidth = () => {
    if (zoom === 'fit-width') {
      return containerWidth;
    }
    if (zoom === 'fit-page') {
      return containerWidth * 0.9;
    }
    // Percentage zoom
    return (containerWidth * zoom) / 100;
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Toolbar */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-lg truncate max-w-md" title={documentName}>
            {documentName}
          </h2>
          <DocumentStatusBadge status={doc?.status ?? status} />
          {doc?.isLocked && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Locked by {doc.lockedBy}
            </Badge>
          )}
          <WorkflowActions documentId={documentId} currentStatus={doc?.status ?? status} />
        </div>

        <div className="flex items-center gap-2">
          {/* Lock/Unlock button */}
          {canManageLock && doc && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLockToggle}
                title={doc.isLocked ? 'Unlock document' : 'Lock document'}
              >
                {doc.isLocked ? (
                  <Unlock className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </Button>
              <div className="h-6 w-px bg-border" />
            </>
          )}

          {/* Annotation & Drawing Mode */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button
              variant={annotationMode ? 'default' : 'ghost'}
              size="icon"
              onClick={() => {
                setAnnotationMode(!annotationMode);
                if (!annotationMode) setDrawingMode(false);
              }}
              title="Add location comment"
            >
              <MapPin className="h-4 w-4" />
            </Button>
            <Button
              variant={drawingMode ? 'default' : 'ghost'}
              size="icon"
              onClick={() => {
                setDrawingMode(!drawingMode);
                if (!drawingMode) {
                  setAnnotationMode(false);
                  setDrawingTool('rectangle');
                }
              }}
              title="Drawing mode"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant={showComments ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setShowComments(!showComments)}
              title="Toggle comments panel"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant={showVersionHistory ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              title="Toggle version history"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant={showWorkflowHistory ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setShowWorkflowHistory(!showWorkflowHistory)}
              title="Toggle workflow history"
            >
              <ListTodo className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button variant="ghost" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleFitWidth}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            {typeof zoom === 'number' && (
              <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                {zoom}%
              </span>
            )}
          </div>

          {/* Page Navigation */}
          {numPages > 1 && (
            <div className="flex items-center gap-1 border-r pr-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[5rem] text-center">
                {currentPage} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextPage}
                disabled={currentPage >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Close */}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Drawing Toolbar */}
      {drawingMode && (
        <DrawingToolbar
          activeTool={drawingTool}
          activeColor={drawingColor}
          activeStrokeWidth={drawingStrokeWidth}
          onToolChange={setDrawingTool}
          onColorChange={setDrawingColor}
          onStrokeWidthChange={setDrawingStrokeWidth}
          onClearAll={handleClearAllDrawings}
        />
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <div
          className="flex-1 overflow-auto bg-muted/30 relative"
          ref={(el) => {
            if (el && el.clientWidth !== containerWidth) {
              setContainerWidth(el.clientWidth);
            }
          }}
        >
          {/* Old Version Banner */}
          {isViewingOldVersion && (
            <div className="bg-amber-500/20 border-b border-amber-500/50 p-3 text-center">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                You are viewing an old version. This is not the current version.
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSelectedVersionId(versionId)}
                  className="ml-2 text-amber-900 dark:text-amber-100 underline p-0 h-auto"
                >
                  View current version
                </Button>
              </p>
            </div>
          )}

          {/* Annotation Mode Banner */}
          {annotationMode && (
            <div className="bg-blue-500/20 border-b border-blue-500/50 p-3 text-center">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Click for a point comment, or drag to create a highlight comment
              </p>
            </div>
          )}

          <div className="flex flex-col items-center p-8 space-y-4">
            <Document
              file={activeFileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-96">
                  <div className="text-muted-foreground">Loading PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-96">
                  <div className="text-destructive">Failed to load PDF</div>
                </div>
              }
            >
              {/* Render all pages */}
              {pageNumbers.map((pageNumber) => (
                <div
                  key={pageNumber}
                  data-page-number={pageNumber}
                  className="relative mb-4 shadow-lg"
                >
                  <Page
                    pageNumber={pageNumber}
                    width={getPageWidth()}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading={
                      <div className="flex items-center justify-center h-96 bg-white">
                        <div className="text-muted-foreground">Loading page {pageNumber}...</div>
                      </div>
                    }
                  />
                  {/* Annotation Layer Overlay */}
                  {!drawingMode && (
                    <div className="absolute inset-0 pointer-events-none">
                      <AnnotationLayer
                        documentId={documentId}
                        versionId={activeVersionId}
                        currentPage={pageNumber}
                        comments={comments}
                        highlightedCommentId={highlightedCommentId}
                        annotationMode={annotationMode}
                        onPinClick={handlePinClick}
                        onAddComment={handleAddLocationComment}
                      />
                    </div>
                  )}

                  {/* Drawing Layer Overlay */}
                  {drawingMode && (
                    <div className="absolute inset-0 pointer-events-none">
                      <DrawingLayer
                        documentId={documentId}
                        versionId={activeVersionId}
                        currentPage={pageNumber}
                        activeTool={drawingTool}
                        activeColor={drawingColor}
                        activeStrokeWidth={drawingStrokeWidth}
                        onDisableDrawing={() => setDrawingMode(false)}
                      />
                    </div>
                  )}

                  {/* Page number indicator */}
                  <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    Page {pageNumber}
                  </div>
                </div>
              ))}
            </Document>
          </div>
        </div>

        {/* Comment Panel */}
        {showComments && (
          <div className="w-96 flex-shrink-0">
            <CommentPanel
              documentId={documentId}
              selectedVersionId={activeVersionId}
              highlightedCommentId={highlightedCommentId}
              onLocationCommentClick={handleLocationCommentClick}
            />
          </div>
        )}

        {/* Version History Panel */}
        {showVersionHistory && doc && (
          <VersionHistory
            documentId={documentId}
            currentVersionId={versionId}
            selectedVersionId={selectedVersionId}
            onVersionSelect={setSelectedVersionId}
            onUploadVersion={() => setShowVersionUpload(true)}
            canUpload={true} // TODO: Add permission check
          />
        )}

        {/* Workflow History Panel */}
        {showWorkflowHistory && (
          <WorkflowHistory documentId={documentId} />
        )}
      </div>

      {/* Version Upload Dialog */}
      {doc && (
        <VersionUploadDialog
          open={showVersionUpload}
          onOpenChange={setShowVersionUpload}
          documentId={documentId}
          documentName={documentName}
          currentVersionNumber={doc.versions.length}
        />
      )}

      {/* Add Location Comment Dialog */}
      <AddLocationCommentDialog
        open={showAddCommentDialog}
        onOpenChange={setShowAddCommentDialog}
        onSubmit={handleCommentSubmit}
        pageNumber={(pendingHighlight?.page || pendingCommentLocation?.page) ?? 1}
        isHighlight={!!pendingHighlight}
        highlightColor={pendingHighlight?.color}
      />
    </div>
  );
}
