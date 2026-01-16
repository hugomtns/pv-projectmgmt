/**
 * Equipment Types
 *
 * Tracks installed equipment in solar projects for asset management
 * and O&M tracking purposes.
 */

export type EquipmentType =
  | 'module'
  | 'inverter'
  | 'transformer'
  | 'combiner_box'
  | 'tracker'
  | 'meter'
  | 'other';

export type EquipmentStatus =
  | 'operational'
  | 'degraded'
  | 'offline'
  | 'decommissioned';

export interface Equipment {
  id: string;
  projectId: string;
  siteId?: string;          // Link to site
  designId?: string;        // Link to design
  componentId?: string;     // Link to component library for specs

  type: EquipmentType;
  name: string;             // e.g., "INV-01", "Module Array A"
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  quantity: number;
  status: EquipmentStatus;

  // Warranty information
  warrantyExpiration?: string;  // ISO date
  warrantyProvider?: string;

  // Operational info
  commissionedDate?: string;    // ISO date
  location?: string;            // Physical location description
  notes?: string;

  // Metadata
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

// Labels for UI display
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  module: 'PV Modules',
  inverter: 'Inverter',
  transformer: 'Transformer',
  combiner_box: 'Combiner Box',
  tracker: 'Tracker',
  meter: 'Meter',
  other: 'Other',
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  offline: 'Offline',
  decommissioned: 'Decommissioned',
};

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  operational: '#22c55e',     // green
  degraded: '#eab308',        // yellow
  offline: '#ef4444',         // red
  decommissioned: '#6b7280',  // gray
};

// Order for display in category lists
export const EQUIPMENT_TYPE_ORDER: EquipmentType[] = [
  'module',
  'inverter',
  'transformer',
  'combiner_box',
  'tracker',
  'meter',
  'other',
];
