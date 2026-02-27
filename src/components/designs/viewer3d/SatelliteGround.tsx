import { useTexture } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import type { GPSCoordinates } from '@/lib/types';
import {
  getTileSizeInMeters,
  DEFAULT_SATELLITE_ZOOM,
  getSurroundingTileURLs,
} from '@/lib/satelliteImagery';

interface SatelliteGroundProps {
  gpsCoordinates: GPSCoordinates;
  zoom?: number;
  groundSizeMeters?: number;
}

/**
 * SatelliteTexturedPlane - Internal component that loads and displays the satellite texture
 */
function SatelliteTexturedPlane({
  gpsCoordinates,
  zoom = DEFAULT_SATELLITE_ZOOM,
  groundSizeMeters,
}: SatelliteGroundProps) {
  // Calculate the real-world size of a single tile at this zoom level
  const tileSizeMeters = getTileSizeInMeters(gpsCoordinates.latitude, zoom);

  // Determine how many tiles we need to cover the requested ground size
  const gridSize = useMemo(() => {
    if (!groundSizeMeters) return 1;
    const tilesNeeded = Math.ceil(groundSizeMeters / tileSizeMeters);
    if (tilesNeeded <= 1) return 1;
    // Round up to nearest odd number for symmetric grid
    const odd = tilesNeeded % 2 === 0 ? tilesNeeded + 1 : tilesNeeded;
    return odd;
  }, [groundSizeMeters, tileSizeMeters]);

  // Calculate final ground plane size
  const finalSize = groundSizeMeters || tileSizeMeters;

  // Get tile URLs for the grid
  const tiles = useMemo(() => {
    return getSurroundingTileURLs(
      gpsCoordinates.latitude,
      gpsCoordinates.longitude,
      zoom,
      gridSize
    );
  }, [gpsCoordinates.latitude, gpsCoordinates.longitude, zoom, gridSize]);

  // For single tile, use simple approach
  if (gridSize === 1) {
    return <SingleTilePlane url={tiles[0].url} size={finalSize} />;
  }

  // For multi-tile grid, render each tile in its position
  const tileSize = finalSize / gridSize;

  return (
    <group>
      {tiles.map((tile, index) => (
        <SingleTilePlane
          key={index}
          url={tile.url}
          size={tileSize}
          position={[
            tile.offsetX * tileSize,
            -0.01,
            tile.offsetY * tileSize,
          ]}
        />
      ))}
    </group>
  );
}

/**
 * SingleTilePlane - Renders a single satellite tile
 */
function SingleTilePlane({
  url,
  size,
  position = [0, -0.01, 0],
}: {
  url: string;
  size: number;
  position?: [number, number, number];
}) {
  const texture = useTexture(url);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

/**
 * FallbackPlane - Simple gray plane shown while loading or on error
 */
function FallbackPlane({ size = 200 }: { size?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#3a3a3a" />
    </mesh>
  );
}

/**
 * SatelliteGround - Ground plane with satellite imagery overlay
 *
 * Displays satellite imagery from ArcGIS World Imagery service based on GPS coordinates.
 * Supports configurable ground plane size with automatic multi-tile loading.
 * Falls back to a gray plane if loading fails or no coordinates provided.
 */
export function SatelliteGround({ gpsCoordinates, zoom, groundSizeMeters }: SatelliteGroundProps) {
  return (
    <Suspense fallback={<FallbackPlane size={groundSizeMeters} />}>
      <SatelliteTexturedPlane
        gpsCoordinates={gpsCoordinates}
        zoom={zoom}
        groundSizeMeters={groundSizeMeters}
      />
    </Suspense>
  );
}
