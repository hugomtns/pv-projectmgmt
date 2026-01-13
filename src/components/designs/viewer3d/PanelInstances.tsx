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
const DEFAULT_PANEL_THICKNESS = 0.15; // Visible thickness for 3D effect (150mm)
const DEFAULT_TILT_ANGLE = 20; // degrees - typical ground mount tilt

// Panel colors
const PANEL_COLOR = new Color('#1e40af'); // Blue
const PANEL_FRAME_COLOR = new Color('#94a3b8'); // Silver frame

export function PanelInstances({
  panels,
  selectedIndex,
  onPanelClick,
  elementCommentMode = false,
  onElementSelected,
}: PanelInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const frameRef = useRef<InstancedMesh>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Temporary object for matrix calculations
  const tempObject = useMemo(() => new Object3D(), []);

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
    const mesh = meshRef.current;
    const frame = frameRef.current;
    if (!mesh || !frame || !mounted) return;

    panels.forEach((panel, i) => {
      // Get actual table dimensions from extended data or use defaults
      const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
      const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
      const mountingHeight = panel.mountingHeight || panel.position[2] || 0.8;
      const tiltAngle = panel.tiltAngle || DEFAULT_TILT_ANGLE;

      // Convert tilt angle to radians
      // Tilt is rotation around X axis - positive tilts back (top away from viewer)
      const tiltRad = (tiltAngle * Math.PI) / 180;
      const azimuth = panel.rotation; // Already in radians

      // Panel base height - the mounting height is the lowest edge
      // After tilt, the center is higher by half the tilted height
      const centerHeight = mountingHeight + (tableHeight / 2) * Math.sin(tiltRad);

      // The INSERT position in DXF is at corner of panel table
      // Offset to center: +halfWidth in X direction, -halfDepth in facing direction
      const halfWidth = tableWidth / 2;
      const halfDepth = (tableHeight / 2) * Math.cos(tiltRad); // Ground projection

      // Apply offset rotated by azimuth (INSERT is at left-front corner)
      const offsetX = halfWidth * Math.cos(azimuth) + halfDepth * Math.sin(azimuth);
      const offsetY = halfWidth * Math.sin(azimuth) - halfDepth * Math.cos(azimuth);

      // DXF X,Y horizontal -> Three.js X,Z (with Y negated)
      tempObject.position.set(
        panel.position[0] + offsetX,
        centerHeight,
        -(panel.position[1] + offsetY)
      );

      // Set rotation using Euler order 'YXZ' for proper azimuth then tilt
      // First rotate around Y (azimuth), then around X (tilt)
      tempObject.rotation.order = 'YXZ';
      tempObject.rotation.set(
        tiltRad,           // X: tilt angle (panels lean back toward sky)
        panel.rotation,    // Y: azimuth angle (panel facing direction)
        0                  // Z: no roll
      );

      // Scale: panel table dimensions
      // Box lies flat on XZ plane, Y is thickness
      tempObject.scale.set(
        tableWidth,        // X: width of table (columns of modules)
        DEFAULT_PANEL_THICKNESS, // Y: panel thickness
        tableHeight        // Z: depth of table (rows of modules)
      );

      tempObject.updateMatrix();

      // Apply to both panel and frame meshes
      mesh.setMatrixAt(i, tempObject.matrix);
      frame.setMatrixAt(i, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    frame.instanceMatrix.needsUpdate = true;

    // Compute bounding sphere for raycasting to work properly
    mesh.computeBoundingSphere();
    frame.computeBoundingSphere();
  }, [panels, tempObject, mounted]);

  // Handle click events
  const handleClick = useCallback((event: { stopPropagation: () => void; instanceId?: number }) => {
    console.log('Panel click event:', event.instanceId, 'commentMode:', elementCommentMode);
    event.stopPropagation();
    if (event.instanceId === undefined) return;

    if (elementCommentMode && onElementSelected) {
      // In comment mode, select element for commenting
      console.log('Selecting panel for comment:', event.instanceId);
      onElementSelected({
        elementType: 'panel',
        elementId: String(event.instanceId),
        elementLabel: `Panel #${event.instanceId + 1}`,
      });
    } else if (onPanelClick) {
      // Normal selection mode
      onPanelClick(event.instanceId, panels[event.instanceId]);
    }
  }, [elementCommentMode, onElementSelected, onPanelClick, panels]);

  // Handle pointer over for hover highlighting (better than onPointerMove for InstancedMesh)
  const handlePointerOver = useCallback((event: { stopPropagation: () => void; instanceId?: number }) => {
    console.log('Panel pointer over:', event.instanceId, 'commentMode:', elementCommentMode);
    if (!elementCommentMode) return;
    event.stopPropagation();
    if (event.instanceId !== undefined) {
      setHoveredIndex(event.instanceId);
    }
  }, [elementCommentMode]);

  // Handle pointer out
  const handlePointerOut = useCallback((event: { stopPropagation: () => void }) => {
    console.log('Panel pointer out');
    event.stopPropagation();
    setHoveredIndex(null);
  }, []);

  if (panels.length === 0) return null;

  return (
    <group>
      {/* Main panel surface */}
      <instancedMesh
        key={`panel-mesh-${panels.length}`}
        ref={meshRef}
        args={[undefined, undefined, panels.length]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={PANEL_COLOR}
          metalness={0.6}
          roughness={0.3}
          side={DoubleSide}
        />
      </instancedMesh>

      {/* Panel frames (wireframe outline) */}
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
          opacity={0.6}
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
