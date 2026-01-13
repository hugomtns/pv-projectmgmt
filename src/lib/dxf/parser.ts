/**
 * DXF Parser - Parses DXF files and extracts PV layout geometry
 *
 * Uses dxf-parser library for initial parsing, then processes
 * entities into our PV-specific data structures.
 */

import DxfParser from 'dxf-parser';
import type {
  DXFParsedData,
  PanelGeometry,
  MountingGeometry,
  ElectricalComponent,
  BoundaryGeometry,
  BoundingBox,
  LayerInfo,
  DXFUnits,
} from './types';
import {
  classifyLayer,
  isPanelLayer,
  isMountingLayer,
  isElectricalLayer,
  isBoundaryLayer,
  parsePanelBlockName,
} from './pvLayerDetection';

// Internal type for DXF entities (dxf-parser types are incomplete)
interface DXFEntity {
  type?: string;
  layer?: string;
  name?: string;
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
  xScale?: number;
  yScale?: number;
  zScale?: number;
  vertices?: Array<{ x: number; y: number; z?: number }>;
  start?: { x: number; y: number; z?: number };
  end?: { x: number; y: number; z?: number };
  center?: { x: number; y: number; z?: number };
  shape?: boolean;
}

// DXF unit codes to unit names
const UNIT_MAP: Record<number, DXFUnits> = {
  0: 'unitless',
  1: 'inches',
  2: 'feet',
  3: 'miles',
  4: 'millimeters',
  5: 'centimeters',
  6: 'meters',
  7: 'kilometers',
  8: 'microinches',
  9: 'mils',
  10: 'yards',
  11: 'angstroms',
  12: 'nanometers',
  13: 'microns',
  14: 'decimeters',
  15: 'decameters',
  16: 'hectometers',
  17: 'gigameters',
  18: 'astronomical',
  19: 'lightyears',
  20: 'parsecs',
};

/**
 * Parse a DXF file from text content
 */
export async function parseDXFFile(content: string | ArrayBuffer): Promise<DXFParsedData> {
  const parser = new DxfParser();

  // Convert ArrayBuffer to string if needed
  const text = content instanceof ArrayBuffer
    ? new TextDecoder().decode(content)
    : content;

  const dxf = parser.parseSync(text);

  if (!dxf) {
    throw new Error('Failed to parse DXF file');
  }

  // Extract units from header
  const units = getUnitsFromHeader(dxf);

  // Extract layer information
  const layers = extractLayers(dxf);

  // Process entities by type
  const panels: PanelGeometry[] = [];
  const mounting: MountingGeometry[] = [];
  const electrical: ElectricalComponent[] = [];
  const boundaries: BoundaryGeometry[] = [];

  // Track bounds
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  const updateBounds = (x: number, y: number, z: number = 0) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  };

  // Process all entities
  // Note: dxf-parser types are incomplete, so we use type assertions
  for (const entity of dxf.entities || []) {
    const layerName = entity.layer || '0';
    // Cast entity to unknown first for flexible type conversion
    const e = entity as unknown as DXFEntity;

    // Handle INSERT entities (block references - typically panels)
    if (entity.type === 'INSERT') {
      const pos = getEntityPosition(e);
      updateBounds(pos[0], pos[1], pos[2]);

      if (isPanelLayer(layerName)) {
        panels.push(convertInsertToPanel(e));
      } else if (isMountingLayer(layerName)) {
        mounting.push(convertInsertToMounting(e));
      } else if (isElectricalLayer(layerName)) {
        electrical.push(convertInsertToElectrical(e));
      }
    }

    // Handle LWPOLYLINE entities (boundaries, cables, areas)
    if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
      const vertices = getPolylineVertices(e);
      for (const v of vertices) {
        updateBounds(v[0], v[1], v[2]);
      }

      if (isBoundaryLayer(layerName)) {
        boundaries.push(convertPolylineToBoundary(e, vertices));
      } else if (isElectricalLayer(layerName)) {
        electrical.push(convertPolylineToElectrical(e, vertices));
      } else if (isMountingLayer(layerName)) {
        mounting.push(convertPolylineToMounting(e, vertices));
      }
    }

    // Handle LINE entities
    if (entity.type === 'LINE') {
      const start = getLineStart(e);
      const end = getLineEnd(e);
      updateBounds(start[0], start[1], start[2]);
      updateBounds(end[0], end[1], end[2]);

      if (isMountingLayer(layerName)) {
        mounting.push({
          id: generateId(),
          type: 'rail',
          position: start,
          vertices: [start, end],
          layer: layerName,
        });
      } else if (isElectricalLayer(layerName)) {
        electrical.push({
          id: generateId(),
          type: 'cable',
          position: start,
          vertices: [start, end],
          layer: layerName,
        });
      }
    }

    // Handle CIRCLE entities (often pole positions)
    if (entity.type === 'CIRCLE') {
      const center = getCircleCenter(e);
      updateBounds(center[0], center[1], center[2]);

      if (isMountingLayer(layerName)) {
        mounting.push({
          id: generateId(),
          type: 'pole',
          position: center,
          layer: layerName,
        });
      }
    }
  }

  // Calculate bounds
  const bounds: BoundingBox = {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
    ],
    size: [
      maxX - minX,
      maxY - minY,
      maxZ - minZ,
    ],
  };

  // Update layer entity counts
  const layerCounts = countEntitiesByLayer(dxf);
  for (const layer of layers) {
    layer.entityCount = layerCounts[layer.name] || 0;
  }

  return {
    panels,
    mounting,
    electrical,
    boundaries,
    bounds,
    layers,
    units,
  };
}

