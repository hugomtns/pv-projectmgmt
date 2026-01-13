/**
 * PanelInstances - Efficient instanced rendering of solar panels
 *
 * Uses Three.js InstancedMesh for rendering thousands of panels
 * with a single draw call, ensuring 60 FPS even with 10,000+ panels.
 */

import { useRef, useEffect, useLayoutEffect, useMemo, useState, useCallback } from 'react';
import { InstancedMesh, Object3D, Color, DoubleSide } from 'three';
import type { PanelGeometry } from '@/lib/dxf/types';
import type { ElementAnchor } from '@/lib/types';

interface PanelInstancesProps {
  panels: PanelGeometry[];
  selectedIndex?: number | null;
  onPanelClick?: (index: number, panel: PanelGeometry) => void;
  // Element comment mode
  elementCommentMode?: boolean;
  onElementSelected?: (element: ElementAnchor) => void;
}

// Default panel table dimensions (in meters) - fallback if not in extended data
const DEFAULT_TABLE_WIDTH = 16.0; // ~12 modules wide
const DEFAULT_TABLE_HEIGHT = 4.5; // ~2 rows
const DEFAULT_PANEL_THICKNESS = 0.05; // Module thickness (50mm)
const DEFAULT_TILT_ANGLE = 20; // degrees - typical ground mount tilt

// Default module grid (when extended data is missing)
const DEFAULT_MODULE_ROWS = 2;
const DEFAULT_MODULE_COLS = 12;
const MODULE_GAP = 0.025; // 25mm gap between columns only

// Panel colors
const PANEL_COLOR = new Color('#1e3a5f'); // Dark blue (solar cell color)
const PANEL_FRAME_COLOR = new Color('#94a3b8'); // Silver frame

export function PanelInstances({
  panels,
  selectedIndex,
  onPanelClick,
  elementCommentMode = false,
  onElementSelected,
}: PanelInstancesProps) {
  const moduleRef = useRef<InstancedMesh>(null);
  const frameRef = useRef<InstancedMesh>(null);
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
    const frame = frameRef.current;
    if (!modules || !frame || !mounted || totalModules === 0) return;

    let moduleIndex = 0;

    panels.forEach((panel, panelIdx) => {
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

      // Calculate module dimensions
      // Modules fill the table with gaps between columns only
      const totalGapWidth = (cols - 1) * MODULE_GAP;
      const moduleWidth = (tableWidth - totalGapWidth) / cols;
      const moduleHeight = tableHeight / rows; // No gap between rows - stacked

      // Set frame transform (same as table)
      tempObject.position.set(tableCenterX, tableCenterY, tableCenterZ);
      tempObject.rotation.order = 'YXZ';
      tempObject.rotation.set(tiltRad, azimuth, 0);
      tempObject.scale.set(tableWidth, DEFAULT_PANEL_THICKNESS, tableHeight);
      tempObject.updateMatrix();
      frame.setMatrixAt(panelIdx, tempObject.matrix);

      // Render each module in the grid
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Module position in table's LOCAL coordinate system (before tilt/rotation)
          // X: centered, with gaps between columns
          // Z: centered, no gaps between rows (stacked)
          const localX = (col - (cols - 1) / 2) * (moduleWidth + MODULE_GAP);
          const localZ = (row - (rows - 1) / 2) * moduleHeight;

          // Apply tilt to Z position (affects Y and Z in world)
          const tiltedY = localZ * Math.sin(tiltRad);
          const tiltedZ = localZ * Math.cos(tiltRad);

          // Rotate by azimuth to get world offset from table center
          const worldOffsetX = localX * Math.cos(azimuth) - tiltedZ * Math.sin(azimuth);
          const worldOffsetZ = localX * Math.sin(azimuth) + tiltedZ * Math.cos(azimuth);

          // Final module position
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
    frame.instanceMatrix.needsUpdate = true;

    modules.computeBoundingSphere();
    frame.computeBoundingSphere();
  }, [panels, tempObject, mounted, totalModules]);

  // Handle click events - map module index back to panel index
  const handleClick = useCallback((event: { stopPropagation: () => void; instanceId?: number }) => {
    event.stopPropagation();
    if (event.instanceId === undefined) return;

    const panelIndex = moduleToPanel[event.instanceId];
    if (panelIndex === undefined) return;

    if (elementCommentMode && onElementSelected) {
      onElementSelected({
        elementType: 'panel',
        elementId: String(panelIndex),
        elementLabel: `Panel #${panelIndex + 1}`,
      });
    } else if (onPanelClick) {
      onPanelClick(panelIndex, panels[panelIndex]);
    }
  }, [elementCommentMode, onElementSelected, onPanelClick, panels, moduleToPanel]);

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

  // Handle pointer out
  const handlePointerOut = useCallback((event: { stopPropagation: () => void }) => {
    console.log('Panel pointer out');
    event.stopPropagation();
    setHoveredIndex(null);
  }, []);

  if (panels.length === 0 || totalModules === 0) return null;

  return (
    <group>
      {/* Individual solar modules - shiny glass surface */}
      <instancedMesh
        key={`module-mesh-${totalModules}`}
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
        <meshPhysicalMaterial
          color={PANEL_COLOR}
          metalness={0.1}
          roughness={0.15}
          clearcoat={0.8}
          clearcoatRoughness={0.1}
          reflectivity={0.9}
          side={DoubleSide}
        />
      </instancedMesh>

      {/* Panel table frames (wireframe outline showing table boundary) */}
      <instancedMesh
        key={`frame-mesh-${panels.length}`}
        ref={frameRef}
        args={[undefined, undefined, panels.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1.01, 1.01, 1.01]} />
        <meshBasicMaterial
          color={PANEL_FRAME_COLOR}
          wireframe
          transparent
          opacity={0.5}
        />
      </instancedMesh>

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
