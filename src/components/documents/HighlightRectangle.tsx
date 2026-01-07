import type { LocationAnchor } from '@/lib/types/document';
import { HIGHLIGHT_COLORS, HIGHLIGHT_OPACITY } from './constants/highlightConstants';

interface HighlightRectangleProps {
  /** Location anchor with width/height/highlightColor */
  location: LocationAnchor;
  /** Whether this highlight is currently selected */
  highlighted?: boolean;
  /** Callback when highlight is clicked */
  onClick: () => void;
}

/**
 * HighlightRectangle - Renders a semi-transparent colored rectangle for highlight comments
 * Uses percentage coordinates for responsive scaling across zoom levels
 */
export function HighlightRectangle({
  location,
  highlighted = false,
  onClick,
}: HighlightRectangleProps) {
  // Ensure required fields exist
  if (!location.width || !location.height || !location.highlightColor) {
    return null;
  }

  const color = HIGHLIGHT_COLORS[location.highlightColor];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <g
      onClick={handleClick}
      className="cursor-pointer transition-transform hover:scale-[1.01]"
      style={{
        transformOrigin: `${location.x + location.width / 2}% ${location.y + location.height / 2}%`,
      }}
    >
      {/* Main highlight fill */}
      <rect
        x={`${location.x}%`}
        y={`${location.y}%`}
        width={`${location.width}%`}
        height={`${location.height}%`}
        fill={color}
        opacity={HIGHLIGHT_OPACITY}
        pointerEvents="auto"
      />

      {/* Border when highlighted */}
      {highlighted && (
        <rect
          x={`${location.x}%`}
          y={`${location.y}%`}
          width={`${location.width}%`}
          height={`${location.height}%`}
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          opacity="0.5"
          pointerEvents="none"
          className="animate-pulse"
        />
      )}
    </g>
  );
}
