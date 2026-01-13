/**
 * PV Layer Detection - Classifies DXF layers based on naming patterns
 *
 * Common patterns observed in PV design software:
 * - PVcase: "PVcase PV Modules", "PVcase Poles", "PVcase Strings", etc.
 * - Generic: "PANELS", "PV_MODULES", "MOUNTING", "RAILS", etc.
 */

import type { LayerClassification } from './types';

interface LayerClassificationResult {
  panels: string[];
  mounting: string[];
  electrical: string[];
  boundaries: string[];
  vegetation: string[];
  terrain: string[];
  labels: string[];
  unknown: string[];
}

// Pattern matchers for layer classification
const PANEL_PATTERNS = [
  /pv\s*modules?/i,
  /panels?/i,
  /solar/i,
  /modules?/i,
  /pvblock/i,
  /frames?/i,
];

const MOUNTING_PATTERNS = [
  /poles?/i,
  /mounting/i,
  /rails?/i,
  /racks?/i,
  /support/i,
  /structure/i,
  /tracker/i,
];

const ELECTRICAL_PATTERNS = [
  /inverter/i,
  /transformer/i,
  /substation/i,
  /combiner/i,
  /cables?/i,
  /strings?/i,
  /dc\s/i,
  /ac\s/i,
  /electrical/i,
  /wiring/i,
  /harness/i,
  /sld/i, // Single Line Diagram
  /trench/i,
];

const BOUNDARY_PATTERNS = [
  /pv\s*area/i,
  /fence/i,
  /road/i,
  /boundary/i,
  /perimeter/i,
  /alignment/i,
  /corridor/i,
  /offset/i,
];

const VEGETATION_PATTERNS = [
  /trees?/i,
  /vegetation/i,
  /plant/i,
  /forest/i,
  /hedge/i,
];

const TERRAIN_PATTERNS = [
  /topograph/i,
  /terrain/i,
  /contour/i,
  /elevation/i,
  /ground/i,
  /site/i,
  /shading/i,
];

const LABEL_PATTERNS = [
  /text/i,
  /label/i,
  /number/i,
  /annotation/i,
  /dimension/i,
  /coord/i,
  /detail/i,
];

/**
 * Classify a single layer name
 */
export function classifyLayer(layerName: string): LayerClassification {
  const name = layerName.toLowerCase();

  // Check patterns in order of specificity
  // Electrical patterns are checked first as they can contain words like "modules"
  if (ELECTRICAL_PATTERNS.some((p) => p.test(name))) {
    return 'electrical';
  }

  // Panels (but not stringing numbers or other label layers)
  if (PANEL_PATTERNS.some((p) => p.test(name))) {
    // Exclude if it's actually a label layer
    if (LABEL_PATTERNS.some((p) => p.test(name))) {
      return 'labels';
    }
    return 'panels';
  }

  if (MOUNTING_PATTERNS.some((p) => p.test(name))) {
    return 'mounting';
  }

  if (BOUNDARY_PATTERNS.some((p) => p.test(name))) {
    return 'boundaries';
  }

  if (VEGETATION_PATTERNS.some((p) => p.test(name))) {
    return 'vegetation';
  }

  if (TERRAIN_PATTERNS.some((p) => p.test(name))) {
    return 'terrain';
  }

  if (LABEL_PATTERNS.some((p) => p.test(name))) {
    return 'labels';
  }

  return 'unknown';
}

/**
 * Classify all layers in a DXF file
 */
export function classifyAllLayers(layerNames: string[]): LayerClassificationResult {
  const result: LayerClassificationResult = {
    panels: [],
    mounting: [],
    electrical: [],
    boundaries: [],
    vegetation: [],
    terrain: [],
    labels: [],
    unknown: [],
  };

  for (const name of layerNames) {
    const classification = classifyLayer(name);
    result[classification].push(name);
  }

  return result;
}

/**
 * Check if a layer should be rendered (panels, mounting, boundaries)
 */
export function isRenderableLayer(layerName: string): boolean {
  const classification = classifyLayer(layerName);
  return ['panels', 'mounting', 'boundaries', 'electrical'].includes(classification);
}

/**
 * Check if a layer contains panel geometry
 */
export function isPanelLayer(layerName: string): boolean {
  return classifyLayer(layerName) === 'panels';
}

/**
 * Check if a layer contains electrical components
 */
export function isElectricalLayer(layerName: string): boolean {
  return classifyLayer(layerName) === 'electrical';
}

/**
 * Check if a layer contains mounting structures
 */
export function isMountingLayer(layerName: string): boolean {
  return classifyLayer(layerName) === 'mounting';
}

/**
 * Check if a layer contains boundary/area definitions
 */
export function isBoundaryLayer(layerName: string): boolean {
  return classifyLayer(layerName) === 'boundaries';
}

/**
 * Check if a layer contains vegetation (trees, etc.)
 */
export function isVegetationLayer(layerName: string): boolean {
  return classifyLayer(layerName) === 'vegetation';
}

/**
 * Parse block name to extract panel configuration
 * Example: "2P12@20DEG F FX A12 ID1 PVBlock"
 * - 2P12: 2 panels in portrait, 12 total modules
 * - 20DEG: 20 degree tilt
 * - F FX: Fixed mount
 * - A12: Array configuration
 */
export function parsePanelBlockName(blockName: string): {
  tiltAngle?: number;
  configuration?: string;
  moduleCount?: number;
  orientation?: 'portrait' | 'landscape';
} {
  const result: {
    tiltAngle?: number;
    configuration?: string;
    moduleCount?: number;
    orientation?: 'portrait' | 'landscape';
  } = {};

  // Extract tilt angle (e.g., "20DEG")
  const tiltMatch = blockName.match(/(\d+)DEG/i);
  if (tiltMatch) {
    result.tiltAngle = parseInt(tiltMatch[1], 10);
  }

  // Extract configuration (e.g., "2P12" = 2 portrait, 12 modules)
  const configMatch = blockName.match(/(\d+)([PL])(\d+)/i);
  if (configMatch) {
    result.configuration = configMatch[0];
    result.moduleCount = parseInt(configMatch[3], 10);
    result.orientation = configMatch[2].toUpperCase() === 'P' ? 'portrait' : 'landscape';
  }

  return result;
}
