/**
 * PanelHeatmap - Shows performance-based color overlay on panel zones
 *
 * Renders semi-transparent color overlays above panel groups to indicate
 * relative performance. Green = good performance, Yellow = moderate, Red = poor.
 */

import { useMemo } from 'react';
import { Color, DoubleSide } from 'three';
import type { PanelGeometry } from '@/lib/dxf/types';
import type { PanelZonePerformance } from '@/lib/digitaltwin/types';

interface PanelHeatmapProps {
  panels: PanelGeometry[];
  panelZones: PanelZonePerformance[] | undefined;
  enabled?: boolean;
}

// Default panel table dimensions
const DEFAULT_TABLE_WIDTH = 16.0;
const DEFAULT_TABLE_HEIGHT = 4.5;
const DEFAULT_TILT_ANGLE = 20;
const HEATMAP_HEIGHT_OFFSET = 0.15; // Offset above panels to prevent z-fighting

/**
 * Get color based on performance index
 * 1.0 = green (excellent), 0.7 = yellow (moderate), 0.5 = red (poor)
 */
function getPerformanceColor(performanceIndex: number): Color {
  // Clamp to 0-1 range
  const normalized = Math.max(0, Math.min(1, performanceIndex));

  // HSL color mapping: green (120°) -> yellow (60°) -> red (0°)
  // Performance 1.0 = 120° (green), Performance 0.5 = 0° (red)
  const hue = normalized * 0.33; // 0.33 = 120°/360°

  const color = new Color();
  color.setHSL(hue, 0.8, 0.5);
  return color;
}

export function PanelHeatmap({
  panels,
  panelZones,
  enabled = true,
}: PanelHeatmapProps) {
  // Group panels into zones based on panelZones data
  const zoneOverlays = useMemo(() => {
    if (!enabled || !panelZones || panelZones.length === 0 || panels.length === 0) {
      return [];
    }

    return panelZones.map((zone) => {
      // Get panels in this zone
      const zonePanels = zone.panelIndices
        .map((i) => panels[i])
        .filter((p) => p !== undefined);

      if (zonePanels.length === 0) return null;

      // Calculate bounding box for zone
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      let avgY = 0;

      zonePanels.forEach((panel) => {
        const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
        const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
        const tiltAngle = panel.tiltAngle || DEFAULT_TILT_ANGLE;
        const mountingHeight = panel.mountingHeight || panel.position[2] || 0.8;
        const tiltRad = (tiltAngle * Math.PI) / 180;
        const azimuth = panel.rotation;

        // Calculate table center (same logic as PanelInstances)
        const centerHeight = mountingHeight + (tableHeight / 2) * Math.sin(tiltRad);
        const halfWidth = tableWidth / 2;
        const halfDepth = (tableHeight / 2) * Math.cos(tiltRad);
        const offsetX = halfWidth * Math.cos(azimuth) + halfDepth * Math.sin(azimuth);
        const offsetY = halfWidth * Math.sin(azimuth) - halfDepth * Math.cos(azimuth);

        const tableCenterX = panel.position[0] + offsetX;
        const tableCenterZ = -(panel.position[1] + offsetY);

        // Expand bounds with table dimensions
        const corners = [
          { x: -halfWidth, z: -halfDepth * Math.cos(tiltRad) },
          { x: halfWidth, z: -halfDepth * Math.cos(tiltRad) },
          { x: -halfWidth, z: halfDepth * Math.cos(tiltRad) },
          { x: halfWidth, z: halfDepth * Math.cos(tiltRad) },
        ];

        corners.forEach((corner) => {
          const worldX =
            tableCenterX + corner.x * Math.cos(azimuth) - corner.z * Math.sin(azimuth);
          const worldZ =
            tableCenterZ + corner.x * Math.sin(azimuth) + corner.z * Math.cos(azimuth);

          minX = Math.min(minX, worldX);
          maxX = Math.max(maxX, worldX);
          minZ = Math.min(minZ, worldZ);
          maxZ = Math.max(maxZ, worldZ);
        });

        avgY += centerHeight;
      });

      avgY /= zonePanels.length;

      // Calculate overlay dimensions with padding
      const padding = 0.5;
      const width = maxX - minX + padding * 2;
      const depth = maxZ - minZ + padding * 2;
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;

      return {
        zoneId: zone.zoneId,
        position: [centerX, avgY + HEATMAP_HEIGHT_OFFSET, centerZ] as [
          number,
          number,
          number
        ],
        width,
        depth,
        color: getPerformanceColor(zone.performanceIndex),
        performanceIndex: zone.performanceIndex,
      };
    });
  }, [panels, panelZones, enabled]);

  if (!enabled || zoneOverlays.length === 0) return null;

  return (
    <group>
      {zoneOverlays.map(
        (overlay) =>
          overlay && (
            <ZoneOverlay
              key={overlay.zoneId}
              position={overlay.position}
              width={overlay.width}
              depth={overlay.depth}
              color={overlay.color}
            />
          )
      )}
    </group>
  );
}

interface ZoneOverlayProps {
  position: [number, number, number];
  width: number;
  depth: number;
  color: Color;
}

function ZoneOverlay({ position, width, depth, color }: ZoneOverlayProps) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.25}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
