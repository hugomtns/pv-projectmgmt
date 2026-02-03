import type {
  SiteCoordinate,
  SiteBoundary,
  SiteExclusionZone,
  ExclusionZoneType,
  KMLParseResult,
} from '@/lib/types/site';

/**
 * Get the folder path for a placemark by traversing up the DOM tree
 * Returns array of folder names from root to placemark
 */
function getFolderPath(placemark: Element): string[] {
  const path: string[] = [];
  let parent = placemark.parentElement;

  while (parent) {
    if (parent.tagName === 'Folder') {
      const folderName = parent.querySelector(':scope > name')?.textContent;
      if (folderName) {
        path.unshift(folderName.toLowerCase());
      }
    }
    parent = parent.parentElement;
  }

  return path;
}

/**
 * Determine how to categorize a placemark based on its folder path
 * Returns: 'boundary' | 'exclusion' | 'skip' | null (for unknown)
 */
function categorizeByFolderPath(
  folderPath: string[]
): 'boundary' | 'exclusion' | 'skip' | null {
  // Skip buildable area polygons (pre-calculated results)
  if (folderPath.some(f => f.includes('buildable'))) {
    return 'skip';
  }

  // Skip "Exclusion Setback Area" - these are buffer zones already accounted for
  if (folderPath.some(f => f.includes('setback area') || f === 'exclusion setback area')) {
    return 'skip';
  }

  // Parcel boundaries
  if (folderPath.some(f => f.includes('parcel boundary') || f === 'parcel boundary')) {
    return 'boundary';
  }

  // Exclusion drawings folder
  if (folderPath.some(f => f.includes('exclusion'))) {
    return 'exclusion';
  }

  return null; // Unknown - will use name-based detection
}

/**
 * Detect exclusion type from folder path
 */
function detectZoneTypeFromFolder(folderPath: string[]): ExclusionZoneType | null {
  // Check the immediate parent folder name for type hints
  const immediateFolder = folderPath[folderPath.length - 1] || '';

  if (immediateFolder.includes('slope')) {
    return 'slope';
  }
  if (immediateFolder.includes('tree') || immediateFolder.includes('forest')) {
    return 'tree_cover';
  }
  if (immediateFolder.includes('wetland')) {
    return 'wetland';
  }
  if (immediateFolder.includes('flood')) {
    return 'flood_zone';
  }

  return null;
}

/**
 * Parse KML file content and extract site boundaries and exclusion zones
 * Uses folder structure to properly categorize placemarks
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
    const name = placemark.querySelector(':scope > name')?.textContent || 'Unnamed';
    const description = placemark.querySelector(':scope > description')?.textContent || '';

    // Get folder context for this placemark
    const folderPath = getFolderPath(placemark);
    const folderCategory = categorizeByFolderPath(folderPath);

    // Skip based on folder (buildable area, setback buffers)
    if (folderCategory === 'skip') {
      return;
    }

    // Process Polygon elements
    const polygons = placemark.querySelectorAll('Polygon');
    polygons.forEach((polygon) => {
      const coordinates = extractPolygonCoordinates(polygon);
      if (coordinates.length < 3) return; // Need at least 3 points for a polygon

      const area = calculatePolygonArea(coordinates);

      // Skip degenerate or extremely small polygons (< 1 sqm)
      if (area < 1) return;

      // Determine zone type using folder context first, then name/description
      let zoneType: ExclusionZoneType | 'skip' | null = null;

      if (folderCategory === 'boundary') {
        // This is a boundary, not an exclusion
        boundaries.push({
          id: crypto.randomUUID(),
          name,
          coordinates,
          area,
        });
        return;
      }

      if (folderCategory === 'exclusion') {
        // Try to get type from folder name
        zoneType = detectZoneTypeFromFolder(folderPath);
        // Fall back to name/description detection
        if (!zoneType) {
          zoneType = detectZoneType(name, description);
        }
        // Default to 'other' if still no type
        if (!zoneType || zoneType === 'skip') {
          zoneType = 'other';
        }
      } else {
        // Unknown folder - use name/description detection
        zoneType = detectZoneType(name, description);
      }

      // Skip if marked as skip
      if (zoneType === 'skip') {
        return;
      }

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
        // No exclusion detected, treat as boundary
        boundaries.push({
          id: crypto.randomUUID(),
          name,
          coordinates,
          area,
        });
      }
    });

    // If no Polygon found, check for LinearRing directly (some KML files)
    if (polygons.length === 0) {
      const outerBoundary = placemark.querySelector(
        'outerBoundaryIs LinearRing coordinates'
      );
      if (outerBoundary) {
        const coordinates = parseCoordinateString(outerBoundary.textContent || '');
        if (coordinates.length < 3) return;

        const area = calculatePolygonArea(coordinates);

        // Skip degenerate or extremely small polygons (< 1 sqm)
        if (area < 1) return;

        if (folderCategory === 'boundary') {
          boundaries.push({
            id: crypto.randomUUID(),
            name,
            coordinates,
            area,
          });
          return;
        }

        let zoneType: ExclusionZoneType | 'skip' | null = null;

        if (folderCategory === 'exclusion') {
          zoneType = detectZoneTypeFromFolder(folderPath);
          if (!zoneType) {
            zoneType = detectZoneType(name, description);
          }
          if (!zoneType || zoneType === 'skip') {
            zoneType = 'other';
          }
        } else {
          zoneType = detectZoneType(name, description);
        }

        if (zoneType === 'skip') {
          return;
        }

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
  });

  // Try to extract centroid from Point placemarks (e.g., PVSDZ "Parcel Marker")
  let pointCentroid: { latitude: number; longitude: number } | undefined;
  placemarks.forEach((placemark) => {
    if (pointCentroid) return; // only need the first one
    const point = placemark.querySelector('Point coordinates');
    if (point) {
      const coords = parseCoordinateString(point.textContent || '');
      if (coords.length > 0) {
        pointCentroid = { latitude: coords[0].lat, longitude: coords[0].lng };
      }
    }
  });

  // Calculate centroid from boundaries, or fall back to Point marker
  const centroid = calculateCentroid(boundaries) || pointCentroid;
  const totalArea = boundaries.reduce((sum, b) => sum + (b.area || 0), 0);

  console.log('[KML Parser] Parsed results:', {
    placemarkCount: placemarks.length,
    boundaries: boundaries.length,
    exclusionZones: exclusionZones.length,
    exclusionTypes: exclusionZones.map(ez => `${ez.name} (${ez.type})`),
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
): SiteCoordinate[] {
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
 * Preserves elevation when present.
 */