// Flexible DXF structure type for header and tables
interface DXFStructure {
  header?: Record<string, unknown>;
  tables?: {
    layer?: {
      layers?: Record<string, { color?: number; frozen?: boolean }>;
    };
  };
  entities?: unknown[];
}

/**
 * Get DXF units from header
 */
function getUnitsFromHeader(dxf: ReturnType<DxfParser['parseSync']>): DXFUnits {
  const dxfData = dxf as unknown as DXFStructure;
  const insunits = dxfData?.header?.['$INSUNITS'];
  if (typeof insunits === 'number') {
    return UNIT_MAP[insunits] || 'meters';
  }
  return 'meters'; // Default to meters for PV layouts
}

/**
 * Extract layer information from DXF
 */
function extractLayers(dxf: ReturnType<DxfParser['parseSync']>): LayerInfo[] {
  const layers: LayerInfo[] = [];
  const dxfData = dxf as unknown as DXFStructure;
  const layerTable = dxfData?.tables?.layer?.layers;

  if (layerTable) {
    for (const [name, layerData] of Object.entries(layerTable)) {
      const color = layerData?.color;
      const frozen = layerData?.frozen || false;

      layers.push({
        name,
        entityCount: 0, // Will be updated later
        classification: classifyLayer(name),
        color: typeof color === 'number' ? color : undefined,
        visible: !frozen,
      });
    }
  }

  return layers;
}

/**
 * Count entities by layer
 */
function countEntitiesByLayer(dxf: ReturnType<DxfParser['parseSync']>): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const entity of dxf?.entities || []) {
    const layer = entity.layer || '0';
    counts[layer] = (counts[layer] || 0) + 1;
  }

  return counts;
}

/**
 * Get position from entity
 */
function getEntityPosition(entity: { x?: number; y?: number; z?: number }): [number, number, number] {
  return [entity.x || 0, entity.y || 0, entity.z || 0];
}

/**
 * Get polyline vertices
 */
function getPolylineVertices(entity: { vertices?: Array<{ x: number; y: number; z?: number }> }): [number, number, number][] {
  return (entity.vertices || []).map((v) => [v.x, v.y, v.z || 0]);
}

/**
 * Get line start point
 */
function getLineStart(entity: {
  start?: { x: number; y: number; z?: number };
  vertices?: Array<{ x: number; y: number; z?: number }>;
}): [number, number, number] {
  if (entity.start) {
    return [entity.start.x, entity.start.y, entity.start.z || 0];
  }
  if (entity.vertices && entity.vertices[0]) {
    const v = entity.vertices[0];
    return [v.x, v.y, v.z || 0];
  }
  return [0, 0, 0];
}

/**
 * Get line end point
 */
function getLineEnd(entity: {
  end?: { x: number; y: number; z?: number };
  vertices?: Array<{ x: number; y: number; z?: number }>;
}): [number, number, number] {
  if (entity.end) {
    return [entity.end.x, entity.end.y, entity.end.z || 0];
  }
  if (entity.vertices && entity.vertices[1]) {
    const v = entity.vertices[1];
    return [v.x, v.y, v.z || 0];
  }
  return [0, 0, 0];
}

