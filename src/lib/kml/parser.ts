import type {
  SiteBoundary,
  SiteExclusionZone,
  ExclusionZoneType,
  KMLParseResult,
} from '@/lib/types/site';

/**
 * Parse KML file content and extract site boundaries and exclusion zones
 */
export async function parseKMLFile(content: string): Promise<KMLParseResult> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'application/xml');

  // Check for parsing errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid KML file: ' + parseError.textContent);
  }

  const boundaries: SiteBoundary[] = [];
  const exclusionZones: SiteExclusionZone[] = [];

  // Find all Placemark elements
  const placemarks = doc.querySelectorAll('Placemark');

  placemarks.forEach((placemark) => {
    const name = placemark.querySelector('name')?.textContent || 'Unnamed';
    const description = placemark.querySelector('description')?.textContent || '';

    // Process Polygon elements
    const polygons = placemark.querySelectorAll('Polygon');
    polygons.forEach((polygon) => {
      const coordinates = extractPolygonCoordinates(polygon);
      if (coordinates.length > 0) {
        const area = calculatePolygonArea(coordinates);
        const zoneType = detectZoneType(name, description);

        if (zoneType) {
          exclusionZones.push({
            id: crypto.randomUUID(),
            name,
            type: zoneType,
            coordinates,
            area,
            description: description || undefined,
          });
        } else {
          boundaries.push({
            id: crypto.randomUUID(),
            name,
            coordinates,
            area,
          });
        }
      }
    });

    // If no Polygon found, check for LinearRing directly (some KML files)
    if (polygons.length === 0) {
      const outerBoundary = placemark.querySelector(
        'outerBoundaryIs LinearRing coordinates'
      );
      if (outerBoundary) {
        const coordinates = parseCoordinateString(outerBoundary.textContent || '');
        if (coordinates.length > 0) {
          const area = calculatePolygonArea(coordinates);
          const zoneType = detectZoneType(name, description);

          if (zoneType) {
            exclusionZones.push({
              id: crypto.randomUUID(),
              name,
              type: zoneType,
              coordinates,
              area,
              description: description || undefined,
            });
          } else {
            boundaries.push({
              id: crypto.randomUUID(),
              name,
              coordinates,
              area,
            });
          }
        }
      }
    }
  });

  // Calculate centroid from all boundary coordinates
  const centroid = calculateCentroid(boundaries);
  const totalArea = boundaries.reduce((sum, b) => sum + (b.area || 0), 0);

  console.log('[KML Parser] Parsed results:', {
    placemarkCount: placemarks.length,
    boundaries: boundaries.length,
    exclusionZones: exclusionZones.length,
    totalArea: squareMetersToAcres(totalArea).toFixed(1) + ' acres',
  });

  return {
    boundaries,
    exclusionZones,
    centroid,
    totalArea,
  };
}

/**
 * Parse KMZ file (zipped KML)
 */
export async function parseKMZFile(file: File): Promise<KMLParseResult> {
  // KMZ is a ZIP file containing doc.kml
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  // Find the KML file (usually doc.kml or *.kml)
  let kmlContent: string | null = null;

  for (const fileName of Object.keys(zip.files)) {
    if (fileName.toLowerCase().endsWith('.kml')) {
      kmlContent = await zip.files[fileName].async('string');
      break;
    }
  }

  if (!kmlContent) {
    throw new Error('No KML file found in KMZ archive');
  }

  return parseKMLFile(kmlContent);
}

/**
 * Extract coordinates from a Polygon element
 */
function extractPolygonCoordinates(
  polygon: Element
): Array<{ lat: number; lng: number }> {
  const outerBoundary = polygon.querySelector(
    'outerBoundaryIs LinearRing coordinates'
  );
  if (!outerBoundary) {
    // Try alternative structure
    const coordinates = polygon.querySelector('coordinates');
    if (coordinates) {
      return parseCoordinateString(coordinates.textContent || '');
    }
    return [];
  }
  return parseCoordinateString(outerBoundary.textContent || '');
}

