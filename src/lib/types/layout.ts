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
  // Tilt & Orientation
  tiltAngle: number; // Degrees (0-45), default 20
  azimuth: number; // Degrees (0-360), default 180 (south-facing)

  // Frame configuration - modules grouped into frames/tables
  frameRows: number; // Number of module rows per frame (default: 2)
  frameColumns: number; // Number of module columns per frame (default: 4)
  moduleGapM: number; // Gap between modules within frame (default: 0.02m)

  // Spacing configuration
  frameGapX: number; // Gap between frames in same row (default: 1m)
  frameGapY: number; // Gap between frame rows (default: 2m)
  boundarySetbackM: number; // Setback from site boundary in meters, default 10

  // Corridor configuration for maintenance vehicle access
  corridorWidth: number; // Width of maintenance corridors (default: 5m)
  corridorEveryNFramesX: number; // Corridor every N frames horizontally (0 = disabled)
  corridorEveryNFramesY: number; // Corridor every N frame rows vertically (0 = disabled)

  // Legacy - kept for backwards compatibility but deprecated
  gcr: number; // Ground Coverage Ratio - now calculated from frame params
  rowGapM: number; // Deprecated - use frameGapY instead
}

/**
 * A single frame/table placement in the generated layout
 */
export interface FramePlacement {
  index: number;
  rowIndex: number; // Which row of frames this belongs to
  colIndex: number; // Position within the row
  frameRows: number; // Modules per frame vertically
  frameColumns: number; // Modules per frame horizontally
  // Frame center position in lat/lng
  centerCoord: { lat: number; lng: number };
  // Frame dimensions in meters
  widthM: number;
  heightM: number;
  // Rotation angle in degrees (from azimuth)
  rotationDeg: number;
}

/**
 * A single row of panels in the generated layout
 * @deprecated Use FramePlacement[] instead
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
  totalFrames: number;
  totalRows: number; // Number of frame rows
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

  // Generated output - frame-based
  frames: FramePlacement[];

  // Legacy - kept for backwards compatibility
  /** @deprecated Use frames instead */
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
  // Tilt & Orientation
  tiltAngle: 20,
  azimuth: 180,

  // Frame configuration
  frameRows: 2,
  frameColumns: 4,
  moduleGapM: 0.02,

  // Spacing
  frameGapX: 1,
  frameGapY: 2,
  boundarySetbackM: 10,

  // Corridors - maintenance vehicle access
  corridorWidth: 5,
  corridorEveryNFramesX: 0, // Disabled by default (horizontal corridors less common)
  corridorEveryNFramesY: 4, // Corridor every 4 rows of frames

  // Legacy (deprecated)
  gcr: 0.4,
  rowGapM: 3,
};

/**
 * Parameter constraints for validation
 */
export const LAYOUT_PARAMETER_LIMITS = {
  // Tilt & Orientation
  tiltAngle: { min: 0, max: 45, step: 1 },
  azimuth: { min: 0, max: 360, step: 5 },

  // Frame configuration
  frameRows: { min: 1, max: 6, step: 1 },
  frameColumns: { min: 1, max: 10, step: 1 },
  moduleGapM: { min: 0, max: 0.1, step: 0.01 },

  // Spacing
  frameGapX: { min: 0.5, max: 5, step: 0.5 },
  frameGapY: { min: 0.5, max: 10, step: 0.5 },
  boundarySetbackM: { min: 0, max: 50, step: 1 },

  // Corridors
  corridorWidth: { min: 3, max: 10, step: 0.5 },
  corridorEveryNFramesX: { min: 0, max: 20, step: 1 },
  corridorEveryNFramesY: { min: 0, max: 10, step: 1 },

  // Legacy (deprecated)
  gcr: { min: 0.2, max: 0.7, step: 0.01 },
  rowGapM: { min: 1, max: 10, step: 0.5 },
};

/**
 * Labels for layout parameters
 */
export const LAYOUT_PARAMETER_LABELS: Record<keyof LayoutParameters, string> = {
  tiltAngle: 'Tilt Angle',
  azimuth: 'Azimuth (Orientation)',
  frameRows: 'Frame Rows',
  frameColumns: 'Frame Columns',
  moduleGapM: 'Module Gap',
  frameGapX: 'Frame Gap (Horizontal)',
  frameGapY: 'Frame Gap (Vertical)',
  boundarySetbackM: 'Boundary Setback',
  corridorWidth: 'Corridor Width',
  corridorEveryNFramesX: 'Corridor Every N Columns',
  corridorEveryNFramesY: 'Corridor Every N Rows',
  gcr: 'Ground Coverage Ratio (GCR)',
  rowGapM: 'Row Gap (Legacy)',
};

/**
 * Descriptions for layout parameters
 */
export const LAYOUT_PARAMETER_DESCRIPTIONS: Record<keyof LayoutParameters, string> = {
  tiltAngle: 'Panel tilt angle in degrees from horizontal',
  azimuth: '0° = North, 90° = East, 180° = South, 270° = West',
  frameRows: 'Number of module rows per frame/table',
  frameColumns: 'Number of module columns per frame/table',
  moduleGapM: 'Gap between modules within frame',
  frameGapX: 'Horizontal gap between adjacent frames',
  frameGapY: 'Vertical gap between frame rows',
  boundarySetbackM: 'Buffer distance from site boundary edges',
  corridorWidth: 'Width of maintenance vehicle corridors',
  corridorEveryNFramesX: 'Insert corridor after every N columns (0 = disabled)',
  corridorEveryNFramesY: 'Insert corridor after every N rows (0 = disabled)',
  gcr: 'Ratio of panel area to ground area (calculated automatically)',
  rowGapM: 'Legacy parameter - use frameGapY instead',
};
