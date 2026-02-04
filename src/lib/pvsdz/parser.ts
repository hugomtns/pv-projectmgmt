import type { KMLParseResult, SiteImportMetadata } from '@/lib/types/site';
import { parseKMLFile } from '@/lib/kml/parser';
import { parseGeoTIFFMeta, utmZoneFromEPSG, sampleElevation } from './geotiff';
import { latLngToUTM } from './utm';

/**
 * Metadata from a PVSDZ export's metadata.json
 */
export interface PVSDZMetadata {
  export_id: string;
  export_date: number;
  release: string;
  user: string;
  project_id: string;
  asset_ids: string[];
  active_tags: Record<string, unknown>;
}

/**
 * Extended parse result that includes PVSDZ-specific metadata
 */
export interface PVSDZParseResult extends KMLParseResult {
  pvsdzMetadata: PVSDZMetadata;
  importMetadata: SiteImportMetadata;
}

/**
 * Parse a .pvsdz file (PVcase Prospect export).
 *
 * PVSDZ files are ZIP archives containing:
 * - metadata.json: export info (version, project, user, etc.)
 * - *.kml: standard KML with parcel boundaries and markers
 * - *.tif: GeoTIFF elevation raster (optional, overrides KML elevations)
 */
export async function parsePVSDZFile(file: File): Promise<PVSDZParseResult> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  // Parse metadata.json
  const metadataFile = zip.file('metadata.json');
  if (!metadataFile) {
    throw new Error('Invalid PVSDZ file: missing metadata.json');
  }

  let pvsdzMetadata: PVSDZMetadata;
  try {
    const metadataContent = await metadataFile.async('string');
    pvsdzMetadata = JSON.parse(metadataContent);
  } catch {
    throw new Error('Invalid PVSDZ file: could not parse metadata.json');
  }

  // Find the KML file
  let kmlContent: string | null = null;
  for (const fileName of Object.keys(zip.files)) {
    if (fileName.toLowerCase().endsWith('.kml')) {
      kmlContent = await zip.files[fileName].async('string');
      break;
    }
  }

  if (!kmlContent) {
    throw new Error('Invalid PVSDZ file: no KML file found in archive');
  }

  // Parse KML using existing parser (which now preserves elevation)
  const kmlResult = await parseKMLFile(kmlContent);

  // Build import metadata
  const importMetadata: SiteImportMetadata = {
    source: 'pvsdz',
    prospectVersion: pvsdzMetadata.release,
    prospectProjectId: pvsdzMetadata.project_id,
    prospectExportDate: new Date(pvsdzMetadata.export_date).toISOString(),
  };

  // --- GeoTIFF elevation sampling ------------------------------------------
  // PVcase KML coordinates often have a flat placeholder elevation (e.g. 40m
  // everywhere).  The real per-pixel terrain data is in an accompanying
  // GeoTIFF raster.  If one exists we sample it and overwrite the KML values.
  let tifBuffer: ArrayBuffer | null = null;
  for (const fileName of Object.keys(zip.files)) {
    if (fileName.toLowerCase().endsWith('.tif') || fileName.toLowerCase().endsWith('.tiff')) {
      tifBuffer = await zip.files[fileName].async('arraybuffer');
      break;
    }
  }

  if (tifBuffer) {
    try {
      const meta = parseGeoTIFFMeta(tifBuffer);
      const utmInfo = meta.epsgCode ? utmZoneFromEPSG(meta.epsgCode) : null;

      if (utmInfo) {
        // Sample elevation for every coordinate in boundaries + exclusion zones
        const allCoordArrays = [
          ...kmlResult.boundaries.map(b => b.coordinates),
          ...kmlResult.exclusionZones.map(ez => ez.coordinates),
        ];

        let sampled = 0;
        let missed = 0;
        for (const coords of allCoordArrays) {
          for (const coord of coords) {
            const utm = latLngToUTM(coord.lat, coord.lng, utmInfo.zone);
            const elev = sampleElevation(utm.easting, utm.northing, meta, tifBuffer);
            if (elev !== null) {
              coord.elevation = elev;
              sampled++;
            } else {
              missed++;
            }
          }
        }

        console.log('[PVSDZ Parser] GeoTIFF elevation sampling:', {
          raster: `${meta.width}x${meta.height}`,
          epsg: meta.epsgCode,
          utmZone: `${utmInfo.zone}${utmInfo.hemisphere}`,
          pixelScale: `${meta.pixelScaleX.toFixed(2)}m`,
          sampled,
          missed,
        });
      } else {
        console.warn(
          '[PVSDZ Parser] Unrecognised CRS in GeoTIFF (EPSG:' + meta.epsgCode + '), using KML elevations',
        );
      }
    } catch (err) {
      console.warn('[PVSDZ Parser] Failed to parse GeoTIFF, using KML elevations:', err);
    }
  }

  console.log('[PVSDZ Parser] Parsed results:', {
    version: pvsdzMetadata.release,
    projectId: pvsdzMetadata.project_id,
    boundaries: kmlResult.boundaries.length,
    exclusionZones: kmlResult.exclusionZones.length,
    hasElevation: kmlResult.boundaries.some(b =>
      b.coordinates.some(c => c.elevation != null)
    ),
  });

  return {
    ...kmlResult,
    pvsdzMetadata,
    importMetadata,
  };
}
