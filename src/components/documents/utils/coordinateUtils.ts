/**
 * Coordinate utilities for percentage-based positioning
 * All coordinates are stored as percentages (0-100) to ensure
 * annotations scale correctly across different zoom levels and screen sizes
 */

export interface PixelCoordinates {
  x: number;
  y: number;
}

export interface PercentageCoordinates {
  x: number; // 0-100
  y: number; // 0-100
}

/**
 * Convert pixel coordinates to percentage coordinates
 */
export function pixelToPercentage(
  pixelX: number,
  pixelY: number,
  containerWidth: number,
  containerHeight: number
): PercentageCoordinates {
  return {
    x: (pixelX / containerWidth) * 100,
    y: (pixelY / containerHeight) * 100,
  };
}

/**
 * Convert percentage coordinates to pixel coordinates
 */
export function percentageToPixel(
  percentX: number,
  percentY: number,
  containerWidth: number,
  containerHeight: number
): PixelCoordinates {
  return {
    x: (percentX / 100) * containerWidth,
    y: (percentY / 100) * containerHeight,
  };
}

/**
 * Get coordinates from a mouse or touch event relative to a container
 */
export function getEventCoordinates(
  event: React.MouseEvent | MouseEvent,
  container: HTMLElement
): PixelCoordinates {
  const rect = container.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

/**
 * Get percentage coordinates from a mouse event
 */
export function getEventPercentageCoordinates(
  event: React.MouseEvent | MouseEvent,
  container: HTMLElement
): PercentageCoordinates {
  const rect = container.getBoundingClientRect();
  const pixel = getEventCoordinates(event, container);
  return pixelToPercentage(pixel.x, pixel.y, rect.width, rect.height);
}

/**
 * Clamp coordinates to valid percentage range (0-100)
 */
export function clampPercentage(coord: PercentageCoordinates): PercentageCoordinates {
  return {
    x: Math.max(0, Math.min(100, coord.x)),
    y: Math.max(0, Math.min(100, coord.y)),
  };
}

/**
 * Calculate distance between two percentage coordinate points
 */
export function percentageDistance(
  p1: PercentageCoordinates,
  p2: PercentageCoordinates
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a point is within a rectangular bounds (all in percentage)
 */
export function isPointInBounds(
  point: PercentageCoordinates,
  bounds: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/**
 * Normalize bounds to ensure width and height are always positive
 * Takes start and end points and returns a properly oriented bounding box
 */
export function normalizeBounds(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}
