/**
 * Panel Layout Generator
 * Auto-fills a usable area with panel rows based on parameters
 */

import type { Site } from '@/lib/types/site';
import type {
  ModuleInput,
  LayoutParameters,
  PanelRow,
  GeneratedLayout,
} from '@/lib/types/layout';
import {
  createLocalProjection,
  getBoundingBox,
  clipLineToPolygon,
  localDistance,
  polygonArea,
  shrinkPolygon,
  type LocalCoord,
} from './geometry';

/**
 * Generate a panel layout for a site
 */
export function generatePanelLayout(
  site: Site,
  module: ModuleInput,
  parameters: LayoutParameters
): GeneratedLayout {
  // Validate inputs
  if (!site.centroid) {
    throw new Error('Site must have a centroid for layout generation');
  }

  if (site.boundaries.length === 0) {
    throw new Error('Site must have at least one boundary');
  }

  // Get usable area polygon (use first boundary for now)
  // In future, could union multiple boundaries
  const boundary = site.boundaries[0];
  const boundaryCoords = boundary.coordinates;

  // Create projection centered on site centroid
  const projection = createLocalProjection({
    lat: site.centroid.latitude,
    lng: site.centroid.longitude,
  });

  // Convert boundary to local coordinates
  let localBoundary: LocalCoord[] = boundaryCoords.map((c) =>
    projection.toLocal({ lat: c.lat, lng: c.lng })
  );

  // Apply boundary setback (shrink polygon inward)
  if (parameters.boundarySetbackM > 0) {
    localBoundary = shrinkPolygon(localBoundary, parameters.boundarySetbackM);
  }

  // Convert exclusion zones to local coordinates
  const localExclusions: LocalCoord[][] = site.exclusionZones.map((zone) =>
    zone.coordinates.map((c) => projection.toLocal({ lat: c.lat, lng: c.lng }))
  );

  // Calculate module dimensions in meters
  const moduleLengthM = module.lengthMm / 1000;
  const moduleWidthM = module.widthMm / 1000;

  // Calculate row pitch based on GCR
  // GCR = module_width / pitch (simplified for flat terrain)
  // For tilted panels: effective_width = width * cos(tilt)
  const tiltRad = (parameters.tiltAngle * Math.PI) / 180;
  const effectiveModuleWidth = moduleWidthM * Math.cos(tiltRad);
  const rowPitch = effectiveModuleWidth / parameters.gcr;

  // Ensure minimum row gap
  const actualRowPitch = Math.max(rowPitch, effectiveModuleWidth + parameters.rowGapM);

  // Generate panel rows
  const rows = generateRows(
    localBoundary,
    localExclusions,
    moduleLengthM,
    actualRowPitch,
    parameters.azimuth,
    projection
  );

  // Calculate summary statistics
  const totalPanels = rows.reduce((sum, r) => sum + r.panelCount, 0);
  const dcCapacityKw = (totalPanels * module.wattage) / 1000;
  const coveredAreaSqm = polygonArea(localBoundary);
  const moduleAreaSqm = totalPanels * moduleLengthM * moduleWidthM;
  const actualGcr = coveredAreaSqm > 0 ? moduleAreaSqm / coveredAreaSqm : 0;

  return {
    siteId: site.id,
    module,
    parameters,
    rows,
    summary: {
      totalPanels,
      totalRows: rows.length,
      dcCapacityKw,
      dcCapacityMw: dcCapacityKw / 1000,
      actualGcr,
      coveredAreaSqm,
      moduleAreaSqm,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate rows of panels within the boundary
 */
function generateRows(
  boundary: LocalCoord[],
  exclusions: LocalCoord[][],
  moduleLengthM: number,
  rowPitch: number,
  azimuth: number,
  projection: ReturnType<typeof createLocalProjection>
): PanelRow[] {
  const rows: PanelRow[] = [];

  // Get bounding box
  const bbox = getBoundingBox(boundary);

  // Calculate row direction based on azimuth
  // Azimuth 180 (south-facing) means rows run east-west
  // Row direction is perpendicular to panel facing direction
  const rowAngle = azimuth + 90; // Rows perpendicular to azimuth
  const rowAngleRad = (rowAngle * Math.PI) / 180;

  // Direction vector for rows
  const rowDir = {
    x: Math.cos(rowAngleRad),
    y: Math.sin(rowAngleRad),
  };

  // Direction perpendicular to rows (for spacing)
  const perpDir = {
    x: -rowDir.y,
    y: rowDir.x,
  };

  // Calculate how many rows we can fit
  const diagonalLength = Math.sqrt(
    bbox.width * bbox.width + bbox.height * bbox.height
  );
  const numRows = Math.ceil(diagonalLength / rowPitch) + 2;

  // Center point of bounding box
  const center = {
    x: (bbox.minX + bbox.maxX) / 2,
    y: (bbox.minY + bbox.maxY) / 2,
  };

  // Generate rows centered on the bounding box
  const startOffset = -((numRows - 1) / 2) * rowPitch;

  for (let i = 0; i < numRows; i++) {
    const offset = startOffset + i * rowPitch;

    // Row center point
    const rowCenter = {
      x: center.x + perpDir.x * offset,
      y: center.y + perpDir.y * offset,
    };

    // Create row line extending across the entire bbox
    const halfLength = diagonalLength;
    const lineStart = {
      x: rowCenter.x - rowDir.x * halfLength,
      y: rowCenter.y - rowDir.y * halfLength,
    };
    const lineEnd = {
      x: rowCenter.x + rowDir.x * halfLength,
      y: rowCenter.y + rowDir.y * halfLength,
    };

    // Clip row to boundary
    const clipped = clipLineToPolygon(lineStart, lineEnd, boundary);
    if (!clipped) continue;

    // Further clip to exclude exclusion zones
    const segments = subtractExclusions(clipped.start, clipped.end, exclusions);

    // Create panel rows from remaining segments
    for (const segment of segments) {
      const segmentLength = localDistance(segment.start, segment.end);
      const panelCount = Math.floor(segmentLength / moduleLengthM);

      if (panelCount > 0) {
        // Convert back to global coordinates
        const startGlobal = projection.toGlobal(segment.start);
        const endGlobal = projection.toGlobal(segment.end);

        rows.push({
          index: rows.length,
          panelCount,
          startCoord: { lat: startGlobal.lat, lng: startGlobal.lng },
          endCoord: { lat: endGlobal.lat, lng: endGlobal.lng },
          lengthM: segmentLength,
        });
      }
    }
  }

  return rows;
}

/**
 * Subtract exclusion zones from a line segment
 * Returns array of remaining segments
 */
function subtractExclusions(
  start: LocalCoord,
  end: LocalCoord,
  exclusions: LocalCoord[][]
): { start: LocalCoord; end: LocalCoord }[] {
  let segments = [{ start, end }];

  for (const exclusion of exclusions) {
    const newSegments: { start: LocalCoord; end: LocalCoord }[] = [];

    for (const segment of segments) {
      const subtracted = subtractPolygonFromSegment(
        segment.start,
        segment.end,
        exclusion
      );
      newSegments.push(...subtracted);
    }

    segments = newSegments;
  }

  return segments;
}

/**
 * Subtract a polygon from a line segment
 * Returns segments that are outside the polygon
 */
function subtractPolygonFromSegment(
  start: LocalCoord,
  end: LocalCoord,
  polygon: LocalCoord[]
): { start: LocalCoord; end: LocalCoord }[] {
  // Find all intersections with polygon edges
  const intersections: { point: LocalCoord; t: number }[] = [];
  const n = polygon.length;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lineLength = Math.sqrt(dx * dx + dy * dy);

  if (lineLength === 0) return [];

  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];

    const intersection = segmentIntersection(start, end, p1, p2);
    if (intersection) {
      intersections.push(intersection);
    }
  }

  // Sort by t value
  intersections.sort((a, b) => a.t - b.t);

  // Check if start is inside polygon
  const startInside = pointInPolygonLocal(start, polygon);

  // Build result segments
  const result: { start: LocalCoord; end: LocalCoord }[] = [];
  let currentStart = start;
  let inside = startInside;

  for (const { point } of intersections) {
    if (!inside) {
      // We're outside, this intersection enters the polygon
      result.push({ start: currentStart, end: point });
    }
    currentStart = point;
    inside = !inside;
  }

  // Handle final segment
  if (!inside) {
    result.push({ start: currentStart, end });
  }

  return result;
}

/**
 * Check if point is inside polygon
 */
function pointInPolygonLocal(point: LocalCoord, polygon: LocalCoord[]): boolean {
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
 * Find intersection of two line segments
 */
function segmentIntersection(
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
  if (Math.abs(cross) < 1e-10) return null;

  const dx = b1.x - a1.x;
  const dy = b1.y - a1.y;

  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

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
 * Quick estimate of panel count without full layout generation
 * Useful for live preview in UI
 */
export function estimatePanelCount(
  usableAreaSqm: number,
  module: ModuleInput,
  gcr: number
): { panelCount: number; dcCapacityKw: number; dcCapacityMw: number } {
  const moduleLengthM = module.lengthMm / 1000;
  const moduleWidthM = module.widthMm / 1000;
  const moduleAreaSqm = moduleLengthM * moduleWidthM;

  // Panel area = usable area × GCR
  const totalPanelArea = usableAreaSqm * gcr;
  const panelCount = Math.floor(totalPanelArea / moduleAreaSqm);
  const dcCapacityKw = (panelCount * module.wattage) / 1000;

  return {
    panelCount,
    dcCapacityKw,
    dcCapacityMw: dcCapacityKw / 1000,
  };
}
