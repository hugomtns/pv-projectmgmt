import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useDocumentStore } from '@/stores/documentStore';
import { getEventPercentageCoordinates, normalizeBounds } from './utils/coordinateUtils';
import type { Drawing } from '@/lib/types';
import type { DrawingTool, DrawingColor, StrokeWidth } from './DrawingToolbar';

interface DrawingLayerProps {
  /** Document ID for filtering drawings */
  documentId: string;
  /** Version ID for the current document version */
  versionId: string;
  /** Current page number */
  currentPage: number;
  /** Active drawing tool */
  activeTool: DrawingTool;
  /** Active color */
  activeColor: DrawingColor;
  /** Active stroke width */
  activeStrokeWidth: StrokeWidth;
  /** Callback when drawing mode should be disabled */
  onDisableDrawing?: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface CurrentDrawing {
  type: DrawingTool;
  startPoint: Point;
  currentPoint: Point;
  points?: Point[]; // For freehand
  color: DrawingColor;
  strokeWidth: StrokeWidth;
}

/**
 * DrawingLayer - SVG overlay for drawing shapes and annotations
 */
export function DrawingLayer({
  documentId,
  versionId,
  currentPage,
  activeTool,
  activeColor,
  activeStrokeWidth,
  onDisableDrawing,
}: DrawingLayerProps) {
  const [containerElement, setContainerElement] = useState<SVGSVGElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<CurrentDrawing | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  const addDrawing = useDocumentStore((state) => state.addDrawing);
  const deleteDrawing = useDocumentStore((state) => state.deleteDrawing);

  // Fetch drawings from IndexedDB for current page
  const drawings = useLiveQuery(
    () =>
      db.drawings
        .where('[documentId+page]')
        .equals([documentId, currentPage])
        .toArray(),
    [documentId, currentPage]
  ) || [];

  // Handle mouse down - start drawing
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'select' || !containerElement) return;

    const coords = getEventPercentageCoordinates(e.nativeEvent, containerElement as unknown as HTMLElement);

