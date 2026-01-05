import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  documentId: string;
  documentName: string;
  status: import('@/lib/types/document').DocumentStatus;
  fileUrl: string; // Blob URL or data URL
  onClose: () => void;
}

type ZoomLevel = 'fit-width' | 'fit-page' | number;

export function DocumentViewer({
  documentName,
  status,
  fileUrl,
  onClose,
}: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoom, setZoom] = useState<ZoomLevel>('fit-width');
  const [containerWidth, setContainerWidth] = useState<number>(800);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
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
          <DocumentStatusBadge status={status} />
        </div>

        <div className="flex items-center gap-2">
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
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[5rem] text-center">
                {pageNumber} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
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

      {/* PDF Viewer */}
      <div
        className="flex-1 overflow-auto bg-muted/30"
        ref={(el) => {
          if (el && el.clientWidth !== containerWidth) {
            setContainerWidth(el.clientWidth);
          }
        }}
      >
        <div className="flex justify-center p-8">
          <Document
            file={fileUrl}
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
            <Page
              pageNumber={pageNumber}
              width={getPageWidth()}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div className="flex items-center justify-center h-96 bg-white">
                  <div className="text-muted-foreground">Loading page...</div>
                </div>
              }
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
