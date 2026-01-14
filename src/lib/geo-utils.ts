/**
 * Geo utilities for location picker components
 * Consolidates shared code between LocationPicker and LocationMapSheet
 */

import { LatLng, LatLngBounds, Icon } from 'leaflet';

/**
 * Default Leaflet marker icon configuration
 * Fix for default marker icon in react-leaflet
 */
export const DEFAULT_LEAFLET_ICON = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Calculate rectangle bounds from center point and size in meters
 * Used to display ground area on map
 */
export function calculateBounds(center: LatLng, sizeMeters: number): LatLngBounds {
  // Approximate meters per degree at the equator
  // 1 degree latitude ≈ 111,139 meters
  // 1 degree longitude varies with latitude
  const metersPerDegreeLat = 111139;
  const metersPerDegreeLon = 111139 * Math.cos(center.lat * Math.PI / 180);

  const halfSizeLat = (sizeMeters / 2) / metersPerDegreeLat;
  const halfSizeLon = (sizeMeters / 2) / metersPerDegreeLon;

  return new LatLngBounds(
    [center.lat - halfSizeLat, center.lng - halfSizeLon],
    [center.lat + halfSizeLat, center.lng + halfSizeLon]
  );
}

/**
 * Result from OpenStreetMap Nominatim geocoding API
 */
export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Search for addresses using OpenStreetMap Nominatim API
 * Free, no API key required
 */
export async function searchAddress(query: string, limit = 5): Promise<NominatimResult[]> {
  if (query.length < 3) return [];

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}

/**
 * Default map center (San Francisco) when no coordinates provided
 */
export const DEFAULT_MAP_CENTER = {
  latitude: 37.7749,
  longitude: -122.4194,
} as const;

/**
 * Default ground size in meters for satellite imagery
 */
export const DEFAULT_GROUND_SIZE = 400;
