/**
 * BOQ Categories and CAPEX mapping
 *
 * Categories align with CAPEX fields for easy export mapping.
 */

import { CAPEX_FIELDS } from './capexFields';

export interface BOQCategory {
  title: string;
  fields: string[];
}

// BOQ categories mirror CAPEX categories for seamless export
export const BOQ_CATEGORIES: BOQCategory[] = CAPEX_FIELDS;

// Flatten all fields for easy searching
export const ALL_BOQ_FIELDS = BOQ_CATEGORIES.flatMap(category => category.fields);

// Get category for a BOQ item name
export function getBOQItemCategory(fieldName: string): string {
  for (const category of BOQ_CATEGORIES) {
    if (category.fields.includes(fieldName)) {
      return category.title;
    }
  }
  return 'Uncategorized';
}

// Default units for common BOQ items
export const DEFAULT_BOQ_UNITS: Record<string, string> = {
  'PV modules': 'panels',
  'Spare modules for breakage': 'panels',
  'Inverters': 'units',
  'Mounting structure/substructure': 'sets',
  'DC string cables': 'meters',
  'DC main cables': 'meters',
  'AC cables': 'meters',
  'MV cables (various sizes)': 'meters',
  'String combiner boxes (SCBs)': 'units',
  'MC plugs': 'units',
  'Data cables': 'meters',
  'Fiber optic cables': 'meters',
  'Data logger/transformer monitoring box': 'units',
  'Weather station': 'units',
  'SCADA system': 'units',
  'Fencing (material & gateways)': 'meters',
  'CCTV security system': 'units',
  'MV transformer stations (various capacities)': 'units',
};

// Get default unit for a BOQ item
export function getDefaultBOQUnit(fieldName: string): string {
  return DEFAULT_BOQ_UNITS[fieldName] || 'units';
}

// Items that can be auto-generated from DXF extraction
export const DXF_EXTRACTABLE_ITEMS = [
  { name: 'PV modules', category: 'PV Equipment', unit: 'panels' },
  { name: 'Inverters', category: 'PV Equipment', unit: 'units' },
] as const;
