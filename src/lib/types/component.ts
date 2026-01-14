// Component types for PV modules and inverters

export type ComponentType = 'module' | 'inverter';

export interface ModuleSpecs {
  // Physical
  length: number;           // mm
  width: number;            // mm
  thickness?: number;       // mm
  weight?: number;          // kg
  // Electrical (STC)
  powerRating: number;      // Wp (e.g., 580)
  voc: number;              // V - Open circuit voltage
  isc: number;              // A - Short circuit current
  vmp: number;              // V - Voltage at max power
  imp: number;              // A - Current at max power
  efficiency: number;       // % (e.g., 22.5)
  // Cell info
  cellType?: string;        // 'mono-Si', 'poly-Si', 'thin-film', etc.
  cellCount?: number;       // e.g., 144
  bifacial?: boolean;
  bifacialityFactor?: number; // 0-1 ratio
  // Temperature coefficients
  tempCoeffPmax?: number;   // %/°C
  tempCoeffVoc?: number;    // %/°C
  tempCoeffIsc?: number;    // %/°C
}

export interface InverterSpecs {
  // Physical
  length?: number;          // mm
  width?: number;           // mm
  height?: number;          // mm
  weight?: number;          // kg
  // Electrical - DC Input
  maxDcPower: number;       // kW
  maxDcVoltage: number;     // V
  mpptVoltageMin: number;   // V
  mpptVoltageMax: number;   // V
  maxDcCurrent: number;     // A
  mpptCount: number;        // Number of MPPT inputs
  stringsPerMppt?: number;
  // Electrical - AC Output
  acPowerRating: number;    // kW (nominal)
  acVoltage: number;        // V (e.g., 400, 480, 690)
  acFrequency?: number;     // Hz (50 or 60)
  maxAcCurrent?: number;    // A
  // Performance
  maxEfficiency: number;    // % (e.g., 98.5)
  euroEfficiency?: number;  // % weighted efficiency
  // Type
  inverterType?: string;    // 'string', 'central', 'micro'
}

// Design usage tracking
export interface DesignUsage {
  designId: string;
  quantity: number;
}

// Base component interface
interface BaseComponent {
  id: string;
  type: ComponentType;
  manufacturer: string;
  model: string;
  // Pricing
  unitPrice: number;        // $ per unit
  currency: string;         // 'USD' default
  // Design usage - tracks which designs use this component
  linkedDesigns?: DesignUsage[];
  // Metadata
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

// Discriminated union for type-safe component handling
export interface ModuleComponent extends BaseComponent {
  type: 'module';
  specs: ModuleSpecs;
}

export interface InverterComponent extends BaseComponent {
  type: 'inverter';
  specs: InverterSpecs;
}

export type Component = ModuleComponent | InverterComponent;

// Default values for creating new components
export const DEFAULT_MODULE_SPECS: ModuleSpecs = {
  length: 2278,
  width: 1134,
  thickness: 30,
  weight: 28,
  powerRating: 580,
  voc: 51.5,
  isc: 14.35,
  vmp: 43.2,
  imp: 13.43,
  efficiency: 22.5,
  cellType: 'mono-Si',
  cellCount: 144,
  bifacial: true,
  bifacialityFactor: 0.7,
  tempCoeffPmax: -0.34,
  tempCoeffVoc: -0.25,
  tempCoeffIsc: 0.04,
};

export const DEFAULT_INVERTER_SPECS: InverterSpecs = {
  length: 1055,
  width: 660,
  height: 2094,
  weight: 1850,
  maxDcPower: 5500,
  maxDcVoltage: 1500,
  mpptVoltageMin: 860,
  mpptVoltageMax: 1300,
  maxDcCurrent: 6500,
  mpptCount: 18,
  stringsPerMppt: 24,
  acPowerRating: 5000,
  acVoltage: 690,
  acFrequency: 50,
  maxAcCurrent: 4184,
  maxEfficiency: 98.9,
  euroEfficiency: 98.7,
  inverterType: 'central',
};

// Cell type options for UI
export const CELL_TYPES = [
  { value: 'mono-Si', label: 'Monocrystalline Silicon' },
  { value: 'poly-Si', label: 'Polycrystalline Silicon' },
  { value: 'thin-film', label: 'Thin Film' },
  { value: 'HJT', label: 'Heterojunction (HJT)' },
  { value: 'TOPCon', label: 'TOPCon' },
  { value: 'IBC', label: 'Interdigitated Back Contact (IBC)' },
] as const;

// Inverter type options for UI
export const INVERTER_TYPES = [
  { value: 'string', label: 'String Inverter' },
  { value: 'central', label: 'Central Inverter' },
  { value: 'micro', label: 'Microinverter' },
] as const;

// Currency options
export const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20AC)' },
  { value: 'GBP', label: 'GBP (\u00A3)' },
  { value: 'AUD', label: 'AUD ($)' },
] as const;
