import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Site, SiteCoordinate, ExclusionZoneType } from '@/lib/types';

interface SiteTerrainViewProps {
  site: Site;
  /** Layer visibility — boundaries and exclusion types can be toggled */
  visibility: { boundaries: boolean } & Record<ExclusionZoneType, boolean>;
}

/**
 * Convert lat/lng/elevation coordinates to local meters relative to a centroid.
 * X = east-west (lng), Z = north-south (lat), Y = elevation.
 */
function toLocalCoords(
  coord: SiteCoordinate,
  centroid: { latitude: number; longitude: number },
  elevationBase: number
): [number, number, number] {
  const metersPerDegreeLat = 111139;
  const metersPerDegreeLng =
    111139 * Math.cos((centroid.latitude * Math.PI) / 180);

  const x = (coord.lng - centroid.longitude) * metersPerDegreeLng;
  const z = -(coord.lat - centroid.latitude) * metersPerDegreeLat;
  const y = (coord.elevation ?? elevationBase) - elevationBase;

  return [x, y, z];
}

/**
 * Get color for an elevation value using a green-to-brown gradient
 */
function getElevationColor(
  elevation: number,
  min: number,
  max: number
): THREE.Color {
  const range = max - min;
  const t = range > 0 ? (elevation - min) / range : 0.5;

  const r = 0.2 + t * 0.6;
  const g = 0.6 - t * 0.2;
  const b = 0.15 + t * 0.1;

  return new THREE.Color(r, g, b);
}

/**
 * Build a triangulated mesh from polygon coordinates with elevation.
 */
