/**
 * Equipment Projection — 3D to 2D screen coordinate mapping
 *
 * Projects equipment bounding-box corners from Three.js world space into
 * normalized screen coordinates (0–1) using the active camera. Results are
 * dimension-agnostic so they can be applied to any output image size.
 */

import * as THREE from 'three';
import type { DXFParsedData, ElectricalComponent } from '@/lib/dxf/types';

// Default equipment dimensions (metres) — must match Equipment3D.tsx
const EQUIPMENT_DIMS: Record<string, { width: number; height: number; depth: number }> = {
  inverter:    { width: 0.5,  height: 0.6,  depth: 0.25 },
  transformer: { width: 4.0,  height: 3.0,  depth: 2.0  },
  combiner:    { width: 0.6,  height: 0.8,  depth: 0.3  },
};

/** One projected equipment item — all coordinates normalised 0–1. */
export interface ProjectedEquipment {
  id: string;
  type: 'inverter' | 'transformer' | 'combiner';
  /** Normalised screen-space corners of the top face (clockwise: TL, TR, BR, BL). */
  topFace: ReadonlyArray<readonly [number, number]>;
  /** Normalised screen-space centre of the equipment. */
  cx: number;
  cy: number;
  /** False when the item is behind the camera or projects outside reasonable bounds. */
  visible: boolean;
}

/**
 * Convert DXF equipment coordinates to Three.js world space.
 * Replicates the transform in Equipment3D.tsx (including transformer INSERT offset).
 */
function dxfToWorld(
  item: ElectricalComponent,
  centerOffset: { x: number; z: number },
): THREE.Vector3 {
  const dims = EQUIPMENT_DIMS[item.type] ?? { width: 1, height: 1, depth: 1 };
  const isTransformer = item.type === 'transformer';
  return new THREE.Vector3(
    item.position[0] + (isTransformer ? 4.5 : 0) + centerOffset.x,
    dims.height,          // top face — view from above looks at the roof
    -item.position[1] + (isTransformer ? 7 : 0) + centerOffset.z,
  );
}

/**
 * Project a single Three.js world-space vector to normalised screen coords.
 * Returns null if the point is behind the camera.
 */
function project(
  worldVec: THREE.Vector3,
  camera: THREE.Camera,
): [number, number] | null {
  const v = worldVec.clone().project(camera);
  if (v.z > 1) return null; // behind camera
  return [
    (v.x + 1) / 2,
    (1 - v.y) / 2,
  ];
}

/**
 * Project all 3-D equipment in `parsedData` to normalised screen coordinates.
 * Must be called from within a Three.js render context (CanvasCaptureProvider)
 * where the live camera is available.
 */
export function projectEquipment(
  parsedData: DXFParsedData,
  camera: THREE.Camera,
): ProjectedEquipment[] {
  const centerOffset = {
    x: -parsedData.bounds.center[0],
    z:  parsedData.bounds.center[1],
  };

  const results: ProjectedEquipment[] = [];

  for (const item of parsedData.electrical) {
    if (item.type !== 'inverter' && item.type !== 'transformer' && item.type !== 'combiner') {
      continue;
    }

    const dims = EQUIPMENT_DIMS[item.type] ?? { width: 1, height: 1, depth: 1 };
    const topCenter = dxfToWorld(item, centerOffset);

    const hw = dims.width  / 2;
    const hd = dims.depth  / 2;
    const y  = topCenter.y;
    const x  = topCenter.x;
    const z  = topCenter.z;

    // Top-face corners: TL, TR, BR, BL (clockwise from above)
    const worldCorners = [
      new THREE.Vector3(x - hw, y, z - hd),
      new THREE.Vector3(x + hw, y, z - hd),
      new THREE.Vector3(x + hw, y, z + hd),
      new THREE.Vector3(x - hw, y, z + hd),
    ];

    const screenCorners = worldCorners.map(wc => project(wc, camera));
    const centerScreen  = project(topCenter, camera);

    const visible =
      centerScreen !== null &&
      screenCorners.every(sc => sc !== null);

    results.push({
      id:      item.id,
      type:    item.type as 'inverter' | 'transformer' | 'combiner',
      topFace: (screenCorners as ReadonlyArray<readonly [number, number]>),
      cx:      centerScreen?.[0] ?? 0,
      cy:      centerScreen?.[1] ?? 0,
      visible,
    });
  }

  return results;
}
