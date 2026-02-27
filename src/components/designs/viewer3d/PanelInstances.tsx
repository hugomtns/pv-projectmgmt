/**
 * PanelInstances - Efficient instanced rendering of solar panels
 *
 * Uses Three.js InstancedMesh for rendering thousands of panels
 * with a single draw call, ensuring 60 FPS even with 10,000+ panels.
 */

import { useRef, useEffect, useLayoutEffect, useMemo, useState, useCallback } from 'react';
import { InstancedMesh, MeshStandardMaterial, Object3D, Color, DoubleSide } from 'three';
import { Line } from '@react-three/drei';
import { createPanelTexture } from './proceduralTextures';
import type { PanelGeometry } from '@/lib/dxf/types';
import type { ElementAnchor } from '@/lib/types';
import type { PanelFramePerformance, PanelFaultType } from '@/lib/digitaltwin/types';

interface PanelInstancesProps {
  panels: PanelGeometry[];
  selectedIndex?: number | null;
  onPanelClick?: (index: number, panel: PanelGeometry) => void;
  // Element comment mode
  elementCommentMode?: boolean;
  onElementSelected?: (element: ElementAnchor) => void;
  // Digital Twin performance data (individual panel frames)
  panelFrames?: PanelFramePerformance[];
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

// White is the neutral instance color when using the canvas texture map
// (instance colors multiply with the texture, so white = unmodified texture)
const WHITE = new Color(1, 1, 1);

// Performance color cache
const performanceColorCache = new Map<number, Color>();

// Fault colors (cached)
const faultColorCache = new Map<PanelFaultType, Color>();

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

/**
 * Get color for a panel fault type
 * Returns distinct colors for different fault types
 */
function getFaultColor(faultType: PanelFaultType): Color {
  const cached = faultColorCache.get(faultType);
  if (cached) return cached;

  const color = new Color();

  switch (faultType) {
    case 'hot_spot':
      // Bright red-orange for overheating
      color.setHSL(0.02, 0.9, 0.5); // ~7° hue
      break;
    case 'shading':
      // Dark purple/blue for shading
      color.setHSL(0.7, 0.6, 0.35); // ~252° hue
      break;
    case 'soiling_heavy':
      // Brown/tan for heavy soiling
      color.setHSL(0.08, 0.5, 0.4); // ~29° hue
      break;
    case 'module_degradation':
      // Deep red for degradation (critical)
      color.setHSL(0, 0.8, 0.4); // 0° hue (red)
      break;
    default:
      // Fallback to orange
      color.setHSL(0.05, 0.8, 0.5);
  }

  faultColorCache.set(faultType, color);
  return color;
}

export function PanelInstances({
  panels,
  selectedIndex,
  onPanelClick: _onPanelClick, // Unused - interaction only in comment mode
  elementCommentMode = false,
  onElementSelected,
  panelFrames,
  showPerformanceColors = false,
}: PanelInstancesProps) {
  const moduleRef = useRef<InstancedMesh>(null);
  const moduleMaterialRef = useRef<MeshStandardMaterial>(null);
  const [mounted, setMounted] = useState(false);

  // Panel canvas texture — created once, cached at module level
  const panelTexture = useMemo(() => createPanelTexture(), []);
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

  // Create a mapping from panel index to performance index and fault type
  const { panelToPerformance, panelToFault } = useMemo(() => {
    const perfMapping = new Map<number, number>();
    const faultMapping = new Map<number, PanelFaultType>();

    if (!panelFrames || panelFrames.length === 0) {
      return { panelToPerformance: perfMapping, panelToFault: faultMapping };
    }

    // Each panel frame has its own panelIndex - direct mapping
    panelFrames.forEach((frame) => {
      perfMapping.set(frame.panelIndex, frame.performanceIndex);
      if (frame.faultType) {
        faultMapping.set(frame.panelIndex, frame.faultType);
      }
    });

    return { panelToPerformance: perfMapping, panelToFault: faultMapping };
  }, [panelFrames]);

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
    if (!modules || !mounted || totalModules === 0) return;

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

      // Calculate table center position
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
          const localX = (col - (cols - 1) / 2) * (moduleWidth + MODULE_GAP);
          const localZ = (row - (rows - 1) / 2) * (moduleHeight + MODULE_GAP);

          // Apply tilt to Z position (affects Y and Z in world)
          const tiltedY = localZ * Math.sin(tiltRad);
          const tiltedZ = localZ * Math.cos(tiltRad);

          // Rotate by azimuth to get world offset from table center
          const worldOffsetX = localX * Math.cos(azimuth) - tiltedZ * Math.sin(azimuth);
          const worldOffsetZ = localX * Math.sin(azimuth) + tiltedZ * Math.cos(azimuth);

          // Single module mesh — full size. The canvas texture encodes the
          // silver aluminium frame border so no separate frame mesh is needed,
          // eliminating the two-mesh z-fighting issue.
          tempObject.position.set(
            tableCenterX + worldOffsetX,
            tableCenterY + tiltedY,
            tableCenterZ - worldOffsetZ
          );
          tempObject.rotation.order = 'YXZ';
          tempObject.rotation.set(tiltRad, azimuth, 0);
          tempObject.scale.set(moduleWidth, DEFAULT_PANEL_THICKNESS, moduleHeight);
          tempObject.updateMatrix();
          modules.setMatrixAt(moduleIndex, tempObject.matrix);

          moduleIndex++;
        }
      }
    });

    modules.instanceMatrix.needsUpdate = true;
    modules.computeBoundingSphere();
  }, [panels, tempObject, mounted, totalModules]);

  // Apply colors and swap texture map.
  // Using useLayoutEffect to avoid the grey flash when toggling performance colors.
  useLayoutEffect(() => {
    const modules = moduleRef.current;
    const material = moduleMaterialRef.current;
    if (!modules || !mounted || totalModules === 0) return;

    if (showPerformanceColors) {
      // In heatmap mode: remove the texture map so instance colors render as solid fills
      if (material) { material.map = null; material.needsUpdate = true; }

      for (let moduleIndex = 0; moduleIndex < totalModules; moduleIndex++) {
        const panelIndex = moduleToPanel[moduleIndex];
        const faultType = panelToFault.get(panelIndex);
        const performanceIndex = panelToPerformance.get(panelIndex);

        if (faultType) {
          modules.setColorAt(moduleIndex, getFaultColor(faultType));
        } else if (performanceIndex !== undefined) {
          modules.setColorAt(moduleIndex, getPerformanceColor(performanceIndex));
        } else {
          // No telemetry yet — default to "good" performance
          modules.setColorAt(moduleIndex, getPerformanceColor(0.85));
        }
      }
    } else {
      // Normal mode: restore texture map and set all instance colors to white
      // (instance color multiplies with texture, so white = texture shows unmodified)
      if (material) { material.map = panelTexture; material.needsUpdate = true; }

      for (let moduleIndex = 0; moduleIndex < totalModules; moduleIndex++) {
        modules.setColorAt(moduleIndex, WHITE);
      }
    }

    if (modules.instanceColor) {
      modules.instanceColor.needsUpdate = true;
    }
  }, [showPerformanceColors, panelToPerformance, panelToFault, moduleToPanel, totalModules, mounted, panelTexture]);

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
      {/* Solar modules — single instanced mesh with procedural canvas texture.
          The texture encodes the silver aluminium frame border + monocrystalline
          cell grid, eliminating the previous two-mesh z-fighting issue.
          Instance colors are white in normal mode (texture shows unmodified) and
          replaced by performance/fault colours in heatmap mode (map is nulled). */}
      <instancedMesh
        key={`module-mesh-${totalModules}`}
        ref={moduleRef}
        args={[undefined, undefined, totalModules]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        receiveShadow
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          ref={moduleMaterialRef}
          map={panelTexture}
          color="#ffffff"
          metalness={0.1}
          roughness={0.2}
          side={DoubleSide}
        />
      </instancedMesh>

      {/* One invisible plane per table casts the aggregate shadow.
          Individual modules have castShadow disabled so shadows come from
          a single correctly-sized table rectangle rather than 24 tiny boxes. */}
      <TableShadowCasters panels={panels} />

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
 * TableShadowCasters - One invisible plane per panel table that casts a
 * single, correctly-sized shadow equal to the full table footprint.
 *
 * Why a separate component:
 *   Individual module boxes are only 5 cm thick. At a 2048×2048 shadow map
 *   over a 400 m² frustum each texel is ~0.2 m — wider than the module
 *   thickness — so the thin edges contribute near-zero shadow area.
 *   Casting per-module also fragments a 16 m × 4.5 m table into 24 small
 *   silhouettes with gaps between them.
 *
 *   Each plane here is sized to tableWidth × tableHeight, oriented identically
 *   to the panel face (tilt + azimuth), and uses colorWrite=false so it is
 *   completely invisible in the main render while still participating in the
 *   shadow-map pass.
 *
 *   The InstancedMesh keeps receiveShadow so inter-row shading (front row
 *   casting on the rear row) is still resolved correctly.
 */
function TableShadowCasters({ panels }: { panels: PanelGeometry[] }) {
  return (
    <group>
      {panels.map((panel, index) => {
        const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
        const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
        const mountingHeight = panel.mountingHeight || panel.position[2] || 0.8;
        const tiltAngle = panel.tiltAngle || DEFAULT_TILT_ANGLE;
        const tiltRad = (tiltAngle * Math.PI) / 180;
        const azimuth = panel.rotation;

        // Replicate the same table-centre calculation used for modules
        const centerHeight = mountingHeight + (tableHeight / 2) * Math.sin(tiltRad);
        const halfWidth = tableWidth / 2;
        const halfDepth = (tableHeight / 2) * Math.cos(tiltRad);
        const offsetX = halfWidth * Math.cos(azimuth) + halfDepth * Math.sin(azimuth);
        const offsetY = halfWidth * Math.sin(azimuth) - halfDepth * Math.cos(azimuth);

        const cx = panel.position[0] + offsetX;
        const cy = centerHeight;
        const cz = -(panel.position[1] + offsetY);

        // PlaneGeometry lies in XY (normal = +Z). Rotating by -PI/2 around X
        // brings the plane into XZ (normal = +Y, i.e. face-up). Adding tiltRad
        // then tilts it to the panel's slope angle. The Y-axis azimuth is
        // applied first (YXZ order) to orient the table horizontally.
        const rotX = tiltRad - Math.PI / 2;

        return (
          <mesh
            key={index}
            position={[cx, cy, cz]}
            rotation-order="YXZ"
            rotation={[rotX, azimuth, 0]}
            castShadow
          >
            <planeGeometry args={[tableWidth, tableHeight]} />
            {/* colorWrite=false + depthWrite=false: invisible to the camera,
                but the mesh is still visited by the shadow-map render pass */}
            <meshBasicMaterial colorWrite={false} depthWrite={false} side={DoubleSide} />
          </mesh>
        );
      })}
    </group>
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
