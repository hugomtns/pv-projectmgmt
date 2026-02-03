import type { KMLParseResult, SiteImportMetadata } from '@/lib/types/site';
import { parseKMLFile } from '@/lib/kml/parser';

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
