/**
 * Satellite Imagery Utilities
 *
 * Generates tile URLs for satellite imagery from various providers.
 * Uses Web Mercator projection (EPSG:3857) for tile calculations.
 */

export interface TileCoordinates {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Convert GPS coordinates to tile coordinates using Web Mercator projection
 */
export function getTileCoordinates(lat: number, lon: number, zoom: number): TileCoordinates {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);

  return { x, y, zoom };
}

/**
 * Get the bounds of a tile in GPS coordinates
 */
export function getTileBounds(x: number, y: number, zoom: number): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  const n = Math.pow(2, zoom);

  const west = x / n * 360 - 180;
  const east = (x + 1) / n * 360 - 180;

  const north = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  const south = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;

  return { north, south, east, west };
}

/**
 * Calculate the approximate meters per pixel at a given latitude and zoom level
 */
export function getMetersPerPixel(lat: number, zoom: number): number {
  // Earth's circumference at equator in meters
  const earthCircumference = 40075016.686;
  // Formula: circumference * cos(lat) / (2^zoom * tileSize)
  // Since tileSize = 256 = 2^8, this simplifies to: circumference * cos(lat) / 2^(zoom+8)
  return earthCircumference * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom + 8);
}

/**
 * Get ArcGIS World Imagery tile URL (free, no API key required)
 * Provides high-resolution satellite imagery worldwide
 */
export function getArcGISSatelliteURL(lat: number, lon: number, zoom: number): string {
  const { x, y } = getTileCoordinates(lat, lon, zoom);
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
}

/**
 * Get multiple tile URLs for a grid around a center point
 * Useful for covering larger areas
 */
export function getSurroundingTileURLs(
  lat: number,
  lon: number,
  zoom: number,
  gridSize: 1 | 3 | 5 = 3
): { url: string; offsetX: number; offsetY: number }[] {
  const { x, y } = getTileCoordinates(lat, lon, zoom);
  const tiles: { url: string; offsetX: number; offsetY: number }[] = [];

  const halfGrid = Math.floor(gridSize / 2);

  for (let dy = -halfGrid; dy <= halfGrid; dy++) {
    for (let dx = -halfGrid; dx <= halfGrid; dx++) {
      const tileX = x + dx;
      const tileY = y + dy;
      tiles.push({
        url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`,
        offsetX: dx,
        offsetY: dy,
      });
    }
  }

  return tiles;
}

/**
 * Calculate the real-world size of a tile in meters at a given latitude
 */
export function getTileSizeInMeters(lat: number, zoom: number): number {
  const metersPerPixel = getMetersPerPixel(lat, zoom);
  return metersPerPixel * 256; // Standard tile is 256x256 pixels
}

/**
 * Default zoom level for PV layouts
 * Zoom 18 provides ~0.5m/pixel resolution which is good for panel-level detail
 * Zoom 19 provides ~0.25m/pixel for even more detail
 */
export const DEFAULT_SATELLITE_ZOOM = 18;
