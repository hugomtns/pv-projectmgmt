import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Site, SiteCoordinate } from '@/lib/types';
import { squareMetersToAcres } from '@/lib/kml/parser';

interface SiteTerrainViewProps {
  site: Site;
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
  const z = -(coord.lat - centroid.latitude) * metersPerDegreeLat; // negate so north is -Z (towards camera)
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

  // Gradient: dark green (low) -> light green -> yellow-brown (high)
  const r = 0.2 + t * 0.6;
  const g = 0.6 - t * 0.2;
  const b = 0.15 + t * 0.1;

  return new THREE.Color(r, g, b);
}

/**
 * Build a triangulated mesh from polygon coordinates with elevation.
 * Uses ear-clipping triangulation for the polygon.
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
    // Remove closing point if duplicated
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

    // Build vertices and colors
    const vertices: number[] = [];
    const colors: number[] = [];

    for (const [x, y, z] of localPoints) {
      vertices.push(x, y, z);
      const elev = y + elevationBase;
      const color = getElevationColor(
        elev,
        elevationRange.min,
        elevationRange.max
      );
      colors.push(color.r, color.g, color.b);
    }

    // Triangulate using fan from centroid (works for convex and mostly-convex polygons)
    // For better results on complex polygons, could use earcut, but fan is sufficient here
    const centerX =
      localPoints.reduce((s, p) => s + p[0], 0) / localPoints.length;
    const centerY =
      localPoints.reduce((s, p) => s + p[1], 0) / localPoints.length;
    const centerZ =
      localPoints.reduce((s, p) => s + p[2], 0) / localPoints.length;

    // Add center vertex
    const centerIdx = localPoints.length;
    vertices.push(centerX, centerY, centerZ);
    const centerElev = centerY + elevationBase;
    const centerColor = getElevationColor(
      centerElev,
      elevationRange.min,
      elevationRange.max
    );
    colors.push(centerColor.r, centerColor.g, centerColor.b);

    // Build triangles from center to each edge
    const indices: number[] = [];
    for (let i = 0; i < localPoints.length; i++) {
      const next = (i + 1) % localPoints.length;
      indices.push(centerIdx, i, next);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
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
      (c) =>
        toLocalCoords(c, centroid, elevationBase) as [number, number, number]
    );
    // Close the loop
    if (pts.length > 0) {
      pts.push(pts[0]);
    }
    // Slight offset above the mesh to avoid z-fighting
    return pts.map(([x, y, z]) => [x, y + 0.3, z] as [number, number, number]);
  }, [coordinates, centroid, elevationBase]);

  if (points.length < 2) return null;

  return <Line points={points} color={color} lineWidth={2} />;
}

/**
 * Elevation label at a vertex
 */
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

// Exclusion zone colors matching SiteMapPreview
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

export function SiteTerrainView({ site }: SiteTerrainViewProps) {
  const centroid = site.centroid || { latitude: 0, longitude: 0 };
  const elevationBase = site.elevationRange?.min ?? 0;
  const elevationRange = site.elevationRange ?? { min: 0, max: 0 };

  // Calculate scene size for grid and camera
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

  // Determine elevation labels — show min, max, and a few intermediate vertices
  const elevationLabels = useMemo(() => {
    const labels: Array<{ position: [number, number, number]; elevation: number }> = [];
    const allCoords = site.boundaries.flatMap((b) => b.coordinates);
    const withElev = allCoords.filter((c) => c.elevation != null);

    if (withElev.length === 0) return labels;

    // Find min and max elevation vertices
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

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border bg-slate-900">
      <Canvas
        camera={{
          position: [sceneExtent * 0.7, sceneExtent * 0.5, sceneExtent * 0.7],
          fov: 50,
          near: 0.1,
          far: sceneExtent * 10,
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 100, 50]} intensity={0.8} />

        {/* Ground grid */}
        <Grid
          args={[sceneExtent * 4, sceneExtent * 4]}
          cellSize={sceneExtent / 10}
          sectionSize={sceneExtent / 2}
          cellColor="#444444"
          sectionColor="#666666"
          fadeDistance={sceneExtent * 3}
          position={[0, -0.1, 0]}
        />

        {/* Boundary surfaces */}
        {site.boundaries.map((b) => (
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

        {/* Exclusion zone outlines */}
        {site.exclusionZones.map((ez) => (
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

      {/* Info overlay */}
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur rounded-lg p-3 text-xs z-[10] shadow-lg border">
        <div className="font-medium">{site.name}</div>
        {site.totalArea != null && site.totalArea > 0 && (
          <div className="text-muted-foreground mt-1">
            {squareMetersToAcres(site.totalArea).toFixed(1)} acres
          </div>
        )}
        {site.elevationRange && (
          <div className="text-muted-foreground mt-1">
            Elevation: {site.elevationRange.min.toFixed(0)}&ndash;
            {site.elevationRange.max.toFixed(0)}m
          </div>
        )}
        <div className="border-t mt-2 pt-1.5 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-green-500 rounded" />
            Boundary
          </div>
          {site.exclusionZones.length > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-3 h-0.5 bg-red-400 rounded" />
              Exclusions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
