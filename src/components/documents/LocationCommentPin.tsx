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
  // Determine colors based on state
  const getColors = () => {
    if (resolved) {
      return {
        fill: 'fill-gray-400',
        stroke: 'stroke-gray-500',
        textFill: 'fill-white',
        opacity: 'opacity-70',
      };
    }
    if (highlighted) {
      return {
        fill: 'fill-indigo-500',
        stroke: 'stroke-indigo-600',
        textFill: 'fill-white',
        opacity: 'opacity-100',
      };
    }
    return {
      fill: 'fill-sky-500',
      stroke: 'stroke-sky-600',
      textFill: 'fill-white',
      opacity: 'opacity-100',
    };
  };

  const colors = getColors();
  const radius = highlighted ? 3 : 2.5;
  const strokeWidth = highlighted ? 0.6 : 0.5;

  return (
    <>
      {/* SVG Filter Definition */}
      <defs>
        <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.3" />
          <feOffset dx="0" dy="0.2" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          'cursor-pointer transition-all hover:scale-110',
          colors.opacity
        )}
        style={{
          transform: `translate(${location.x}%, ${location.y}%)`,
        }}
      >
        {/* Animated pulse ring for highlighted state */}
        {highlighted && (
          <circle
            cx={0}
            cy={0}
            r={4.5}
            className="fill-none stroke-indigo-400 animate-pulse"
            strokeWidth={0.4}
            opacity={0.6}
          />
        )}

        {/* Main pin circle with drop shadow */}
        <circle
          cx={0}
          cy={0}
          r={radius}
          className={cn(colors.fill, colors.stroke, 'transition-all')}
          strokeWidth={strokeWidth}
          filter="url(#pin-shadow)"
        />

        {/* Number text */}
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          className={cn(
            colors.textFill,
            'pointer-events-none select-none'
          )}
          fontSize="2.8"
          fontWeight="700"
        >
          {number}
        </text>
      </g>
    </>
  );
}
