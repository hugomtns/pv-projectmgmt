/**
 * Panel Layout Generator
 * Auto-fills a usable area with panel frames based on parameters
 * Uses frame-based placement with corridor support
 */

import type { Site } from '@/lib/types/site';
import type {
  ModuleInput,
  LayoutParameters,
  PanelRow,
  FramePlacement,
  GeneratedLayout,
} from '@/lib/types/layout';
import {
  createLocalProjection,
  getBoundingBox,
  polygonArea,
  shrinkPolygon,
  calculateFrameCorners,
  frameFullyContained,
  type LocalCoord,
} from './geometry';

/**
 * Generate a panel layout for a site using frame-based placement
 * Iterates over ALL boundaries in the site and generates frames for each
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

  // Create projection centered on site centroid
  const projection = createLocalProjection({
    lat: site.centroid.latitude,
    lng: site.centroid.longitude,
  });

  // Convert exclusion zones to local coordinates (shared across all boundaries)
  const localExclusions: LocalCoord[][] = site.exclusionZones.map((zone) =>
    zone.coordinates.map((c) => projection.toLocal({ lat: c.lat, lng: c.lng }))
  );

  // Calculate module dimensions in meters
  const moduleLengthM = module.lengthMm / 1000;
  const moduleWidthM = module.widthMm / 1000;

  // Calculate frame dimensions
  const frameWidth =
    parameters.frameColumns * moduleLengthM +
    (parameters.frameColumns - 1) * parameters.moduleGapM;

  // Apply tilt to frame height
  const tiltRad = (parameters.tiltAngle * Math.PI) / 180;
  const frameHeightPhysical =
    parameters.frameRows * moduleWidthM +
    (parameters.frameRows - 1) * parameters.moduleGapM;
  const effectiveFrameHeight = frameHeightPhysical * Math.cos(tiltRad);

  // Calculate rotation from azimuth
  // Azimuth 180 (south) = rows run east-west = 0° rotation
  const rotationDeg = parameters.azimuth - 180;

  // Generate frames for ALL boundaries
  const allFrames: FramePlacement[] = [];
  let totalCoveredAreaSqm = 0;
  let globalFrameIndex = 0;

  for (const boundary of site.boundaries) {
    // Convert boundary to local coordinates
    let localBoundary: LocalCoord[] = boundary.coordinates.map((c) =>
      projection.toLocal({ lat: c.lat, lng: c.lng })
    );

    // Apply boundary setback (shrink polygon inward)
    if (parameters.boundarySetbackM > 0) {
      localBoundary = shrinkPolygon(localBoundary, parameters.boundarySetbackM);
    }

    // Skip if boundary becomes degenerate after setback
    const boundaryArea = polygonArea(localBoundary);
    if (boundaryArea < 1) continue;

    totalCoveredAreaSqm += boundaryArea;

    // Generate frames for this boundary
    const boundaryFrames = generateFrameGrid(
      localBoundary,
      localExclusions,
      frameWidth,
      effectiveFrameHeight,
      parameters,
      rotationDeg,
      projection,
      globalFrameIndex
    );

    // Add frames with updated global indices
    allFrames.push(...boundaryFrames);
    globalFrameIndex += boundaryFrames.length;
  }

  // Calculate summary statistics
  const modulesPerFrame = parameters.frameRows * parameters.frameColumns;
  const totalPanels = allFrames.length * modulesPerFrame;
  const dcCapacityKw = (totalPanels * module.wattage) / 1000;
  const moduleAreaSqm = totalPanels * moduleLengthM * moduleWidthM;
  const actualGcr = totalCoveredAreaSqm > 0 ? moduleAreaSqm / totalCoveredAreaSqm : 0;

  // Count distinct row indices
  const rowIndices = new Set(allFrames.map((f) => f.rowIndex));
  const totalRows = rowIndices.size;

  // Create legacy PanelRow format for backward compatibility
  const rows = framesToLegacyRows(allFrames, modulesPerFrame);

  return {
    siteId: site.id,
    module,
    parameters,
    frames: allFrames,
    rows,
    summary: {
      totalPanels,
      totalFrames: allFrames.length,
      totalRows,
      dcCapacityKw,
      dcCapacityMw: dcCapacityKw / 1000,
      actualGcr,
      coveredAreaSqm: totalCoveredAreaSqm,
      moduleAreaSqm,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate frame grid positions within the boundary
 * @param startIndex - Starting frame index for global numbering across boundaries
 */
