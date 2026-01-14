/**
 * Component Extractor - Extracts module and inverter data from DXF design files
 */

import { useDesignStore } from '@/stores/designStore';
import { blobCache } from '@/lib/blobCache';
import { db, getBlob } from '@/lib/db';
import { parseDXFFile } from './parser';
import type { DXFParsedData } from './types';

export interface ExtractedModuleData {
  count: number;
  widthMm: number | null;
  heightMm: number | null;
  tiltAngle: number | null;
}

export interface ExtractedInverterData {
  count: number;
}

export interface ExtractedComponentData {
  modules: ExtractedModuleData | null;
  inverters: ExtractedInverterData | null;
  error?: string;
}

/**
 * Extract component data from a design's DXF file
 */
export async function extractComponentsFromDesign(designId: string): Promise<ExtractedComponentData> {
  try {
    // Get design from store
    const design = useDesignStore.getState().designs.find((d) => d.id === designId);
    if (!design) {
      return { modules: null, inverters: null, error: 'Design not found' };
    }

    // Get current version from IndexedDB
    const versionId = design.currentVersionId;
    if (!versionId) {
      return { modules: null, inverters: null, error: 'No version uploaded for this design' };
    }

    const version = await db.designVersions.get(versionId);
    if (!version) {
      return { modules: null, inverters: null, error: 'Design version not found' };
    }

    // Check file type
    if (version.fileType !== 'dxf') {
      return { modules: null, inverters: null, error: 'Only DXF files are supported' };
    }

    // Load blob from IndexedDB
    const blobId = version.fileBlob;
    const url = await blobCache.get(blobId, getBlob);
    if (!url) {
      return { modules: null, inverters: null, error: 'Failed to load design file' };
    }

    // Fetch and parse the DXF content
    const response = await fetch(url);
    const text = await response.text();
    const parsedData = await parseDXFFile(text);

    // Extract component data
    return extractFromParsedData(parsedData);
  } catch (error) {
    console.error('Failed to extract components from design:', error);
    return {
      modules: null,
      inverters: null,
      error: error instanceof Error ? error.message : 'Failed to parse design file'
    };
  }
}

/**
 * Extract component data from already-parsed DXF data
 */
export function extractFromParsedData(parsedData: DXFParsedData): ExtractedComponentData {
  // Extract module data
  const modules = extractModuleData(parsedData);

  // Extract inverter data
  const inverters = extractInverterData(parsedData);

  return { modules, inverters };
}

/**
 * Extract module data from parsed DXF
 */
function extractModuleData(parsedData: DXFParsedData): ExtractedModuleData | null {
  const { panels } = parsedData;

  if (panels.length === 0) {
    return null;
  }

  // Calculate total module count
  let totalCount = 0;
  let widthMm: number | null = null;
  let heightMm: number | null = null;
  let tiltAngle: number | null = null;

  for (const panel of panels) {
    // Each panel represents a "table" with multiple modules
    const rows = panel.moduleRows || 1;
    const cols = panel.moduleColumns || 1;
    totalCount += rows * cols;

    // Get dimensions from first panel with valid data (in meters, convert to mm)
    if (widthMm === null && panel.moduleWidth) {
      widthMm = Math.round(panel.moduleWidth * 1000);
    }
    if (heightMm === null && panel.moduleHeight) {
      heightMm = Math.round(panel.moduleHeight * 1000);
    }
    if (tiltAngle === null && panel.tiltAngle !== undefined) {
      tiltAngle = panel.tiltAngle;
    }
  }

  if (totalCount === 0) {
    return null;
  }

  return {
    count: totalCount,
    widthMm,
    heightMm,
    tiltAngle,
  };
}

/**
 * Extract inverter data from parsed DXF
 */
function extractInverterData(parsedData: DXFParsedData): ExtractedInverterData | null {
  const { electrical } = parsedData;

  // Count inverters
  const inverterCount = electrical.filter((e) => e.type === 'inverter').length;

  if (inverterCount === 0) {
    return null;
  }

  return {
    count: inverterCount,
  };
}
