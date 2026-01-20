// Layout generation types for Site-to-Design conversion

/**
 * Module input - can be manual entry or imported from component library
 */
export interface ModuleInput {
  source: 'manual' | 'library';
  componentId?: string; // If source === 'library'

  // Module specs (filled manually or from library)
  name: string;
  widthMm: number; // Module width in mm (e.g., 1134)
  lengthMm: number; // Module length in mm (e.g., 2384)
  wattage: number; // Module wattage in W (e.g., 665)
}

/**
 * Layout generation parameters
 */
export interface LayoutParameters {
  tiltAngle: number; // Degrees (0-45), default 20
  azimuth: number; // Degrees (0-360), default 180 (south-facing)
  gcr: number; // Ground Coverage Ratio (0.2-0.7), default 0.4
  boundarySetbackM: number; // Setback from site boundary in meters, default 10
  rowGapM: number; // Minimum gap between rows in meters, default 3
}

/**
 * A single row of panels in the generated layout
 */
export interface PanelRow {
  index: number;
  panelCount: number;
  // Row geometry in lat/lng
  startCoord: { lat: number; lng: number };
  endCoord: { lat: number; lng: number };
  // Row length in meters
  lengthM: number;
}

/**
 * Summary statistics for generated layout
 */
export interface LayoutSummary {
  totalPanels: number;
  totalRows: number;
  dcCapacityKw: number;
  dcCapacityMw: number;
  actualGcr: number;
  coveredAreaSqm: number; // Usable area after setbacks
  moduleAreaSqm: number; // Total panel surface area
}

/**
 * Complete generated layout stored on Design entity
 */
export interface GeneratedLayout {
  // Input references
  siteId: string;
  module: ModuleInput;
  parameters: LayoutParameters;

  // Generated output
  rows: PanelRow[];

  // Summary statistics
  summary: LayoutSummary;

  // Metadata
  generatedAt: string; // ISO timestamp
}

/**
 * Default layout parameters
 */
export const DEFAULT_LAYOUT_PARAMETERS: LayoutParameters = {
  tiltAngle: 20,
  azimuth: 180,
  gcr: 0.4,
  boundarySetbackM: 10,
  rowGapM: 3,
};

/**
 * Parameter constraints for validation
 */
export const LAYOUT_PARAMETER_LIMITS = {
  tiltAngle: { min: 0, max: 45, step: 1 },
  azimuth: { min: 0, max: 360, step: 5 },
  gcr: { min: 0.2, max: 0.7, step: 0.01 },
  boundarySetbackM: { min: 0, max: 50, step: 1 },
  rowGapM: { min: 1, max: 10, step: 0.5 },
};

/**
 * Labels for layout parameters
 */
export const LAYOUT_PARAMETER_LABELS: Record<keyof LayoutParameters, string> = {
  tiltAngle: 'Tilt Angle',
  azimuth: 'Azimuth (Orientation)',
  gcr: 'Ground Coverage Ratio (GCR)',
  boundarySetbackM: 'Boundary Setback',
  rowGapM: 'Row Gap',
};

/**
 * Descriptions for layout parameters
 */
export const LAYOUT_PARAMETER_DESCRIPTIONS: Record<keyof LayoutParameters, string> = {
  tiltAngle: 'Panel tilt angle in degrees from horizontal',
  azimuth: '0° = North, 90° = East, 180° = South, 270° = West',
  gcr: 'Ratio of panel area to ground area. Higher = more panels, more shading',
  boundarySetbackM: 'Buffer distance from site boundary edges',
  rowGapM: 'Minimum gap between panel rows for maintenance access',
};