function generateFrameGrid(
  boundary: LocalCoord[],
  exclusions: LocalCoord[][],
  frameWidth: number,
  frameHeight: number,
  parameters: LayoutParameters,
  rotationDeg: number,
  projection: ReturnType<typeof createLocalProjection>,
  startIndex: number = 0
): FramePlacement[] {
  const frames: FramePlacement[] = [];

  // Get bounding box of the boundary
  const bbox = getBoundingBox(boundary);

  // Calculate grid parameters
  // We need to account for rotation when determining the grid extent
  const diagonalLength = Math.sqrt(
    bbox.width * bbox.width + bbox.height * bbox.height
  );

  // Direction vectors for the grid (along rows and perpendicular)
  const rowAngleRad = (rotationDeg * Math.PI) / 180;
  const rowDir = {
    x: Math.cos(rowAngleRad),
    y: Math.sin(rowAngleRad),
  };
  const perpDir = {
    x: -rowDir.y,
    y: rowDir.x,
  };

  // Center of bounding box
  const center = {
    x: (bbox.minX + bbox.maxX) / 2,
    y: (bbox.minY + bbox.maxY) / 2,
  };

  // Calculate how many rows/columns we might need
  const maxRowsEstimate = Math.ceil(diagonalLength / frameHeight) + 2;
  const maxColsEstimate = Math.ceil(diagonalLength / frameWidth) + 2;

  let frameIndex = startIndex;

  // Iterate through potential row positions
  for (let ri = 0; ri < maxRowsEstimate; ri++) {
    // Calculate Y offset including corridors
    let yOffset = 0;
    for (let r = 0; r < ri; r++) {
      // Add frame height
      yOffset += frameHeight;
      // Add gap after this frame (corridor or regular)
      // Corridor is added after every N frames, i.e., after positions N-1, 2N-1, 3N-1...
      if (
        parameters.corridorEveryNFramesY > 0 &&
        (r + 1) % parameters.corridorEveryNFramesY === 0
      ) {
        yOffset += parameters.corridorWidth;
      } else {
        yOffset += parameters.frameGapY;
      }
    }

    // Center offset: start from negative half of total height
    const startOffset = -((maxRowsEstimate - 1) / 2) * (frameHeight + parameters.frameGapY);
    const rowCenterOffset = startOffset + yOffset;

    // Iterate through potential column positions in this row
    for (let ci = 0; ci < maxColsEstimate; ci++) {
      // Calculate X offset including corridors
      let xOffset = 0;
      for (let c = 0; c < ci; c++) {
        // Add frame width
        xOffset += frameWidth;
        // Add gap after this frame (corridor or regular)
        // Corridor is added after every N frames, i.e., after positions N-1, 2N-1, 3N-1...
        if (
          parameters.corridorEveryNFramesX > 0 &&
          (c + 1) % parameters.corridorEveryNFramesX === 0
        ) {
          xOffset += parameters.corridorWidth;
        } else {
          xOffset += parameters.frameGapX;
        }
      }

      // Center offset: start from negative half of total width
      const colStartOffset = -((maxColsEstimate - 1) / 2) * (frameWidth + parameters.frameGapX);
      const colCenterOffset = colStartOffset + xOffset;

      // Calculate frame center position
      const frameCenter: LocalCoord = {
        x: center.x + rowDir.x * colCenterOffset + perpDir.x * rowCenterOffset,
        y: center.y + rowDir.y * colCenterOffset + perpDir.y * rowCenterOffset,
      };

      // Calculate frame corners
      const corners = calculateFrameCorners(
        frameCenter,
        frameWidth,
        frameHeight,
        rotationDeg
      );

      // Check if frame is fully contained
      if (frameFullyContained(corners, boundary, exclusions)) {
        // Convert center to global coordinates
        const centerGlobal = projection.toGlobal(frameCenter);

        frames.push({
          index: frameIndex,
          rowIndex: ri,
          colIndex: ci,
          frameRows: parameters.frameRows,
          frameColumns: parameters.frameColumns,
          centerCoord: {
            lat: centerGlobal.lat,
            lng: centerGlobal.lng,
          },
          widthM: frameWidth,
          heightM: frameHeight,
          rotationDeg,
        });

        frameIndex++;
      }
    }
  }

  return frames;
}

