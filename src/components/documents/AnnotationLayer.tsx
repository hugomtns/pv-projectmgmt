import { useState, useEffect } from 'react';
import { LocationCommentPin } from './LocationCommentPin';
import { HighlightRectangle } from './HighlightRectangle';
import { getEventPercentageCoordinates } from './utils/coordinateUtils';
import { normalizeBounds } from './utils/coordinateUtils';
import { isHighlightComment } from '@/lib/types/document';
import type { DocumentComment, HighlightColor } from '@/lib/types/document';
import type { PercentageCoordinates } from './utils/coordinateUtils';
import {
  HIGHLIGHT_COLORS,
  DEFAULT_HIGHLIGHT_COLOR,
  DRAG_THRESHOLD_PX,
  MIN_HIGHLIGHT_SIZE_PERCENT,
} from './constants/highlightConstants';

interface AnnotationLayerProps {
  /** Document ID for filtering comments */
  documentId: string;
  /** Current version ID for filtering comments */
  versionId: string;
  /** Current page number */
  currentPage: number;
  /** All document comments */
  comments: DocumentComment[];
  /** ID of highlighted comment */
  highlightedCommentId?: string;
  /** Whether annotation mode is active (click to add comments) */
  annotationMode: boolean;
  /** Callback when pin is clicked */
  onPinClick: (commentId: string) => void;
  /** Callback when layer is clicked in annotation mode */
  onAddComment?: (
    x: number,
    y: number,
    page: number,
    highlight?: { width: number; height: number; color: HighlightColor }
  ) => void;
}

/**
 * AnnotationLayer - SVG overlay for location-based comment pins and highlights
 * Uses percentage coordinates (viewBox="0 0 100 100") for responsive scaling
 * Supports click for point comments and drag for highlight comments
 */
