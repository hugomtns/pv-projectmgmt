/**
 * PanelInstances - Efficient instanced rendering of solar panels
 *
 * Uses Three.js InstancedMesh for rendering thousands of panels
 * with a single draw call, ensuring 60 FPS even with 10,000+ panels.
 */

import { useRef, useEffect, useLayoutEffect, useMemo, useState, useCallback } from 'react';
import { InstancedMesh, Object3D, Color, DoubleSide } from 'three';
import { Line } from '@react-three/drei';
import type { PanelGeometry } from '@/lib/dxf/types';
import type { ElementAnchor } from '@/lib/types';
import type { PanelZonePerformance } from '@/lib/digitaltwin/types';

interface PanelInstancesProps {
  panels: PanelGeometry[];
  selectedIndex?: number | null;
  onPanelClick?: (index: number, panel: PanelGeometry) => void;
  // Element comment mode
  elementCommentMode?: boolean;
  onElementSelected?: (element: ElementAnchor) => void;
  // Digital Twin performance heatmap
  panelZones?: PanelZonePerformance[];
  showPerformanceColors?: boolean;
}

// Default panel table dimensions (in meters) - fallback if not in extended data
const DEFAULT_TABLE_WIDTH = 16.0; // ~12 modules wide
const DEFAULT_TABLE_HEIGHT = 4.5; // ~2 rows
const DEFAULT_PANEL_THICKNESS = 0.05; // Module thickness (50mm)
const DEFAULT_TILT_ANGLE = 20; // degrees - typical ground mount tilt

// Default module grid (when extended data is missing)
const DEFAULT_MODULE_ROWS = 2;
const DEFAULT_MODULE_COLS = 12;
const MODULE_GAP = 0.02; // 20mm gap between modules (both rows and columns)
const MODULE_FRAME_INSET = 0.015; // 15mm inset from module edge (makes silver frame visible)

// Panel colors
const PANEL_COLOR = new Color('#0a1628'); // Dark blue-black (like real monocrystalline cells)
const PANEL_FRAME_COLOR = new Color('#e2e8f0'); // Light silver/white frame (like real aluminum)

// Performance color cache
const performanceColorCache = new Map<number, Color>();

/**
 * Get color based on performance index using HSL interpolation
 * 1.0 = green (excellent), 0.7 = yellow (moderate), 0.5 = red (poor)
 */
function getPerformanceColor(performanceIndex: number): Color {
  // Round to 2 decimal places for cache key
  const cacheKey = Math.round(performanceIndex * 100);

  const cached = performanceColorCache.get(cacheKey);
  if (cached) return cached;

  // Clamp to 0-1 range
  const normalized = Math.max(0, Math.min(1, performanceIndex));

  // HSL color mapping: green (120°) -> yellow (60°) -> red (0°)
  // Performance 1.0 = 120° (green), Performance 0.5 = 0° (red)
  const hue = normalized * 0.33; // 0.33 = 120°/360°

  const color = new Color();
  color.setHSL(hue, 0.7, 0.45); // Slightly muted saturation for better visual

  performanceColorCache.set(cacheKey, color);
  return color;
}