function parseCoordinateString(
  coordString: string
): SiteCoordinate[] {
  const coordinates: SiteCoordinate[] = [];

  // KML format: "lng,lat,elevation lng,lat,elevation ..."
  // Coordinates are separated by whitespace (spaces, newlines, tabs)
  const coordPairs = coordString.trim().split(/\s+/);

  for (const pair of coordPairs) {
    const parts = pair.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        const coord: SiteCoordinate = { lat, lng };
        if (parts.length >= 3) {
          const elevation = parseFloat(parts[2]);
          if (!isNaN(elevation)) {
            coord.elevation = elevation;
          }
        }
        coordinates.push(coord);
      }
    }
  }

  return coordinates;
}

/**
 * Detect if placemark represents an exclusion zone based on name/description
 * Returns null if this is a boundary (not an exclusion)
 * Returns 'skip' if this placemark should be skipped entirely (e.g., pre-calculated buildable area)
 */
function detectZoneType(
  name: string,
  description: string
): ExclusionZoneType | 'skip' | null {
  const text = (name + ' ' + description).toLowerCase();

  // Skip pre-calculated "Buildable Area" polygons - these are results, not raw data
  if (text.includes('buildable area') || text.includes('buildable_area')) {
    return 'skip';
  }

  // Wetlands
  if (text.includes('wetland') || text.includes('marsh') || text.includes('swamp')) {
    return 'wetland';
  }

  // Water bodies (distinct from wetlands - ponds, lakes, streams, etc.)
  if (
    text.includes('pond') ||
    text.includes('lake') ||
    text.includes('stream') ||
    text.includes('creek') ||
    text.includes('river') ||
    text.includes('water')
  ) {
    return 'water_body';
  }

  // Tree cover / vegetation
  if (
    text.includes('tree') ||
    text.includes('forest') ||
    text.includes('vegetation') ||
    text.includes('wooded') ||
    text.includes('timber')
  ) {
    return 'tree_cover';
  }

  // Structures / buildings / constraints
  if (
    text.includes('house') ||
    text.includes('building') ||
    text.includes('structure') ||
    text.includes('constraint') ||
    text.includes('barn') ||
    text.includes('shed') ||
    text.includes('dwelling')
  ) {
    return 'structure';
  }

  // Setbacks / buffers
  if (text.includes('setback') || text.includes('buffer')) {
    return 'setback';
  }

  // Easements / rights-of-way
  if (text.includes('easement') || text.includes('right-of-way') || text.includes('row')) {
    return 'easement';
  }

  // Steep slopes
  if (text.includes('slope') || text.includes('steep') || text.includes('grade')) {
    return 'slope';
  }

  // Flood zones
  if (text.includes('flood') || text.includes('floodplain') || text.includes('fema')) {
    return 'flood_zone';
  }

  // Generic exclusion terms - catch-all for anything marked as exclusion
  if (
    text.includes('exclusion') ||
    text.includes('exclude') ||
    text.includes('restricted') ||
    text.includes('no-build') ||
    text.includes('no build')
  ) {
    return 'other';
  }

  return null;
}

/**
 * Calculate polygon area using Shoelace formula (in square meters, approximate)
 */
function calculatePolygonArea(
  coordinates: SiteCoordinate[]
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
 * Main entry point for parsing site files (KML, KMZ, or PVSDZ)
 */
export async function parseSiteFile(file: File): Promise<KMLParseResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pvsdz')) {
    const { parsePVSDZFile } = await import('@/lib/pvsdz/parser');
    return parsePVSDZFile(file);
  } else if (fileName.endsWith('.kmz')) {
    return parseKMZFile(file);
  } else if (fileName.endsWith('.kml')) {
    const content = await file.text();
    return parseKMLFile(content);
  } else {
    throw new Error('Unsupported file type. Please upload a KML, KMZ, or PVSDZ file.');
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
