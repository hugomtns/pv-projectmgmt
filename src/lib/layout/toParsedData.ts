/**
 * Convert GeneratedLayout to DXFParsedData format for 3D rendering
 */

import type { GeneratedLayout } from '@/lib/types/layout';
import type { DXFParsedData, PanelGeometry, BoundingBox } from '@/lib/dxf/types';
import type { Site } from '@/lib/types/site';
import { createLocalProjection } from './geometry';

/**
 * Convert a generated layout to DXF parsed data format for 3D rendering
 */
export function generatedLayoutToParsedData(
  layout: GeneratedLayout,
  site: Site
): DXFParsedData {
  const panels: PanelGeometry[] = [];

  // Get site centroid for projection
  const centroid = site.centroid;
  if (!centroid) {
    throw new Error('Site must have a centroid for 3D rendering');
  }

  const projection = createLocalProjection({
    lat: centroid.latitude,
    lng: centroid.longitude,
  });

  // Module dimensions in meters
  const moduleLengthM = layout.module.lengthMm / 1000;
  const moduleWidthM = layout.module.widthMm / 1000;

  // Tilt angle
  const tiltAngle = layout.parameters.tiltAngle;

  // Track bounds
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  const minZ = 0, maxZ = 0;

  let panelIndex = 0;

  // Generate panels from frames
  if (layout.frames && layout.frames.length > 0) {
    // New frame-based approach
    layout.frames.forEach((frame) => {
      // Convert frame center to local coordinates
      const centerLocal = projection.toLocal({
        lat: frame.centerCoord.lat,
        lng: frame.centerCoord.lng,
      });

      // Frame rotation in radians
      const rotationRad = (frame.rotationDeg * Math.PI) / 180;

      // Create a panel geometry for this frame (represents the entire table)
      const x = centerLocal.x;
      const y = centerLocal.y;
      const z = 0;

      // Update bounds
      const halfWidth = frame.widthM / 2;
      const halfHeight = frame.heightM / 2;
      if (x - halfWidth < minX) minX = x - halfWidth;
      if (x + halfWidth > maxX) maxX = x + halfWidth;
      if (y - halfHeight < minY) minY = y - halfHeight;
      if (y + halfHeight > maxY) maxY = y + halfHeight;

      panels.push({
        id: `gen-frame-${panelIndex}`,
        position: [x, y, z],
        rotation: rotationRad,
        scale: [1, 1, 1],
        blockName: 'GeneratedFrame',
        layer: 'PANELS',
        tiltAngle,
        tableWidth: frame.widthM,
        tableHeight: frame.heightM,
        moduleRows: frame.frameRows,
        moduleColumns: frame.frameColumns,
        mountingHeight: 0.5, // Default mounting height
        moduleWidth: moduleLengthM,
        moduleHeight: moduleWidthM,
      });

      panelIndex++;
    });
  } else if (layout.rows && layout.rows.length > 0) {
    // Legacy row-based approach for backward compatibility
    layout.rows.forEach((row) => {
      // Convert row start/end to local coordinates
      const startLocal = projection.toLocal({
        lat: row.startCoord.lat,
        lng: row.startCoord.lng,
      });
      const endLocal = projection.toLocal({
        lat: row.endCoord.lat,
        lng: row.endCoord.lng,
      });

      // Direction along the row
      const dx = endLocal.x - startLocal.x;
      const dy = endLocal.y - startLocal.y;
      const rowLength = Math.sqrt(dx * dx + dy * dy);

      if (rowLength === 0) return;

      // Normalized direction
      const dirX = dx / rowLength;
      const dirY = dy / rowLength;

      // Place panels along the row
      for (let i = 0; i < row.panelCount; i++) {
        // Position along the row (center of each panel)
        const t = (i + 0.5) / row.panelCount;
        const x = startLocal.x + dx * t;
        const y = startLocal.y + dy * t;
        const z = 0; // Ground level

        // Update bounds
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Calculate rotation from row direction
        const rowRotation = Math.atan2(dirY, dirX);

        panels.push({
          id: `gen-panel-${panelIndex}`,
          position: [x, y, z],
          rotation: rowRotation,
          scale: [1, 1, 1],
          blockName: 'GeneratedPanel',
          layer: 'PANELS',
          tiltAngle,
          tableWidth: moduleLengthM,
          tableHeight: moduleWidthM,
          moduleRows: 1,
          moduleColumns: 1,
          mountingHeight: 0.5, // Default mounting height
          moduleWidth: moduleLengthM,
          moduleHeight: moduleWidthM,
        });

        panelIndex++;
      }
    });
  }

  // Add some padding to bounds
  const padding = 50; // meters
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const bounds: BoundingBox = {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [(minX + maxX) / 2, (minY + maxY) / 2, 0],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
  };

  return {
    panels,
    mounting: [],
    electrical: [],
    boundaries: [],
    trees: [],
    bounds,
    layers: [
      {
        name: 'PANELS',
        entityCount: panels.length,
        classification: 'panels',
        visible: true,
      },
    ],
    units: 'meters',
    geoData: {
      latitude: centroid.latitude,
      longitude: centroid.longitude,
    },
  };
}
