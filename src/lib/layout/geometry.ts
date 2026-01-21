/**
 * Geometry utilities for layout generation
 * Handles coordinate projections and geometric calculations
 */

export interface LocalCoord {
  x: number; // meters east of origin
  y: number; // meters north of origin
}

export interface GeoCoord {
  lat: number;
  lng: number;
}

/**
 * Create a local projection centered on a point
 * Converts between lat/lng and local meter coordinates
 */
export function createLocalProjection(centroid: GeoCoord) {
  const metersPerDegreeLat = 111139;
  const metersPerDegreeLng = 111139 * Math.cos((centroid.lat * Math.PI) / 180);

  return {
    /**
     * Convert lat/lng to local meters
     */
    toLocal(coord: GeoCoord): LocalCoord {
      return {
        x: (coord.lng - centroid.lng) * metersPerDegreeLng,
        y: (coord.lat - centroid.lat) * metersPerDegreeLat,
      };
    },

    /**
     * Convert local meters to lat/lng
     */
    toGlobal(local: LocalCoord): GeoCoord {
      return {
        lng: centroid.lng + local.x / metersPerDegreeLng,
        lat: centroid.lat + local.y / metersPerDegreeLat,
      };
    },

    /**
     * Get scale factors for reference
     */
    getScale() {
      return { metersPerDegreeLat, metersPerDegreeLng };
    },
  };
}

/**
 * Calculate distance between two local coordinates
 */
export function localDistance(a: LocalCoord, b: LocalCoord): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Interpolate along a line between two points
 * @param start Start coordinate
 * @param end End coordinate
 * @param t Interpolation factor (0-1)
 */