function BoundaryMesh({
  coordinates,
  centroid,
  elevationBase,
  elevationRange,
}: {
  coordinates: SiteCoordinate[];
  centroid: { latitude: number; longitude: number };
  elevationBase: number;
  elevationRange: { min: number; max: number };
}) {
  const geometry = useMemo(() => {
    const coords = coordinates.slice();
    if (
      coords.length > 1 &&
      coords[0].lat === coords[coords.length - 1].lat &&
      coords[0].lng === coords[coords.length - 1].lng
    ) {
      coords.pop();
    }

    if (coords.length < 3) return null;

    const localPoints = coords.map((c) =>
      toLocalCoords(c, centroid, elevationBase)
    );

    const vertices: number[] = [];
    const colors: number[] = [];

    for (const [x, y, z] of localPoints) {
      vertices.push(x, y, z);
      const elev = y + elevationBase;
      const color = getElevationColor(elev, elevationRange.min, elevationRange.max);
      colors.push(color.r, color.g, color.b);
    }

    const centerX = localPoints.reduce((s, p) => s + p[0], 0) / localPoints.length;
    const centerY = localPoints.reduce((s, p) => s + p[1], 0) / localPoints.length;
    const centerZ = localPoints.reduce((s, p) => s + p[2], 0) / localPoints.length;

    const centerIdx = localPoints.length;
    vertices.push(centerX, centerY, centerZ);
    const centerColor = getElevationColor(
      centerY + elevationBase,
      elevationRange.min,
      elevationRange.max
    );
    colors.push(centerColor.r, centerColor.g, centerColor.b);

    const indices: number[] = [];
    for (let i = 0; i < localPoints.length; i++) {
      const next = (i + 1) % localPoints.length;
      indices.push(centerIdx, i, next);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return geom;
  }, [coordinates, centroid, elevationBase, elevationRange]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}

/**
 * Render boundary outline as a 3D line
 */
function BoundaryOutline({
  coordinates,
  centroid,
  elevationBase,
  color = '#22c55e',
}: {
  coordinates: SiteCoordinate[];
  centroid: { latitude: number; longitude: number };
  elevationBase: number;
  color?: string;
}) {
  const points = useMemo(() => {
    const pts = coordinates.map(
      (c) => toLocalCoords(c, centroid, elevationBase) as [number, number, number]
    );
    if (pts.length > 0) {
      pts.push(pts[0]);
    }
    return pts.map(([x, y, z]) => [x, y + 0.3, z] as [number, number, number]);
  }, [coordinates, centroid, elevationBase]);

  if (points.length < 2) return null;

  return <Line points={points} color={color} lineWidth={2} />;
}

function ElevationLabel({
  position,
  elevation,
}: {
  position: [number, number, number];
  elevation: number;
}) {
  return (
    <Text
      position={[position[0], position[1] + 2, position[2]]}
      fontSize={1.5}
      color="#ffffff"
      anchorX="center"
      anchorY="bottom"
      outlineWidth={0.1}
      outlineColor="#000000"
    >
      {elevation.toFixed(0)}m
    </Text>
  );
}

const EXCLUSION_3D_COLORS: Record<string, string> = {
  wetland: '#3b82f6',
  setback: '#f59e0b',
  easement: '#8b5cf6',
  slope: '#ef4444',
  flood_zone: '#06b6d4',
  tree_cover: '#22c55e',
  structure: '#ec4899',
  water_body: '#0ea5e9',
  other: '#6b7280',
};

/**
 * Pure Three.js terrain canvas — no overlays.
 * All UI overlays (stats, layers, toggle) are rendered by the parent SiteMapPreview.
 */
export function SiteTerrainView({ site, visibility }: SiteTerrainViewProps) {
  const centroid = site.centroid || { latitude: 0, longitude: 0 };
  const elevationBase = site.elevationRange?.min ?? 0;
  const elevationRange = site.elevationRange ?? { min: 0, max: 0 };

  const sceneExtent = useMemo(() => {
    let maxDist = 50;
    for (const b of site.boundaries) {
      for (const c of b.coordinates) {
        const [x, , z] = toLocalCoords(c, centroid, elevationBase);
        maxDist = Math.max(maxDist, Math.abs(x), Math.abs(z));
      }
    }
    return maxDist * 1.5;
  }, [site.boundaries, centroid, elevationBase]);

  const elevationLabels = useMemo(() => {
    const labels: Array<{ position: [number, number, number]; elevation: number }> = [];
    const allCoords = site.boundaries.flatMap((b) => b.coordinates);
    const withElev = allCoords.filter((c) => c.elevation != null);

    if (withElev.length === 0) return labels;

    let minCoord = withElev[0];
    let maxCoord = withElev[0];
    for (const c of withElev) {
      if (c.elevation! < minCoord.elevation!) minCoord = c;
      if (c.elevation! > maxCoord.elevation!) maxCoord = c;
    }

    labels.push({
      position: toLocalCoords(minCoord, centroid, elevationBase),
      elevation: minCoord.elevation!,
    });

    if (maxCoord !== minCoord) {
      labels.push({
        position: toLocalCoords(maxCoord, centroid, elevationBase),
        elevation: maxCoord.elevation!,
      });
    }

    return labels;
  }, [site.boundaries, centroid, elevationBase]);

  // Filter exclusions by visibility
  const visibleExclusions = site.exclusionZones.filter((ez) => visibility[ez.type]);

  return (
    <Canvas
      className="h-full w-full"
      style={{ background: '#0f172a' }}
      camera={{
        position: [sceneExtent * 0.7, sceneExtent * 0.5, sceneExtent * 0.7],
        fov: 50,
        near: 0.1,
        far: sceneExtent * 10,
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 100, 50]} intensity={0.8} />

      <Grid
        args={[sceneExtent * 4, sceneExtent * 4]}
        cellSize={sceneExtent / 10}
        sectionSize={sceneExtent / 2}
        cellColor="#444444"
        sectionColor="#666666"
        fadeDistance={sceneExtent * 3}
        position={[0, -0.1, 0]}
      />

      {/* Boundary surfaces (respects visibility) */}
      {visibility.boundaries && site.boundaries.map((b) => (
        <group key={b.id}>
          <BoundaryMesh
            coordinates={b.coordinates}
            centroid={centroid}
            elevationBase={elevationBase}
            elevationRange={elevationRange}
          />
          <BoundaryOutline
            coordinates={b.coordinates}
            centroid={centroid}
            elevationBase={elevationBase}
            color="#22c55e"
          />
        </group>
      ))}

      {/* Exclusion zone outlines (respects visibility) */}
      {visibleExclusions.map((ez) => (
        <BoundaryOutline
          key={ez.id}
          coordinates={ez.coordinates}
          centroid={centroid}
          elevationBase={elevationBase}
          color={EXCLUSION_3D_COLORS[ez.type] || EXCLUSION_3D_COLORS.other}
        />
      ))}

      {/* Elevation labels */}
      {elevationLabels.map((label, i) => (
        <ElevationLabel
          key={i}
          position={label.position}
          elevation={label.elevation}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
