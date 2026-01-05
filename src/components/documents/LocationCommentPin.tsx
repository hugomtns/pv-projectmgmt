import { cn } from '@/lib/utils';
import type { PercentageCoordinates } from './utils/coordinateUtils';

interface LocationCommentPinProps {
  /** Percentage coordinates (0-100) where pin should appear */
  location: PercentageCoordinates & { page: number };
  /** Pin number/index to display */
  number: number;
  /** Whether this comment is resolved */
  resolved: boolean;
  /** Whether this pin is currently highlighted/selected */
  highlighted?: boolean;
  /** Click handler */
  onClick: () => void;
}

/**
 * LocationCommentPin - A numbered pin marker for location-based comments
 * Positioned using percentage coordinates for responsive scaling
 */
export function LocationCommentPin({
  location,
  number,
  resolved,
  highlighted,
  onClick,
}: LocationCommentPinProps) {
  return (
    <g
      onClick={onClick}
      className="cursor-pointer"
      style={{
        transform: `translate(${location.x}%, ${location.y}%)`,
      }}
    >
      {/* Pin circle */}
      <circle
        cx={0}
        cy={0}
        r={highlighted ? 2.5 : 2}
        className={cn(
          'transition-all',
          resolved
            ? 'fill-muted-foreground stroke-muted-foreground'
            : highlighted
            ? 'fill-primary stroke-primary'
            : 'fill-destructive stroke-destructive'
        )}
        strokeWidth={highlighted ? 0.5 : 0.3}
      />

      {/* Number text */}
      <text
        x={0}
        y={0.5}
        textAnchor="middle"
        className={cn(
          'text-[2.5px] font-bold fill-primary-foreground select-none pointer-events-none',
          resolved && 'fill-background'
        )}
      >
        {number}
      </text>

      {/* Highlight ring */}
      {highlighted && (
        <circle
          cx={0}
          cy={0}
          r={3.5}
          className="fill-none stroke-primary"
          strokeWidth={0.4}
          opacity={0.5}
        />
      )}
    </g>
  );
}