export function interpolateLocal(
  start: LocalCoord,
  end: LocalCoord,
  t: number
): LocalCoord {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

/**
 * Rotate a point around origin by angle (in degrees)
 */
export function rotatePoint(point: LocalCoord, angleDegrees: number): LocalCoord {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

/**
 * Calculate the bounding box of local coordinates
 */
export function getBoundingBox(coords: LocalCoord[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (coords.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const coord of coords) {
    if (coord.x < minX) minX = coord.x;
    if (coord.x > maxX) maxX = coord.x;
    if (coord.y < minY) minY = coord.y;
    if (coord.y > maxY) maxY = coord.y;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Check if a point is inside a polygon using ray casting
 */
export function pointInPolygon(point: LocalCoord, polygon: LocalCoord[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Shrink a polygon inward by a distance (simple offset)
 * Note: This is a simplified version - for complex polygons, use Turf.js buffer
 */
export function shrinkPolygon(
  polygon: LocalCoord[],
  distance: number
): LocalCoord[] {
  if (polygon.length < 3 || distance <= 0) return polygon;

  const result: LocalCoord[] = [];
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const prev = polygon[(i - 1 + n) % n];
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];

    // Calculate edge vectors
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    // Normalize
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (len1 === 0 || len2 === 0) {
      result.push(curr);
      continue;
    }

    const n1 = { x: v1.x / len1, y: v1.y / len1 };
    const n2 = { x: v2.x / len2, y: v2.y / len2 };

    // Calculate inward normals (perpendicular, pointing inward for CCW polygon)
    const inward1 = { x: n1.y, y: -n1.x };
    const inward2 = { x: n2.y, y: -n2.x };

    // Average the inward directions
    const avgInward = {
      x: (inward1.x + inward2.x) / 2,
      y: (inward1.y + inward2.y) / 2,
    };
    const avgLen = Math.sqrt(avgInward.x * avgInward.x + avgInward.y * avgInward.y);

    if (avgLen === 0) {
      result.push(curr);
      continue;
    }

    // Offset the point
    result.push({
      x: curr.x + (avgInward.x / avgLen) * distance,
      y: curr.y + (avgInward.y / avgLen) * distance,
    });
  }

  return result;
}

/**
 * Calculate the area of a polygon using the shoelace formula
 */
export function polygonArea(polygon: LocalCoord[]): number {
  if (polygon.length < 3) return 0;

  let area = 0;
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Find intersection of a line segment with a polygon
 * Returns the clipped segment inside the polygon, or null if no intersection
 */
export function clipLineToPolygon(
  lineStart: LocalCoord,
  lineEnd: LocalCoord,
  polygon: LocalCoord[]
): { start: LocalCoord; end: LocalCoord } | null {
  // Find all intersection points with polygon edges
  const intersections: { point: LocalCoord; t: number }[] = [];
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];

    const intersection = lineIntersection(lineStart, lineEnd, p1, p2);
    if (intersection) {
      intersections.push(intersection);
    }
  }

  // Check if endpoints are inside
  const startInside = pointInPolygon(lineStart, polygon);
  const endInside = pointInPolygon(lineEnd, polygon);

  if (startInside && endInside) {
    // Entire line is inside
    return { start: lineStart, end: lineEnd };
  }

  if (intersections.length < 2 && !startInside && !endInside) {
    // Line is entirely outside
    return null;
  }

  // Sort intersections by t value
  intersections.sort((a, b) => a.t - b.t);

  if (startInside) {
    // Start inside, find first exit
    return { start: lineStart, end: intersections[0].point };
  }

  if (endInside) {
    // End inside, find last entry
    return {
      start: intersections[intersections.length - 1].point,
      end: lineEnd,
    };
  }

  // Both outside - return segment between first entry and last exit
  if (intersections.length >= 2) {
    return {
      start: intersections[0].point,
      end: intersections[intersections.length - 1].point,
    };
  }

  return null;
}

/**
 * Find intersection of two line segments
 * Returns intersection point and t value (position along first segment)
 */
function lineIntersection(
  a1: LocalCoord,
  a2: LocalCoord,
  b1: LocalCoord,
  b2: LocalCoord
): { point: LocalCoord; t: number } | null {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;

  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return null; // Parallel

  const dx = b1.x - a1.x;
  const dy = b1.y - a1.y;

  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  // Check if intersection is within both segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      point: {
        x: a1.x + t * d1x,
        y: a1.y + t * d1y,
      },
      t,
    };
  }

  return null;
}

/**
 * Calculate the four corners of a frame given center position and dimensions
 * @param center Center position of frame
 * @param width Frame width in meters
 * @param height Frame height in meters
 * @param rotationDeg Rotation angle in degrees
 */
export function calculateFrameCorners(
  center: LocalCoord,
  width: number,
  height: number,
  rotationDeg: number
): LocalCoord[] {
  // Half dimensions
  const hw = width / 2;
  const hh = height / 2;

  // Unrotated corners (relative to center)
  const corners: LocalCoord[] = [
    { x: -hw, y: -hh }, // bottom-left
    { x: hw, y: -hh },  // bottom-right
    { x: hw, y: hh },   // top-right
    { x: -hw, y: hh },  // top-left
  ];

  // Rotate and translate each corner
  return corners.map((corner) => {
    const rotated = rotatePoint(corner, rotationDeg);
    return {
      x: center.x + rotated.x,
      y: center.y + rotated.y,
    };
  });
}

/**
 * Check if a frame is fully contained within the boundary polygon
 * and does not overlap with any exclusion zones.
 *
 * For boundary: frame must be completely inside (all corners + no edge crossings)
 * For exclusions: frame must not overlap at all (no intersection)
 */
export function frameFullyContained(
  frameCorners: LocalCoord[],
  boundary: LocalCoord[],
  exclusions: LocalCoord[][]
): boolean {
  // 1. All frame corners must be inside boundary
  for (const corner of frameCorners) {
    if (!pointInPolygon(corner, boundary)) {
      return false;
    }
  }

  // 2. Frame edges must not cross boundary edges
  if (polygonsIntersect(frameCorners, boundary)) {
    return false;
  }

  // 3. Frame must not overlap with any exclusion zone
  for (const exclusion of exclusions) {
    if (polygonsOverlap(frameCorners, exclusion)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if two polygons have intersecting edges
 */
function polygonsIntersect(poly1: LocalCoord[], poly2: LocalCoord[]): boolean {
  const n1 = poly1.length;
  const n2 = poly2.length;

  for (let i = 0; i < n1; i++) {
    const a1 = poly1[i];
    const a2 = poly1[(i + 1) % n1];

    for (let j = 0; j < n2; j++) {
      const b1 = poly2[j];
      const b2 = poly2[(j + 1) % n2];

      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 */
function segmentsIntersect(
  a1: LocalCoord,
  a2: LocalCoord,
  b1: LocalCoord,
  b2: LocalCoord
): boolean {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;

  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false; // Parallel

  const dx = b1.x - a1.x;
  const dy = b1.y - a1.y;

  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  // Check if intersection is within both segments (exclusive of endpoints to avoid corner touches)
  return t > 1e-10 && t < 1 - 1e-10 && u > 1e-10 && u < 1 - 1e-10;
}

/**
 * Check if two polygons overlap (intersect or one contains the other)
 */
function polygonsOverlap(poly1: LocalCoord[], poly2: LocalCoord[]): boolean {
  // Check if edges intersect
  if (polygonsIntersect(poly1, poly2)) {
    return true;
  }

  // Check if any corner of poly1 is inside poly2
  for (const corner of poly1) {
    if (pointInPolygon(corner, poly2)) {
      return true;
    }
  }

  // Check if any corner of poly2 is inside poly1
  for (const corner of poly2) {
    if (pointInPolygon(corner, poly1)) {
      return true;
    }
  }

  return false;
}

/**
 * Rotate a point around an arbitrary center point
 */
export function rotatePointAround(
  point: LocalCoord,
  center: LocalCoord,
  angleDegrees: number
): LocalCoord {
  const relative = { x: point.x - center.x, y: point.y - center.y };
  const rotated = rotatePoint(relative, angleDegrees);
  return {
    x: center.x + rotated.x,
    y: center.y + rotated.y,
  };
}