    setIsDrawing(true);
    setCurrentDrawing({
      type: activeTool,
      startPoint: coords,
      currentPoint: coords,
      points: activeTool === 'freehand' ? [coords] : undefined,
      color: activeColor,
      strokeWidth: activeStrokeWidth,
    });
  };

  // Handle mouse move - update current drawing
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !currentDrawing || !containerElement) return;

    const coords = getEventPercentageCoordinates(e.nativeEvent, containerElement as unknown as HTMLElement);

    if (currentDrawing.type === 'freehand') {
      setCurrentDrawing({
        ...currentDrawing,
        currentPoint: coords,
        points: [...(currentDrawing.points || []), coords],
      });
    } else {
      setCurrentDrawing({
        ...currentDrawing,
        currentPoint: coords,
      });
    }
  };

  // Handle mouse up - finish drawing
  const handleMouseUp = async () => {
    if (!isDrawing || !currentDrawing) return;

    setIsDrawing(false);

    // Don't save if drawing is too small (accidental clicks)
    const dx = Math.abs(currentDrawing.currentPoint.x - currentDrawing.startPoint.x);
    const dy = Math.abs(currentDrawing.currentPoint.y - currentDrawing.startPoint.y);
    if (dx < 0.5 && dy < 0.5 && currentDrawing.type !== 'freehand') {
      setCurrentDrawing(null);
      return;
    }

    // Save drawing to IndexedDB
    const bounds = normalizeBounds(
      currentDrawing.startPoint.x,
      currentDrawing.startPoint.y,
      currentDrawing.currentPoint.x,
      currentDrawing.currentPoint.y
    );

    const drawingData: Omit<Drawing, 'id' | 'createdAt' | 'createdBy'> = {
      documentId,
      versionId,
      page: currentPage,
      type: currentDrawing.type as 'rectangle' | 'circle' | 'arrow' | 'freehand',
      color: currentDrawing.color,
      strokeWidth: currentDrawing.strokeWidth,
      bounds,
      points: currentDrawing.points,
      arrowDirection: currentDrawing.type === 'arrow' ? {
        fromX: currentDrawing.startPoint.x,
        fromY: currentDrawing.startPoint.y,
        toX: currentDrawing.currentPoint.x,
        toY: currentDrawing.currentPoint.y,
      } : undefined,
    };

    await addDrawing(drawingData);
    setCurrentDrawing(null);
  };

  // Handle click on drawing for selection
  const handleDrawingClick = (drawingId: string, e: React.MouseEvent) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelectedDrawingId(drawingId);
  };

  // Handle delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedDrawingId) {
          deleteDrawing(selectedDrawingId);
          setSelectedDrawingId(null);
        }
      }
      if (e.key === 'Escape') {
        setSelectedDrawingId(null);
        if (onDisableDrawing) {
          onDisableDrawing();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, deleteDrawing, onDisableDrawing]);

  // Render shape based on type
  const renderDrawing = (drawing: Drawing, isSelected = false) => {
    const { type, bounds, color, strokeWidth, points } = drawing;
    const stroke = color;
    const fill = 'none';
    const strokeDasharray = isSelected ? '2 2' : undefined;
    const opacity = isSelected ? 0.8 : 1;

    switch (type) {
      case 'rectangle':
        return (
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            stroke={stroke}
            strokeWidth={strokeWidth / 10}
            fill={fill}
            strokeDasharray={strokeDasharray}
            opacity={opacity}
            onClick={(e) => handleDrawingClick(drawing.id, e)}
            className={activeTool === 'select' ? 'cursor-pointer' : undefined}
          />
        );

      case 'circle': {
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        const rx = bounds.width / 2;
        const ry = bounds.height / 2;
        return (
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            stroke={stroke}
            strokeWidth={strokeWidth / 10}
            fill={fill}
            strokeDasharray={strokeDasharray}
            opacity={opacity}
            onClick={(e) => handleDrawingClick(drawing.id, e)}
            className={activeTool === 'select' ? 'cursor-pointer' : undefined}
          />
        );
      }

      case 'arrow': {
        // Use arrow direction if available (new), otherwise bounds (legacy)
        let x1, y1, x2, y2;

        if (drawing.arrowDirection) {
          x1 = drawing.arrowDirection.fromX;
          y1 = drawing.arrowDirection.fromY;
          x2 = drawing.arrowDirection.toX;
          y2 = drawing.arrowDirection.toY;
        } else {
          // Legacy fallback
          x1 = bounds.x;
          y1 = bounds.y;
          x2 = bounds.x + bounds.width;
          y2 = bounds.y + bounds.height;
        }

        // Arrow head
        const headLength = 3;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowX1 = x2 - headLength * Math.cos(angle - Math.PI / 6);
        const arrowY1 = y2 - headLength * Math.sin(angle - Math.PI / 6);
        const arrowX2 = x2 - headLength * Math.cos(angle + Math.PI / 6);
        const arrowY2 = y2 - headLength * Math.sin(angle + Math.PI / 6);

        return (
          <g onClick={(e) => handleDrawingClick(drawing.id, e)} className={activeTool === 'select' ? 'cursor-pointer' : undefined}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={strokeWidth / 10}
              strokeDasharray={strokeDasharray}
              opacity={opacity}
            />
            <line
              x1={x2}
              y1={y2}
              x2={arrowX1}
              y2={arrowY1}
              stroke={stroke}
              strokeWidth={strokeWidth / 10}
              opacity={opacity}
            />
            <line
              x1={x2}
              y1={y2}
              x2={arrowX2}
              y2={arrowY2}
              stroke={stroke}
              strokeWidth={strokeWidth / 10}
              opacity={opacity}
            />
          </g>
        );
      }

      case 'freehand': {
        if (!points || points.length === 0) return null;
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return (
          <path
            d={pathData}
            stroke={stroke}
            strokeWidth={strokeWidth / 10}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={strokeDasharray}
            opacity={opacity}
            onClick={(e) => handleDrawingClick(drawing.id, e)}
            className={activeTool === 'select' ? 'cursor-pointer' : undefined}
          />
        );
      }

      default:
        return null;
    }
  };

  // Render current drawing being created
  const renderCurrentDrawing = () => {
    if (!currentDrawing) return null;

    const { type, startPoint, currentPoint, points, color, strokeWidth } = currentDrawing;
    const stroke = color;
    const fill = 'none';

    const bounds = normalizeBounds(
      startPoint.x,
      startPoint.y,
      currentPoint.x,
      currentPoint.y
    );

    switch (type) {
      case 'rectangle':
        return (
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            stroke={stroke}
            strokeWidth={strokeWidth / 10}
            fill={fill}
            opacity={0.7}
          />
        );

      case 'circle': {
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        const rx = bounds.width / 2;
        const ry = bounds.height / 2;
        return (
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            stroke={stroke}
            strokeWidth={strokeWidth / 10}
            fill={fill}
            opacity={0.7}
          />
        );
      }

      case 'arrow': {
        const x1 = startPoint.x;
        const y1 = startPoint.y;
        const x2 = currentPoint.x;
        const y2 = currentPoint.y;

        const headLength = 3;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowX1 = x2 - headLength * Math.cos(angle - Math.PI / 6);
        const arrowY1 = y2 - headLength * Math.sin(angle - Math.PI / 6);
        const arrowX2 = x2 - headLength * Math.cos(angle + Math.PI / 6);
        const arrowY2 = y2 - headLength * Math.sin(angle + Math.PI / 6);

        return (
          <g opacity={0.7}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={strokeWidth / 10}
            />
            <line
              x1={x2}
              y1={y2}
              x2={arrowX1}
              y2={arrowY1}
              stroke={stroke}
              strokeWidth={strokeWidth / 10}
            />
            <line
              x1={x2}
              y1={y2}
              x2={arrowX2}
              y2={arrowY2}
              stroke={stroke}
              strokeWidth={strokeWidth / 10}
            />
          </g>
        );
      }

      case 'freehand': {
        if (!points || points.length === 0) return null;
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return (
          <path
            d={pathData}
            stroke={stroke}
            strokeWidth={strokeWidth / 10}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.7}
          />
        );
      }

      default:
        return null;
    }
  };

  const getCursor = () => {
    if (activeTool === 'select') return 'default';
    return 'crosshair';
  };

  return (
    <svg
      ref={setContainerElement}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`absolute inset-0 w-full h-full pointer-events-auto z-10 cursor-${getCursor()}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Render existing drawings */}
      {drawings.map((drawing) =>
        renderDrawing(drawing, drawing.id === selectedDrawingId)
      )}

      {/* Render current drawing in progress */}
      {renderCurrentDrawing()}

      {/* Selection indicator */}
      {selectedDrawingId && (
        <text
          x={2}
          y={5}
          className="text-[2px] fill-destructive select-none pointer-events-none"
        >
          Press Delete to remove selected shape
        </text>
      )}
    </svg>
  );
}
