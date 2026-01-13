import { useTexture } from '@react-three/drei';
import { Suspense } from 'react';
import type { GPSCoordinates } from '@/lib/types';
import {
  getArcGISSatelliteURL,
  getTileSizeInMeters,
  DEFAULT_SATELLITE_ZOOM,
} from '@/lib/satelliteImagery';

interface SatelliteGroundProps {
  gpsCoordinates: GPSCoordinates;
  zoom?: number;
}

/**
 * SatelliteTexturedPlane - Internal component that loads and displays the satellite texture
 */
function SatelliteTexturedPlane({ gpsCoordinates, zoom = DEFAULT_SATELLITE_ZOOM }: SatelliteGroundProps) {
  const tileURL = getArcGISSatelliteURL(
    gpsCoordinates.latitude,
    gpsCoordinates.longitude,
    zoom
  );

  // Calculate the real-world size of the tile
  const tileSizeMeters = getTileSizeInMeters(gpsCoordinates.latitude, zoom);

  // Load the satellite texture
  const texture = useTexture(tileURL);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[tileSizeMeters, tileSizeMeters]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

/**
 * FallbackPlane - Simple gray plane shown while loading or on error
 */
function FallbackPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#3a3a3a" />
    </mesh>
  );
}

/**
 * SatelliteGround - Ground plane with satellite imagery overlay
 *
 * Displays satellite imagery from ArcGIS World Imagery service based on GPS coordinates.
 * Falls back to a gray plane if loading fails or no coordinates provided.
 */
export function SatelliteGround({ gpsCoordinates, zoom }: SatelliteGroundProps) {
  return (
    <Suspense fallback={<FallbackPlane />}>
      <SatelliteTexturedPlane gpsCoordinates={gpsCoordinates} zoom={zoom} />
    </Suspense>
  );
}
