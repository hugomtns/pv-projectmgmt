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
const DEFAULT_PANEL_THICKNESS = 0.15; // Visible thickness for 3D effect (150mm)
const DEFAULT_TILT_ANGLE = 20; // degrees - typical ground mount tilt

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

    console.log('PanelInstances: Updating matrices for', panels.length, 'panels');

    panels.forEach((panel, i) => {
      // Get actual table dimensions from extended data or use defaults
      const tableWidth = panel.tableWidth || DEFAULT_TABLE_WIDTH;
      const tableHeight = panel.tableHeight || DEFAULT_TABLE_HEIGHT;
      const mountingHeight = panel.mountingHeight || panel.position[2] || 0.8;
      const tiltAngle = panel.tiltAngle || DEFAULT_TILT_ANGLE;

      // Convert tilt angle to radians
      // Tilt is rotation around X axis - positive tilts back (top away from viewer)
      const tiltRad = (tiltAngle * Math.PI) / 180;

      // Panel base height - the mounting height is the lowest edge
      // After tilt, the center is higher by half the tilted height
      const centerHeight = mountingHeight + (tableHeight / 2) * Math.sin(tiltRad);

      // Set position (DXF uses X, Y as horizontal plane)
      // We map: DXF X -> Three.js X, DXF Y -> Three.js Z (negated), height -> Three.js Y
      tempObject.position.set(
        panel.position[0],
        centerHeight,
        -panel.position[1]
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
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      frameRef.current!.setMatrixAt(i, tempObject.matrix);

      // Log first panel's transform for debugging
      if (i === 0) {
        console.log('First panel transform:', {
          position: [tempObject.position.x, tempObject.position.y, tempObject.position.z],
          rotation: [tempObject.rotation.x, tempObject.rotation.y, tempObject.rotation.z],
          scale: [tempObject.scale.x, tempObject.scale.y, tempObject.scale.z],
        });
      }
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
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </instancedMesh>

      {/* Panel frames (wireframe outline) */}
      <instancedMesh
        ref={frameRef}
        args={[undefined, undefined, panels.length]}
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

  return (
    <mesh
      position={[
        panel.position[0],
        centerHeight + 0.2, // Slightly above panel
        -panel.position[1]
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