export function PanelInstances({
  panels,
  selectedIndex,
  onPanelClick: _onPanelClick, // Unused - interaction only in comment mode
  elementCommentMode = false,
  onElementSelected,
  panelZones,
  showPerformanceColors = false,
}: PanelInstancesProps) {
  const moduleRef = useRef<InstancedMesh>(null);
  const moduleFrameRef = useRef<InstancedMesh>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Temporary object for matrix calculations
  const tempObject = useMemo(() => new Object3D(), []);

  // Calculate total modules and mapping from module index to panel index
  const { totalModules, moduleToPanel } = useMemo(() => {
    let total = 0;
    const mapping: number[] = [];

    panels.forEach((panel, panelIndex) => {
      const rows = panel.moduleRows || DEFAULT_MODULE_ROWS;
      const cols = panel.moduleColumns || DEFAULT_MODULE_COLS;
      const moduleCount = rows * cols;

      for (let i = 0; i < moduleCount; i++) {
        mapping.push(panelIndex);
      }
      total += moduleCount;
    });

    return { totalModules: total, moduleToPanel: mapping };
  }, [panels]);

  // Create a mapping from panel index to performance index
  const panelToPerformance = useMemo(() => {
    const mapping = new Map<number, number>();

    if (!panelZones || panelZones.length === 0) {
      return mapping;
    }

    // Each zone contains panelIndices - map those panels to the zone's performance
    panelZones.forEach((zone) => {
      zone.panelIndices.forEach((panelIndex) => {
        mapping.set(panelIndex, zone.performanceIndex);
      });
    });

    return mapping;
  }, [panelZones]);

  // Trigger re-render after mount to ensure refs are available
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset hover state when comment mode is disabled
  useEffect(() => {
    if (!elementCommentMode) {
      setHoveredIndex(null);
    }
  }, [elementCommentMode]);

  // Update instance matrices when panels change or after mount
  // Using useLayoutEffect to ensure matrices are set before paint
  useLayoutEffect(() => {
    const modules = moduleRef.current;
    const moduleFrames = moduleFrameRef.current;
    if (!modules || !moduleFrames || !mounted || totalModules === 0) return;

    let moduleIndex = 0;

    panels.forEach((panel) => {
      // Get actual table dimensions from extended data or use defaults
      const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
      const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
      const mountingHeight = panel.mountingHeight || panel.position[2] || 0.8;
      const tiltAngle = panel.tiltAngle || DEFAULT_TILT_ANGLE;
      const rows = panel.moduleRows || DEFAULT_MODULE_ROWS;
      const cols = panel.moduleColumns || DEFAULT_MODULE_COLS;

      // Convert tilt angle to radians
      const tiltRad = (tiltAngle * Math.PI) / 180;
      const azimuth = panel.rotation; // Already in radians

      // Calculate table center position (same as before - this is correct)
      const centerHeight = mountingHeight + (tableHeight / 2) * Math.sin(tiltRad);
      const halfWidth = tableWidth / 2;
      const halfDepth = (tableHeight / 2) * Math.cos(tiltRad);
      const offsetX = halfWidth * Math.cos(azimuth) + halfDepth * Math.sin(azimuth);
      const offsetY = halfWidth * Math.sin(azimuth) - halfDepth * Math.cos(azimuth);

      // Table center in world coordinates
      const tableCenterX = panel.position[0] + offsetX;
      const tableCenterY = centerHeight;
      const tableCenterZ = -(panel.position[1] + offsetY);

      // Calculate module dimensions with gaps in BOTH directions
      const totalGapWidth = (cols - 1) * MODULE_GAP;
      const totalGapHeight = (rows - 1) * MODULE_GAP;
      const moduleWidth = (tableWidth - totalGapWidth) / cols;
      const moduleHeight = (tableHeight - totalGapHeight) / rows;

      // Render each module in the grid
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Module position in table's LOCAL coordinate system (before tilt/rotation)
          // X: centered, with gaps between columns
          // Z: centered, with gaps between rows
          const localX = (col - (cols - 1) / 2) * (moduleWidth + MODULE_GAP);
          const localZ = (row - (rows - 1) / 2) * (moduleHeight + MODULE_GAP);

          // Apply tilt to Z position (affects Y and Z in world)
          const tiltedY = localZ * Math.sin(tiltRad);
          const tiltedZ = localZ * Math.cos(tiltRad);

          // Rotate by azimuth to get world offset from table center
          const worldOffsetX = localX * Math.cos(azimuth) - tiltedZ * Math.sin(azimuth);
          const worldOffsetZ = localX * Math.sin(azimuth) + tiltedZ * Math.cos(azimuth);

          // Module frame position (full size module slot - silver border visible)
          tempObject.position.set(
            tableCenterX + worldOffsetX,
            tableCenterY + tiltedY - 0.01, // Behind module (1cm offset to prevent z-fighting)
            tableCenterZ - worldOffsetZ
          );
          tempObject.rotation.order = 'YXZ';
          tempObject.rotation.set(tiltRad, azimuth, 0);
          tempObject.scale.set(moduleWidth, DEFAULT_PANEL_THICKNESS + 0.01, moduleHeight);
          tempObject.updateMatrix();
          moduleFrames.setMatrixAt(moduleIndex, tempObject.matrix);

          // Module cell position (slightly smaller - shows silver frame border)
          tempObject.position.set(
            tableCenterX + worldOffsetX,
            tableCenterY + tiltedY,
            tableCenterZ - worldOffsetZ
          );
          tempObject.scale.set(
            moduleWidth - MODULE_FRAME_INSET * 2,
            DEFAULT_PANEL_THICKNESS,
            moduleHeight - MODULE_FRAME_INSET * 2
          );
          tempObject.updateMatrix();
          modules.setMatrixAt(moduleIndex, tempObject.matrix);

          moduleIndex++;
        }
      }
    });

    modules.instanceMatrix.needsUpdate = true;
    moduleFrames.instanceMatrix.needsUpdate = true;

    modules.computeBoundingSphere();
    moduleFrames.computeBoundingSphere();
  }, [panels, tempObject, mounted, totalModules]);

  // Apply performance-based colors to modules
  useEffect(() => {
    const modules = moduleRef.current;
    if (!modules || !mounted || totalModules === 0) return;

    if (showPerformanceColors && panelToPerformance.size > 0) {
      // Apply performance-based colors to each module
      for (let moduleIndex = 0; moduleIndex < totalModules; moduleIndex++) {
        const panelIndex = moduleToPanel[moduleIndex];
        const performanceIndex = panelToPerformance.get(panelIndex);

        if (performanceIndex !== undefined) {
          const performanceColor = getPerformanceColor(performanceIndex);
          modules.setColorAt(moduleIndex, performanceColor);
        } else {
          // Default panel color if no performance data for this panel
          modules.setColorAt(moduleIndex, PANEL_COLOR);
        }
      }
    } else {
      // Reset to default panel color
      for (let moduleIndex = 0; moduleIndex < totalModules; moduleIndex++) {
        modules.setColorAt(moduleIndex, PANEL_COLOR);
      }
    }

    // Mark instance color buffer as needing update
    if (modules.instanceColor) {
      modules.instanceColor.needsUpdate = true;
    }
  }, [showPerformanceColors, panelToPerformance, moduleToPanel, totalModules, mounted]);

  // Handle click events - only active in comment mode
  const handleClick = useCallback((event: { stopPropagation: () => void; instanceId?: number }) => {
    if (!elementCommentMode) return; // Only allow interaction in comment mode
    event.stopPropagation();
    if (event.instanceId === undefined) return;

    const panelIndex = moduleToPanel[event.instanceId];
    if (panelIndex === undefined) return;

    if (onElementSelected) {
      onElementSelected({
        elementType: 'panel',
        elementId: String(panelIndex),
        elementLabel: `Panel #${panelIndex + 1}`,
      });
    }
  }, [elementCommentMode, onElementSelected, moduleToPanel]);

  // Handle pointer over for hover highlighting
  const handlePointerOver = useCallback((event: { stopPropagation: () => void; instanceId?: number }) => {
    if (!elementCommentMode) return;
    event.stopPropagation();
    if (event.instanceId !== undefined) {
      const panelIndex = moduleToPanel[event.instanceId];
      if (panelIndex !== undefined) {
        setHoveredIndex(panelIndex);
      }
    }
  }, [elementCommentMode, moduleToPanel]);

  // Handle pointer out - only active in comment mode
  const handlePointerOut = useCallback((event: { stopPropagation: () => void }) => {
    if (!elementCommentMode) return;
    event.stopPropagation();
    setHoveredIndex(null);
  }, [elementCommentMode]);

  if (panels.length === 0 || totalModules === 0) return null;

  return (
    <group>
      {/* Module frames - silver aluminum border around each module */}
      <instancedMesh
        key={`module-frame-mesh-${totalModules}`}
        ref={moduleFrameRef}
        args={[undefined, undefined, totalModules]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={PANEL_FRAME_COLOR}
          metalness={0.7}
          roughness={0.3}
          side={DoubleSide}
        />
      </instancedMesh>

      {/* Individual solar modules - shiny dark blue glass surface
          When showing performance colors, base color is white so instance colors show through */}
      <instancedMesh
        key={`module-mesh-${totalModules}-${showPerformanceColors}`}
        ref={moduleRef}
        args={[undefined, undefined, totalModules]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={showPerformanceColors ? '#ffffff' : PANEL_COLOR}
          metalness={0}
          roughness={0.3}
          side={DoubleSide}
        />
      </instancedMesh>

      {/* Table outlines - Line-based for clean rectangles (no diagonals) */}
      <TableOutlines panels={panels} />

      {/* Selection highlight */}
      {selectedIndex !== null && selectedIndex !== undefined && panels[selectedIndex] && (
        <SelectionHighlight panel={panels[selectedIndex]} />
      )}

      {/* Hover highlight in comment mode */}
      {elementCommentMode && hoveredIndex !== null && panels[hoveredIndex] && (
        <HoverHighlight panel={panels[hoveredIndex]} />
      )}
    </group>
  );
}

/**
 * Selection highlight - Shows a glowing outline around selected panel
 */
function SelectionHighlight({ panel }: { panel: PanelGeometry }) {
  const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
  const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
  const mountingHeight = panel.mountingHeight || panel.position[2] || 0.8;
  const tiltAngle = panel.tiltAngle || DEFAULT_TILT_ANGLE;
  const tiltRad = (tiltAngle * Math.PI) / 180;
  const centerHeight = mountingHeight + (tableHeight / 2) * Math.sin(tiltRad);

  // Calculate the offset to center (same as in the matrix update)
  const halfWidth = tableWidth / 2;
  const halfDepth = (tableHeight / 2) * Math.cos(tiltRad);
  const azimuth = panel.rotation;
  const offsetX = halfWidth * Math.cos(azimuth) + halfDepth * Math.sin(azimuth);
  const offsetY = halfWidth * Math.sin(azimuth) - halfDepth * Math.cos(azimuth);

  return (
    <mesh
      position={[
        panel.position[0] + offsetX,
        centerHeight + 0.1, // Slightly above panel
        -(panel.position[1] + offsetY)
      ]}
      rotation-order="YXZ"
      rotation={[tiltRad, panel.rotation, 0]}
      scale={[
        tableWidth * 1.05,
        DEFAULT_PANEL_THICKNESS * 2,
        tableHeight * 1.05
      ]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#fbbf24"
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Hover highlight - Shows a glow when hovering over panel in comment mode
 */
function HoverHighlight({ panel }: { panel: PanelGeometry }) {
  const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
  const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
  const mountingHeight = panel.mountingHeight || panel.position[2] || 0.8;
  const tiltAngle = panel.tiltAngle || DEFAULT_TILT_ANGLE;
  const tiltRad = (tiltAngle * Math.PI) / 180;
  const centerHeight = mountingHeight + (tableHeight / 2) * Math.sin(tiltRad);

  // Calculate the offset to center (same as in the matrix update)
  const halfWidth = tableWidth / 2;
  const halfDepth = (tableHeight / 2) * Math.cos(tiltRad);
  const azimuth = panel.rotation;
  const offsetX = halfWidth * Math.cos(azimuth) + halfDepth * Math.sin(azimuth);
  const offsetY = halfWidth * Math.sin(azimuth) - halfDepth * Math.cos(azimuth);

  return (
    <mesh
      position={[
        panel.position[0] + offsetX,
        centerHeight + 0.15, // Slightly above panel
        -(panel.position[1] + offsetY)
      ]}
      rotation-order="YXZ"
      rotation={[tiltRad, panel.rotation, 0]}
      scale={[
        tableWidth * 1.08,
        DEFAULT_PANEL_THICKNESS * 2.5,
        tableHeight * 1.08
      ]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#f97316"  // Orange for hover
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * TableOutlines - Renders Line-based outlines for each panel table
 * Uses Line component from @react-three/drei for clean rectangles (no diagonals)
 */
function TableOutlines({ panels }: { panels: PanelGeometry[] }) {
  return (
    <group>
      {panels.map((panel, index) => (
        <TableOutline key={index} panel={panel} />
      ))}
    </group>
  );
}

/**
 * TableOutline - Renders a single panel table perimeter using Line
 */
function TableOutline({ panel }: { panel: PanelGeometry }) {
  const points = useMemo(() => {
    const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
    const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
    const mountingHeight = panel.mountingHeight || panel.position[2] || 0.8;
    const tiltAngle = panel.tiltAngle || DEFAULT_TILT_ANGLE;
    const tiltRad = (tiltAngle * Math.PI) / 180;
    const azimuth = panel.rotation;

    // Calculate center position (same logic as main matrix calculation)
    const centerHeight = mountingHeight + (tableHeight / 2) * Math.sin(tiltRad);
    const halfWidth = tableWidth / 2;
    const halfDepth = (tableHeight / 2) * Math.cos(tiltRad);
    const offsetX = halfWidth * Math.cos(azimuth) + halfDepth * Math.sin(azimuth);
    const offsetY = halfWidth * Math.sin(azimuth) - halfDepth * Math.cos(azimuth);
    const tableCenterX = panel.position[0] + offsetX;
    const tableCenterY = centerHeight;
    const tableCenterZ = -(panel.position[1] + offsetY);

    // 4 corners in local table coordinates (before tilt/rotation)
    const localCorners: [number, number][] = [
      [-tableWidth / 2, -tableHeight / 2], // bottom-left
      [tableWidth / 2, -tableHeight / 2],  // bottom-right
      [tableWidth / 2, tableHeight / 2],   // top-right
      [-tableWidth / 2, tableHeight / 2],  // top-left
    ];

    // Transform each corner to world coordinates
    const worldPoints: [number, number, number][] = localCorners.map(([lx, lz]) => {
      // Apply tilt (Z in local becomes Y and Z in tilted)
      const tiltedY = lz * Math.sin(tiltRad);
      const tiltedZ = lz * Math.cos(tiltRad);

      // Apply azimuth rotation
      const worldOffsetX = lx * Math.cos(azimuth) - tiltedZ * Math.sin(azimuth);
      const worldOffsetZ = lx * Math.sin(azimuth) + tiltedZ * Math.cos(azimuth);

      return [
        tableCenterX + worldOffsetX,
        tableCenterY + tiltedY + 0.02, // Slightly above modules
        tableCenterZ - worldOffsetZ,
      ];
    });

    // Close the rectangle by returning to first point
    return [...worldPoints, worldPoints[0]];
  }, [panel]);

  return (
    <Line
      points={points}
      color="#e2e8f0" // Light silver/white
      lineWidth={2}
    />
  );
}
