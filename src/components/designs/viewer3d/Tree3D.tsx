/**
 * Tree3D - Renders 3D trees for shading analysis visualization
 *
 * Trees consist of:
 * - Trunk: Brown cylinder
 * - Crown: Green sphere (simple) or cone (conical)
 */

import { useMemo } from 'react';
import { Color, DoubleSide } from 'three';
import type { TreeGeometry } from '@/lib/dxf/types';

interface Tree3DProps {
  trees: TreeGeometry[];
}

// Tree colors
const TRUNK_COLOR = new Color('#8B4513'); // Saddle brown
const CROWN_COLOR = new Color('#228B22'); // Forest green

export function Tree3D({ trees }: Tree3DProps) {
  if (trees.length === 0) return null;

  return (
    <group>
      {trees.map((tree) => (
        <TreeModel key={tree.id} tree={tree} />
      ))}
    </group>
  );
}

interface TreeModelProps {
  tree: TreeGeometry;
}

function TreeModel({ tree }: TreeModelProps) {
  // Calculate positions
  // DXF X,Y -> Three.js X,Z (Y negated)
  const basePosition: [number, number, number] = [
    tree.position[0],
    0,
    -tree.position[1],
  ];

  // Trunk position: centered at half trunk height
  const trunkPosition: [number, number, number] = [
    basePosition[0],
    tree.trunkHeight / 2,
    basePosition[2],
  ];

  // Crown position: at top of trunk + half crown height
  // For sphere: center at trunk top + radius
  // For cone: base at trunk top
  const crownCenterHeight = useMemo(() => {
    if (tree.treeType === 'conical') {
      // Cone base at trunk top, so center is at trunk height + half cone height
      return tree.trunkHeight + tree.crownHeight / 2;
    }
    // Sphere center at trunk top + radius (which is crownHeight/2 for spherical crown)
    return tree.trunkHeight + tree.crownHeight / 2;
  }, [tree.treeType, tree.trunkHeight, tree.crownHeight]);

  const crownPosition: [number, number, number] = [
    basePosition[0],
    crownCenterHeight,
    basePosition[2],
  ];

  return (
    <group>
      {/* Trunk - cylinder */}
      <mesh position={trunkPosition} castShadow receiveShadow>
        <cylinderGeometry
          args={[
            tree.trunkDiameter / 2, // radiusTop
            tree.trunkDiameter / 2, // radiusBottom
            tree.trunkHeight,       // height
            12,                     // radialSegments
          ]}
        />
        <meshStandardMaterial
          color={TRUNK_COLOR}
          roughness={0.9}
          metalness={0.1}
          side={DoubleSide}
        />
      </mesh>

      {/* Crown - sphere or cone based on tree type */}
      {tree.treeType === 'conical' ? (
        <ConicalCrown
          position={crownPosition}
          diameter={tree.crownDiameter}
          height={tree.crownHeight}
        />
      ) : (
        <SphericalCrown
          position={crownPosition}
          diameter={tree.crownDiameter}
          height={tree.crownHeight}
        />
      )}
    </group>
  );
}

interface CrownProps {
  position: [number, number, number];
  diameter: number;
  height: number;
}

function SphericalCrown({ position, diameter, height }: CrownProps) {
  // Use an ellipsoid (scaled sphere) for non-uniform crown dimensions
  const scaleY = height / diameter;

  return (
    <mesh position={position} castShadow receiveShadow scale={[1, scaleY, 1]}>
      <sphereGeometry args={[diameter / 2, 16, 12]} />
      <meshStandardMaterial
        color={CROWN_COLOR}
        roughness={0.8}
        metalness={0.0}
        side={DoubleSide}
      />
    </mesh>
  );
}

function ConicalCrown({ position, diameter, height }: CrownProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <coneGeometry
        args={[
          diameter / 2, // radius (base)
          height,       // height
          16,           // radialSegments
        ]}
      />
      <meshStandardMaterial
        color={CROWN_COLOR}
        roughness={0.8}
        metalness={0.0}
        side={DoubleSide}
      />
    </mesh>
  );
}
