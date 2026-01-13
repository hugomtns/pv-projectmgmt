/**
 * DXF parsing types for PV layout visualization
 */

export interface DXFParsedData {
  panels: PanelGeometry[];
  mounting: MountingGeometry[];
  electrical: ElectricalComponent[];
  boundaries: BoundaryGeometry[];
  bounds: BoundingBox;
  layers: LayerInfo[];
  units: DXFUnits;
}

export interface PanelGeometry {
  id: string;
  position: [number, number, number]; // x, y, z
  rotation: number; // radians around Z axis
  scale: [number, number, number]; // x, y, z scale
  blockName: string;
  layer: string;
  // Parsed from block name (e.g., "2P12@20DEG F FX A12 ID1 PVBlock")
  tiltAngle?: number; // degrees
  configuration?: string; // e.g., "2P12"
}

export interface MountingGeometry {
  id: string;
  type: 'pole' | 'rail' | 'support' | 'unknown';
  position: [number, number, number];
  vertices?: [number, number, number][]; // For polyline-based structures
  layer: string;
}

export interface ElectricalComponent {
  id: string;
  type: 'inverter' | 'combiner' | 'cable' | 'string' | 'unknown';
  position: [number, number, number];
  vertices?: [number, number, number][]; // For cable paths (polylines)
  layer: string;
  label?: string;
}

export interface BoundaryGeometry {
  id: string;
  type: 'pv_area' | 'fence' | 'road' | 'alignment' | 'unknown';
  vertices: [number, number, number][];
  closed: boolean;
  layer: string;
}

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
}

export interface LayerInfo {
  name: string;
  entityCount: number;
  classification: LayerClassification;
  color?: number;
  visible: boolean;
}

export type LayerClassification =
  | 'panels'
  | 'mounting'
  | 'electrical'
  | 'boundaries'
  | 'terrain'
  | 'labels'
  | 'unknown';

export type DXFUnits =
  | 'unitless'     // 0
  | 'inches'       // 1
  | 'feet'         // 2
  | 'miles'        // 3
  | 'millimeters'  // 4
  | 'centimeters'  // 5
  | 'meters'       // 6
  | 'kilometers'   // 7
  | 'microinches'  // 8
  | 'mils'         // 9
  | 'yards'        // 10
  | 'angstroms'    // 11
  | 'nanometers'   // 12
  | 'microns'      // 13
  | 'decimeters'   // 14
  | 'decameters'   // 15
  | 'hectometers'  // 16
  | 'gigameters'   // 17
  | 'astronomical' // 18
  | 'lightyears'   // 19
  | 'parsecs';     // 20