/**
 * Get circle center
 */
function getCircleCenter(entity: {
  center?: { x: number; y: number; z?: number };
  x?: number;
  y?: number;
  z?: number;
}): [number, number, number] {
  if (entity.center) {
    return [entity.center.x, entity.center.y, entity.center.z || 0];
  }
  return [entity.x || 0, entity.y || 0, entity.z || 0];
}

/**
 * Convert INSERT entity to panel geometry
 */
function convertInsertToPanel(entity: {
  name?: string;
  layer?: string;
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
  xScale?: number;
  yScale?: number;
  zScale?: number;
}): PanelGeometry {
  const blockName = entity.name || 'Unknown';
  const parsed = parsePanelBlockName(blockName);

  return {
    id: generateId(),
    position: [entity.x || 0, entity.y || 0, entity.z || 0],
    rotation: degToRad(entity.rotation || 0),
    scale: [entity.xScale || 1, entity.yScale || 1, entity.zScale || 1],
    blockName,
    layer: entity.layer || '0',
    tiltAngle: parsed.tiltAngle,
    configuration: parsed.configuration,
  };
}

/**
 * Convert INSERT entity to mounting geometry
 */
function convertInsertToMounting(entity: {
  name?: string;
  layer?: string;
  x?: number;
  y?: number;
  z?: number;
}): MountingGeometry {
  const name = (entity.name || '').toLowerCase();
  let type: MountingGeometry['type'] = 'unknown';

  if (name.includes('pole')) type = 'pole';
  else if (name.includes('rail')) type = 'rail';
  else if (name.includes('support')) type = 'support';

  return {
    id: generateId(),
    type,
    position: [entity.x || 0, entity.y || 0, entity.z || 0],
    layer: entity.layer || '0',
  };
}

/**
 * Convert INSERT entity to electrical component
 */
function convertInsertToElectrical(entity: {
  name?: string;
  layer?: string;
  x?: number;
  y?: number;
  z?: number;
}): ElectricalComponent {
  const name = (entity.name || '').toLowerCase();
  const layerName = (entity.layer || '').toLowerCase();
  let type: ElectricalComponent['type'] = 'unknown';

  if (name.includes('inverter') || layerName.includes('inverter')) type = 'inverter';
  else if (name.includes('combiner') || layerName.includes('combiner')) type = 'combiner';

  return {
    id: generateId(),
    type,
    position: [entity.x || 0, entity.y || 0, entity.z || 0],
    layer: entity.layer || '0',
    label: entity.name,
  };
}

/**
 * Convert polyline to boundary geometry
 */
function convertPolylineToBoundary(
  entity: { layer?: string; shape?: boolean },
  vertices: [number, number, number][]
): BoundaryGeometry {
  const layerName = (entity.layer || '').toLowerCase();
  let type: BoundaryGeometry['type'] = 'unknown';

  if (layerName.includes('pv') && layerName.includes('area')) type = 'pv_area';
  else if (layerName.includes('fence')) type = 'fence';
  else if (layerName.includes('road')) type = 'road';
  else if (layerName.includes('alignment')) type = 'alignment';

  return {
    id: generateId(),
    type,
    vertices,
    closed: entity.shape || false,
    layer: entity.layer || '0',
  };
}

/**
 * Convert polyline to electrical component (cable path)
 */
function convertPolylineToElectrical(
  entity: { layer?: string },
  vertices: [number, number, number][]
): ElectricalComponent {
  const layerName = (entity.layer || '').toLowerCase();
  let type: ElectricalComponent['type'] = 'cable';

  if (layerName.includes('string')) type = 'string';

  return {
    id: generateId(),
    type,
    position: vertices[0] || [0, 0, 0],
    vertices,
    layer: entity.layer || '0',
  };
}

/**
 * Convert polyline to mounting geometry
 */
function convertPolylineToMounting(
  entity: { layer?: string },
  vertices: [number, number, number][]
): MountingGeometry {
  return {
    id: generateId(),
    type: 'rail',
    position: vertices[0] || [0, 0, 0],
    vertices,
    layer: entity.layer || '0',
  };
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Convert degrees to radians
 */
function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Parse DXF file from URL
 */
export async function parseDXFFromURL(url: string): Promise<DXFParsedData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch DXF file: ${response.statusText}`);
  }
  const text = await response.text();
  return parseDXFFile(text);
}
