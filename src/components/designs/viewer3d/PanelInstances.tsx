/**
 * PanelInstances - Efficient instanced rendering of solar panels
 *
 * Uses Three.js InstancedMesh for rendering thousands of panels
 * with a single draw call, ensuring 60 FPS even with 10,000+ panels.
 */

import { useRef, useEffect, useMemo } from 'react';
import { InstancedMesh, Object3D, Color, DoubleSide } from 'three';
import type { PanelGeometry } from '@/lib/dxf/types';

interface PanelInstancesProps {
  panels: PanelGeometry[];
  selectedIndex?: number | null;
  onPanelClick?: (index: number, panel: PanelGeometry) => void;
}

// Default panel table dimensions (in meters) - fallback if not in extended data
const DEFAULT_TABLE_WIDTH = 16.0; // ~12 modules wide
const DEFAULT_TABLE_HEIGHT = 4.5; // ~2 rows
const DEFAULT_PANEL_THICKNESS = 0.04;

// Panel colors
const PANEL_COLOR = new Color('#1e40af'); // Blue
const PANEL_FRAME_COLOR = new Color('#94a3b8'); // Silver frame

export function PanelInstances({ panels, selectedIndex, onPanelClick }: PanelInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const frameRef = useRef<InstancedMesh>(null);

  // Temporary object for matrix calculations
  const tempObject = useMemo(() => new Object3D(), []);

  // Update instance matrices when panels change
  useEffect(() => {
    if (!meshRef.current || !frameRef.current) return;

    panels.forEach((panel, i) => {
      // Get actual table dimensions from extended data or use defaults
      const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
      const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
      const mountingHeight = panel.mountingHeight || panel.position[2] || 0.5;

      // Set position (DXF uses X, Y as horizontal; Z typically mounting height)
      // We map DXF X -> Three.js X, DXF Y -> Three.js Z, and use Y for height
      tempObject.position.set(
        panel.position[0],
        mountingHeight + DEFAULT_PANEL_THICKNESS / 2, // Height above ground
        -panel.position[1] // Flip Y to Z (DXF Y goes up, Three.js Z comes towards camera)
      );

      // Apply rotation around Y axis (azimuth angle from DXF)
      tempObject.rotation.set(0, -panel.rotation, 0);

      // Apply actual table dimensions
      tempObject.scale.set(
        tableWidth,
        DEFAULT_PANEL_THICKNESS,
        tableHeight
      );

      tempObject.updateMatrix();

      // Apply to both panel and frame meshes
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      frameRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    frameRef.current.instanceMatrix.needsUpdate = true;
  }, [panels, tempObject]);

  // Handle click events
  const handleClick = (event: { stopPropagation: () => void; instanceId?: number }) => {
    event.stopPropagation();
    if (event.instanceId !== undefined && onPanelClick) {
      onPanelClick(event.instanceId, panels[event.instanceId]);
    }
  };

  if (panels.length === 0) return null;

  return (
    <group>
      {/* Main panel surface */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, panels.length]}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={PANEL_COLOR}
          metalness={0.6}
          roughness={0.3}
          side={DoubleSide}
        />
      </instancedMesh>

      {/* Panel frames (slightly larger, silver color) */}
      <instancedMesh
        ref={frameRef}
        args={[undefined, undefined, panels.length]}
      >
        <boxGeometry args={[1.02, 1.02, 1.02]} />
        <meshStandardMaterial
          color={PANEL_FRAME_COLOR}
          metalness={0.8}
          roughness={0.2}
          side={DoubleSide}
          wireframe
        />
      </instancedMesh>

      {/* Selection highlight */}
      {selectedIndex !== null && selectedIndex !== undefined && panels[selectedIndex] && (
        <SelectionHighlight panel={panels[selectedIndex]} />
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
  const mountingHeight = panel.mountingHeight || panel.position[2] || 0.5;

  return (
    <mesh
      position={[
        panel.position[0],
        mountingHeight + DEFAULT_PANEL_THICKNESS / 2 + 0.1,
        -panel.position[1]
      ]}
      rotation={[0, -panel.rotation, 0]}
      scale={[
        tableWidth * 1.05,
        DEFAULT_PANEL_THICKNESS * 3,
        tableHeight * 1.05
      ]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#fbbf24"
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}
