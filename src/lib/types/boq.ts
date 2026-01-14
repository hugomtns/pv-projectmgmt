/**
 * Bill of Quantities (BOQ) types
 *
 * BOQ is a design-scoped document that lists quantities and costs of materials/equipment.
 * One BOQ per design, with items auto-generated from DXF extraction and/or manually added.
 */

/** Source of BOQ item data for audit trail */
export type BOQItemSource =
  | 'manual'           // Manually entered by user
  | 'dxf_extraction'   // Auto-extracted from DXF parsing
  | 'component_library'; // Pulled from component store

/** Single line item in a BOQ */
export interface BOQItem {
  id: string;
  name: string;
  category: string;         // Category grouping (aligned with CAPEX categories)
  quantity: number;
  unit: string;             // e.g., 'panels', 'units', 'meters', 'MW'
  unitPrice: number;        // Price per unit
  totalPrice: number;       // Calculated: quantity × unitPrice
  source: BOQItemSource;    // Where this item came from
  sourceId?: string;        // Component ID if from component_library
  notes?: string;           // Optional notes/description
}

/** Bill of Quantities document - one per design */
export interface BOQ {
  id: string;
  designId: string;         // Foreign key to Design
  projectId: string;        // Denormalized for easier querying
  name: string;             // e.g., "Solar Farm A - BOQ"
  items: BOQItem[];
  totalValue: number;       // Sum of all item totalPrice values

  // Metadata
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;

  // Export tracking
  lastExportedAt?: string;  // When last exported to CAPEX
  lastExportedBy?: string;  // Who exported it
}

/** Options for BOQ generation from design */
export interface BOQGenerationOptions {
  includeModules: boolean;
  includeInverters: boolean;
  useComponentLibraryPrices: boolean;  // Pull prices from linked components
  defaultModulePrice?: number;         // Fallback price if no component linked
  defaultInverterPrice?: number;       // Fallback price if no component linked
}

/** Preview item for export to CAPEX */
export interface BOQExportItem {
  boqItem: BOQItem;
  capexCategory: string;
  capexName: string;
  isNew: boolean;           // true if adding, false if updating existing
  existingQuantity?: number; // Only if updating
}

/** Preview data before export to CAPEX */
export interface BOQExportPreview {
  items: BOQExportItem[];
  totalNewValue: number;
  totalUpdateValue: number;
  hasFinancialModel: boolean;
}

/** Default generation options */
export const DEFAULT_GENERATION_OPTIONS: BOQGenerationOptions = {
  includeModules: true,
  includeInverters: true,
  useComponentLibraryPrices: true,
  defaultModulePrice: 100,    // Default €100/panel
  defaultInverterPrice: 5000, // Default €5000/inverter
};
