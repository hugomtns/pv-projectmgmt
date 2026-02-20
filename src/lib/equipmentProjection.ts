/**
 * Equipment Projection — 3D to 2D screen coordinate mapping
 *
 * Projects equipment bounding-box corners from Three.js world space into
 * normalized screen coordinates (0–1) using the active camera. Results are
 * dimension-agnostic so they can be applied to any output image size.
 *
 * Both the top face (at equipment height) and bottom face (at ground level)
 * are projected so the compositing layer can draw perspective-correct 3D boxes.
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
  /**
   * Normalised screen-space corners of the TOP face (clockwise: TL, TR, BR, BL).
   * TL = left-front, TR = right-front, BR = right-back, BL = left-back.
   */
  topFace: ReadonlyArray<readonly [number, number]>;
  /**
   * Normalised screen-space corners of the BOTTOM face (ground level),
   * same corner order as topFace.
   */
  bottomFace: ReadonlyArray<readonly [number, number]>;
  /** Normalised screen-space centre of the equipment (top face centroid). */
  cx: number;
  cy: number;
  /** False when the item is behind the camera or projects outside reasonable bounds. */
  visible: boolean;
}

/**
 * Return the world-space centre of the equipment top face.
 * Replicates the transform in Equipment3D.tsx (including transformer INSERT offset).
 */
function getWorldCenter(
  item: ElectricalComponent,
  centerOffset: { x: number; z: number },
): { x: number; y: number; z: number } {
  const dims = EQUIPMENT_DIMS[item.type] ?? { width: 1, height: 1, depth: 1 };
  const isTransformer = item.type === 'transformer';
  return {
    x: item.position[0] + (isTransformer ? 4.5 : 0) + centerOffset.x,
    y: dims.height,
    z: -item.position[1] + (isTransformer ? 7 : 0) + centerOffset.z,
  };
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
    const wc   = getWorldCenter(item, centerOffset);

    const hw = dims.width  / 2;
    const hd = dims.depth  / 2;

    // Top-face corners: TL, TR, BR, BL (clockwise from above)
    // TL = left-front (−x, −z), TR = right-front (+x, −z)
    // BR = right-back  (+x, +z), BL = left-back  (−x, +z)
    const topWorldCorners = [
      new THREE.Vector3(wc.x - hw, wc.y, wc.z - hd),
      new THREE.Vector3(wc.x + hw, wc.y, wc.z - hd),
      new THREE.Vector3(wc.x + hw, wc.y, wc.z + hd),
      new THREE.Vector3(wc.x - hw, wc.y, wc.z + hd),
    ];

    // Bottom-face corners at ground level (y = 0), same order
    const botWorldCorners = [
      new THREE.Vector3(wc.x - hw, 0, wc.z - hd),
      new THREE.Vector3(wc.x + hw, 0, wc.z - hd),
      new THREE.Vector3(wc.x + hw, 0, wc.z + hd),
      new THREE.Vector3(wc.x - hw, 0, wc.z + hd),
    ];

    const topScreen = topWorldCorners.map(c => project(c, camera));
    const botScreen = botWorldCorners.map(c => project(c, camera));
    const center    = project(new THREE.Vector3(wc.x, wc.y, wc.z), camera);

    // Visible = center and all top corners project in front of the camera.
    // Bottom corners are not required — if they fail we fall back to the
    // corresponding top corner so the box still renders (flat but visible).
    const visible =
      center !== null &&
      topScreen.every(c => c !== null);

    // Safe bottom face: fall back to top corner if ground corner is behind camera
    const safeBot: Array<[number, number]> = botScreen.map(
      (c, i) => c ?? (topScreen[i] as [number, number]),
    );

    results.push({
      id:         item.id,
      type:       item.type as 'inverter' | 'transformer' | 'combiner',
      topFace:    topScreen as ReadonlyArray<readonly [number, number]>,
      bottomFace: safeBot   as ReadonlyArray<readonly [number, number]>,
      cx:         center?.[0] ?? 0,
      cy:         center?.[1] ?? 0,
      visible,
    });
  }

  return results;
}
