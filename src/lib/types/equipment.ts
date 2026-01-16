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

// Unit-specific status includes 'replaced' for tracking replacements
export type UnitStatus =
  | 'operational'
  | 'degraded'
  | 'offline'
  | 'replaced'
  | 'decommissioned';

// How individual units are tracked within an equipment group
export type TrackingMode =
  | 'batch'       // Track as bulk quantity, only log exceptions
  | 'individual'; // Track each unit individually (for inverters, transformers)

export interface Equipment {
  id: string;
  projectId: string;
  siteId?: string;          // Link to site
  designId?: string;        // Link to design
  componentId?: string;     // Link to component library for specs

  type: EquipmentType;
  name: string;             // e.g., "INV-01", "Module Array A"
  serialNumber?: string;    // For individual tracking, or batch/lot number
  manufacturer?: string;
  model?: string;
  quantity: number;         // Total units in this equipment group
  status: EquipmentStatus;  // Overall status of the group
  trackingMode: TrackingMode; // How units are tracked

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

// Unit status labels and colors
export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  offline: 'Offline',
  replaced: 'Replaced',
  decommissioned: 'Decommissioned',
};

export const UNIT_STATUS_COLORS: Record<UnitStatus, string> = {
  operational: '#22c55e',     // green
  degraded: '#eab308',        // yellow
  offline: '#ef4444',         // red
  replaced: '#3b82f6',        // blue
  decommissioned: '#6b7280',  // gray
};

// Tracking mode labels
export const TRACKING_MODE_LABELS: Record<TrackingMode, string> = {
  batch: 'Batch Tracking',
  individual: 'Individual Tracking',
};

/**
 * Equipment Unit - Individual tracked unit within an equipment group
 *
 * Used for:
 * - Tracking individual serial numbers
 * - Recording units with different warranty dates
 * - Logging failures, replacements, and exceptions
 */
export interface EquipmentUnit {
  id: string;
  equipmentId: string;        // Parent equipment group

  // Identification
  serialNumber?: string;      // Unit serial number
  assetTag?: string;          // Internal asset tag/ID

  // Status
  status: UnitStatus;

  // Dates (can override parent equipment defaults)
  installedDate?: string;     // ISO date - when this unit was installed
  warrantyExpiration?: string; // ISO date - unit-specific warranty

  // Location
  location?: string;          // Specific location: "Row 12, Position 45"

  // Notes and history
  notes?: string;

  // Metadata
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}