/**
 * Convert frame placements to legacy PanelRow format for backward compatibility
 */
function framesToLegacyRows(
  frames: FramePlacement[],
  modulesPerFrame: number
): PanelRow[] {
  // Group frames by rowIndex
  const rowGroups = new Map<number, FramePlacement[]>();
  for (const frame of frames) {
    const existing = rowGroups.get(frame.rowIndex);
    if (existing) {
      existing.push(frame);
    } else {
      rowGroups.set(frame.rowIndex, [frame]);
    }
  }

  const rows: PanelRow[] = [];
  let rowIndex = 0;

  for (const [, framesInRow] of rowGroups) {
    if (framesInRow.length === 0) continue;

    // Sort frames by colIndex
    framesInRow.sort((a, b) => a.colIndex - b.colIndex);

    // Use first and last frame to determine row extent
    const firstFrame = framesInRow[0];
    const lastFrame = framesInRow[framesInRow.length - 1];

    rows.push({
      index: rowIndex,
      panelCount: framesInRow.length * modulesPerFrame,
      startCoord: firstFrame.centerCoord,
      endCoord: lastFrame.centerCoord,
      lengthM: 0, // Would need to calculate properly
    });

    rowIndex++;
  }

  return rows;
}

/**
 * Quick estimate of panel count without full layout generation
 * Useful for live preview in UI
 */
export function estimatePanelCount(
  usableAreaSqm: number,
  module: ModuleInput,
  parameters: LayoutParameters
): {
  panelCount: number;
  frameCount: number;
  dcCapacityKw: number;
  dcCapacityMw: number;
} {
  const moduleLengthM = module.lengthMm / 1000;
  const moduleWidthM = module.widthMm / 1000;

  // Calculate frame dimensions
  const frameWidth =
    parameters.frameColumns * moduleLengthM +
    (parameters.frameColumns - 1) * parameters.moduleGapM;

  const tiltRad = (parameters.tiltAngle * Math.PI) / 180;
  const frameHeightPhysical =
    parameters.frameRows * moduleWidthM +
    (parameters.frameRows - 1) * parameters.moduleGapM;
  const effectiveFrameHeight = frameHeightPhysical * Math.cos(tiltRad);

  // Calculate effective frame footprint including average spacing
  const avgGapX = parameters.corridorEveryNFramesX > 0
    ? (parameters.frameGapX * (parameters.corridorEveryNFramesX - 1) + parameters.corridorWidth) / parameters.corridorEveryNFramesX
    : parameters.frameGapX;
  const avgGapY = parameters.corridorEveryNFramesY > 0
    ? (parameters.frameGapY * (parameters.corridorEveryNFramesY - 1) + parameters.corridorWidth) / parameters.corridorEveryNFramesY
    : parameters.frameGapY;

  const effectiveFrameAreaWithSpacing = (frameWidth + avgGapX) * (effectiveFrameHeight + avgGapY);

  // Estimate number of frames (with ~70% packing efficiency for irregular shapes)
  const packingEfficiency = 0.7;
  const frameCount = Math.floor((usableAreaSqm * packingEfficiency) / effectiveFrameAreaWithSpacing);

  const modulesPerFrame = parameters.frameRows * parameters.frameColumns;
  const panelCount = frameCount * modulesPerFrame;
  const dcCapacityKw = (panelCount * module.wattage) / 1000;

  return {
    panelCount,
    frameCount,
    dcCapacityKw,
    dcCapacityMw: dcCapacityKw / 1000,
  };
}

/**
 * Estimate with legacy GCR parameter (for backward compatibility)
 */
export function estimatePanelCountLegacy(
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