/**
 * Parse KML coordinate string (lng,lat,elevation format)
 */
function parseCoordinateString(
  coordString: string
): Array<{ lat: number; lng: number }> {
  const coordinates: Array<{ lat: number; lng: number }> = [];

  // KML format: "lng,lat,elevation lng,lat,elevation ..."
  // Coordinates are separated by whitespace (spaces, newlines, tabs)
  const coordPairs = coordString.trim().split(/\s+/);

  for (const pair of coordPairs) {
    const parts = pair.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        coordinates.push({ lat, lng });
      }
    }
  }

  return coordinates;
}

/**
 * Detect if placemark represents an exclusion zone based on name/description
 */
function detectZoneType(
  name: string,
  description: string
): ExclusionZoneType | null {
  const text = (name + ' ' + description).toLowerCase();

  if (text.includes('wetland') || text.includes('marsh') || text.includes('swamp')) {
    return 'wetland';
  }
  if (text.includes('setback') || text.includes('buffer')) {
    return 'setback';
  }
  if (text.includes('easement') || text.includes('right-of-way') || text.includes('row')) {
    return 'easement';
  }
  if (text.includes('slope') || text.includes('steep') || text.includes('grade')) {
    return 'slope';
  }
  if (text.includes('flood') || text.includes('floodplain') || text.includes('fema')) {
    return 'flood_zone';
  }
  if (
    text.includes('exclusion') ||
    text.includes('exclude') ||
    text.includes('restricted') ||
    text.includes('no-build')
  ) {
    return 'other';
  }

  return null;
}

/**
 * Calculate polygon area using Shoelace formula (in square meters, approximate)
 */
function calculatePolygonArea(
  coordinates: Array<{ lat: number; lng: number }>
): number {
  if (coordinates.length < 3) return 0;

  // Convert to meters using equirectangular approximation
  const metersPerDegreeLat = 111139;
  const centerLat =
    coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
  const metersPerDegreeLng = 111139 * Math.cos((centerLat * Math.PI) / 180);

  let area = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    const xi = coordinates[i].lng * metersPerDegreeLng;
    const yi = coordinates[i].lat * metersPerDegreeLat;
    const xj = coordinates[j].lng * metersPerDegreeLng;
    const yj = coordinates[j].lat * metersPerDegreeLat;
    area += xi * yj - xj * yi;
  }

  return Math.abs(area / 2);
}

/**
 * Calculate centroid of all boundaries
 */
function calculateCentroid(
  boundaries: SiteBoundary[]
): { latitude: number; longitude: number } | undefined {
  if (boundaries.length === 0) return undefined;

  let totalLat = 0;
  let totalLng = 0;
  let totalPoints = 0;

  for (const boundary of boundaries) {
    for (const coord of boundary.coordinates) {
      totalLat += coord.lat;
      totalLng += coord.lng;
      totalPoints++;
    }
  }

  if (totalPoints === 0) return undefined;

  return {
    latitude: totalLat / totalPoints,
    longitude: totalLng / totalPoints,
  };
}

/**
 * Main entry point for parsing KML or KMZ files
 */
export async function parseSiteFile(file: File): Promise<KMLParseResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.kmz')) {
    return parseKMZFile(file);
  } else if (fileName.endsWith('.kml')) {
    const content = await file.text();
    return parseKMLFile(content);
  } else {
    throw new Error('Unsupported file type. Please upload a KML or KMZ file.');
  }
}

/**
 * Convert area in square meters to acres
 */
export function squareMetersToAcres(sqMeters: number): number {
  return sqMeters / 4046.86;
}

/**
 * Convert area in square meters to hectares
 */
export function squareMetersToHectares(sqMeters: number): number {
  return sqMeters / 10000;
}

/**
 * Format area for display (acres with appropriate precision)
 */
export function formatAreaAcres(sqMeters: number): string {
  const acres = squareMetersToAcres(sqMeters);
  if (acres < 1) {
    return acres.toFixed(2);
  } else if (acres < 10) {
    return acres.toFixed(1);
  } else {
    return Math.round(acres).toString();
  }
}