export function AnnotationLayer({
  documentId,
  versionId,
  currentPage,
  comments,
  highlightedCommentId,
  annotationMode,
  onPinClick,
  onAddComment,
}: AnnotationLayerProps) {
  const [containerElement, setContainerElement] = useState<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<PercentageCoordinates | null>(null);
  const [dragCurrent, setDragCurrent] = useState<PercentageCoordinates | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  // Calculate aspect ratio from the SVG container dimensions
  useEffect(() => {
    if (!containerElement) return;

    const updateAspectRatio = () => {
      const rect = containerElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Aspect ratio is height/width to correct the Y-axis scaling
        setAspectRatio(rect.height / rect.width);
      }
    };

    // Initial calculation
    updateAspectRatio();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateAspectRatio);
    resizeObserver.observe(containerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerElement]);

  // Filter comments for current page and version
  const pageComments = comments.filter(
    (comment) =>
      comment.type === 'location' &&
      comment.location &&
      comment.location.page === currentPage &&
      comment.documentId === documentId &&
      comment.versionId === versionId
  );

  // Separate highlights from point comments
  const highlightComments = pageComments.filter(isHighlightComment);
  const pointComments = pageComments.filter((c) => !isHighlightComment(c));

  // Handle Escape key to cancel drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDragging]);

  // Reset drag state if page changes
  useEffect(() => {
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  }, [currentPage]);

  // Handle mouse down - start drag
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!annotationMode || !onAddComment || !containerElement) return;

    // Don't start drag if clicking on existing annotation
    const target = e.target as SVGElement;
    if (target.closest('g')) return;

    const coords = getEventPercentageCoordinates(e.nativeEvent, containerElement as unknown as HTMLElement);
    setIsDragging(true);
    setDragStart(coords);
    setDragCurrent(coords);
  };

  // Handle mouse move - update drag
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !dragStart || !containerElement) return;

    const coords = getEventPercentageCoordinates(e.nativeEvent, containerElement as unknown as HTMLElement);

    // Clamp coordinates to 0-100 range
    const clampedCoords = {
      x: Math.max(0, Math.min(100, coords.x)),
      y: Math.max(0, Math.min(100, coords.y)),
    };

    setDragCurrent(clampedCoords);
  };

  // Handle mouse up - finish drag
  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragCurrent || !onAddComment || !containerElement) return;

    setIsDragging(false);

    // Calculate pixel distance to determine if this is a click or drag
    const percentDx = Math.abs(dragCurrent.x - dragStart.x);
    const percentDy = Math.abs(dragCurrent.y - dragStart.y);

    const containerRect = containerElement.getBoundingClientRect();
    const pixelDx = (percentDx / 100) * containerRect.width;
    const pixelDy = (percentDy / 100) * containerRect.height;
    const pixelDistance = Math.sqrt(pixelDx * pixelDx + pixelDy * pixelDy);

    // If distance is below threshold, treat as point comment
    if (pixelDistance < DRAG_THRESHOLD_PX) {
      onAddComment(dragStart.x, dragStart.y, currentPage);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    // Normalize bounds (handle drag in any direction)
    const bounds = normalizeBounds(
      dragStart.x,
      dragStart.y,
      dragCurrent.x,
      dragCurrent.y
    );

    // Check minimum size
    if (bounds.width < MIN_HIGHLIGHT_SIZE_PERCENT && bounds.height < MIN_HIGHLIGHT_SIZE_PERCENT) {
      // Too small, treat as point comment
      onAddComment(dragStart.x, dragStart.y, currentPage);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    // Create highlight comment
    onAddComment(bounds.x, bounds.y, currentPage, {
      width: bounds.width,
      height: bounds.height,
      color: DEFAULT_HIGHLIGHT_COLOR,
    });

    setDragStart(null);
    setDragCurrent(null);
  };

  // Calculate drag preview bounds
  const dragPreviewBounds = isDragging && dragStart && dragCurrent
    ? {
        x: Math.min(dragStart.x, dragCurrent.x),
        y: Math.min(dragStart.y, dragCurrent.y),
        width: Math.abs(dragCurrent.x - dragStart.x),
        height: Math.abs(dragCurrent.y - dragStart.y),
      }
    : null;

  return (
    <svg
      ref={setContainerElement}
      viewBox={`0 0 100 ${100 * aspectRatio}`}
      preserveAspectRatio="none"
      className={`absolute inset-0 w-full h-full pointer-events-auto z-10 ${
        annotationMode ? 'cursor-crosshair' : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Layer 1: Highlight rectangles (bottom layer) */}
      <g className="highlights-layer">
        {highlightComments.map((comment) => {
          if (!comment.location) return null;
          return (
            <HighlightRectangle
              key={comment.id}
              location={comment.location}
              highlighted={comment.id === highlightedCommentId}
              onClick={() => onPinClick(comment.id)}
            />
          );
        })}
      </g>

      {/* Layer 2: Location comment pins (above highlights) */}
      <g className="pins-layer">
        {pointComments.map((comment, index) => {
          if (!comment.location) return null;
          return (
            <LocationCommentPin
              key={comment.id}
              location={{
                x: comment.location.x,
                y: comment.location.y,
                page: comment.location.page,
              }}
              number={index + 1}
              resolved={comment.resolved}
              highlighted={comment.id === highlightedCommentId}
              onClick={() => onPinClick(comment.id)}
            />
          );
        })}
      </g>

      {/* Layer 3: Drag preview (top layer) */}
      {dragPreviewBounds && (
        <g className="preview-layer">
          <rect
            x={`${dragPreviewBounds.x}%`}
            y={`${dragPreviewBounds.y}%`}
            width={`${dragPreviewBounds.width}%`}
            height={`${dragPreviewBounds.height}%`}
            fill={HIGHLIGHT_COLORS[DEFAULT_HIGHLIGHT_COLOR]}
            opacity="0.25"
            pointerEvents="none"
          />
        </g>
      )}
    </svg>
  );
}
