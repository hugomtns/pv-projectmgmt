import { useState } from 'react';
import { LocationCommentPin } from './LocationCommentPin';
import { getEventPercentageCoordinates } from './utils/coordinateUtils';
import type { DocumentComment } from '@/lib/types';

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
  onAddComment?: (x: number, y: number, page: number) => void;
}

/**
 * AnnotationLayer - SVG overlay for location-based comment pins
 * Uses percentage coordinates (viewBox="0 0 100 100") for responsive scaling
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

  // Filter comments for current page and version
  const pageComments = comments.filter(
    (comment) =>
      comment.type === 'location' &&
      comment.location &&
      comment.location.page === currentPage &&
      comment.documentId === documentId &&
      comment.versionId === versionId
  );

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!annotationMode || !onAddComment || !containerElement) return;

    // Don't add comment if clicking on a pin
    const target = e.target as SVGElement;
    if (target.closest('g')) return;

    // Get percentage coordinates
    const coords = getEventPercentageCoordinates(e.nativeEvent, containerElement as unknown as HTMLElement);
    onAddComment(coords.x, coords.y, currentPage);
  };

  return (
    <svg
      ref={setContainerElement}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`absolute inset-0 w-full h-full pointer-events-auto z-10 ${
        annotationMode ? 'cursor-crosshair' : 'cursor-default'
      }`}
      onClick={handleClick}
    >
      {/* Render location comment pins */}
      {pageComments.map((comment, index) => {
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
    </svg>
  );
}
