/**
 * Types for LLM-based spec sheet parsing
 *
 * Used to extract module specifications from PDF datasheets
 * with confidence tracking for each extracted field.
 */

/**
 * Confidence level for extracted values
 * - high: Value found with clear label match, within expected range
 * - medium: Value found but label was fuzzy or range edge case
 * - low: Value inferred or multiple conflicting values found
 * - missing: Value not found in document
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'missing';

/**
 * A single extracted field with confidence metadata
 */
export interface ExtractedField<T> {
  /** The extracted value, or null if not found */
  value: T | null;
  /** Confidence level of the extraction */
  confidence: ConfidenceLevel;
  /** Short quote from document showing where value was found */
  source?: string;
}

/**
 * Shared specs across all variants in a module family
 * These are typically the same for all power bins on a spec sheet
 */
export interface SharedModuleSpecs {
  /** Manufacturer name */
  manufacturer: ExtractedField<string>;

  // Physical
  /** Module length in mm (longer dimension) */
  length: ExtractedField<number>;
  /** Module width in mm (shorter dimension) */
  width: ExtractedField<number>;
  /** Module thickness/depth in mm */
  thickness: ExtractedField<number>;
  /** Module weight in kg */
  weight: ExtractedField<number>;

  // Cell Info
  /** Cell technology type */
  cellType: ExtractedField<string>;
  /** Number of cells */
  cellCount: ExtractedField<number>;
  /** Whether module is bifacial */
  bifacial: ExtractedField<boolean>;
  /** Bifaciality factor (0-1) */
  bifacialityFactor: ExtractedField<number>;

  // Temperature Coefficients
  /** Power temperature coefficient in %/°C */
  tempCoeffPmax: ExtractedField<number>;
  /** Voltage temperature coefficient in %/°C */
  tempCoeffVoc: ExtractedField<number>;
  /** Current temperature coefficient in %/°C */
  tempCoeffIsc: ExtractedField<number>;
}

/**
 * Variant-specific specs for a single model in a module family
 * These differ between power bins on a spec sheet
 */
export interface ModuleVariant {
  /** Model name/number (e.g., "TSM-490", "TSM-495") */
  model: ExtractedField<string>;
  /** Peak power rating in Wp */
  powerRating: ExtractedField<number>;
  /** Module efficiency as percentage */
  efficiency: ExtractedField<number>;
  /** Open circuit voltage in V */
  voc: ExtractedField<number>;
  /** Short circuit current in A */
  isc: ExtractedField<number>;
  /** Voltage at maximum power point in V */
  vmp: ExtractedField<number>;
  /** Current at maximum power point in A */
  imp: ExtractedField<number>;
}

/**
 * A module family extracted from a spec sheet
 * Contains shared specs and an array of power variants
 */
export interface ExtractedModuleFamily {
  /** Specs shared across all variants */
  shared: SharedModuleSpecs;
  /** Array of power variants */
  variants: ModuleVariant[];
}

// ============================================================================
// INVERTER TYPES
// ============================================================================

/**
 * Shared specs across all variants in an inverter family
 * These are typically the same for all power variants on a spec sheet
 */
export interface SharedInverterSpecs {
  /** Manufacturer name */
  manufacturer: ExtractedField<string>;

  // DC Input
  /** Maximum DC input voltage in V */
  maxDcVoltage: ExtractedField<number>;
  /** MPPT minimum voltage in V */
  mpptVoltageMin: ExtractedField<number>;
  /** MPPT maximum voltage in V */
  mpptVoltageMax: ExtractedField<number>;
  /** Number of MPPT trackers */
  mpptCount: ExtractedField<number>;
  /** Number of string inputs per MPPT */
  stringsPerMppt: ExtractedField<number>;

  // AC Output
  /** Nominal AC output voltage in V */
  acVoltage: ExtractedField<number>;
  /** Rated AC frequency in Hz */
  acFrequency: ExtractedField<number>;

  // Performance
  /** Maximum efficiency as percentage */
  maxEfficiency: ExtractedField<number>;
  /** European/CEC weighted efficiency as percentage */
  euroEfficiency: ExtractedField<number>;

  // Physical
  /** Inverter length/width in mm */
  length: ExtractedField<number>;
  /** Inverter width/height in mm */
  width: ExtractedField<number>;
  /** Inverter height/depth in mm */
  height: ExtractedField<number>;
  /** Inverter weight in kg */
  weight: ExtractedField<number>;

  // Type
  /** Inverter type: 'string', 'central', or 'micro' */
  inverterType: ExtractedField<string>;
}

/**
 * Variant-specific specs for a single model in an inverter family
 * These differ between power ratings on a spec sheet
 */
export interface InverterVariant {
  /** Model name/number */
  model: ExtractedField<string>;
  /** AC power rating in kW */
  acPowerRating: ExtractedField<number>;
  /** Maximum DC power in kW */
  maxDcPower: ExtractedField<number>;
  /** Maximum DC input current in A */
  maxDcCurrent: ExtractedField<number>;
  /** Maximum AC output current in A */
  maxAcCurrent: ExtractedField<number>;
}

/**
 * An inverter family extracted from a spec sheet
 * Contains shared specs and an array of power variants
 */
export interface ExtractedInverterFamily {
  /** Specs shared across all variants */
  shared: SharedInverterSpecs;
  /** Array of power variants */
  variants: InverterVariant[];
}

/**
 * @deprecated Use ExtractedModuleFamily for multi-model support
 * Kept for backward compatibility
 */
export interface ExtractedModuleData {
  /** Manufacturer name */
  manufacturer: ExtractedField<string>;
  /** Model name/number */
  model: ExtractedField<string>;
  /** Module specifications */
  specs: ExtractedModuleSpecs;
}

/**
 * @deprecated Use SharedModuleSpecs + ModuleVariant for multi-model support
 * Kept for backward compatibility
 */
export interface ExtractedModuleSpecs {
  // Electrical (STC) - Required
  /** Peak power rating in Wp */
  powerRating: ExtractedField<number>;
  /** Open circuit voltage in V */
  voc: ExtractedField<number>;
  /** Short circuit current in A */
  isc: ExtractedField<number>;
  /** Voltage at maximum power point in V */
  vmp: ExtractedField<number>;
  /** Current at maximum power point in A */
  imp: ExtractedField<number>;
  /** Module efficiency as percentage */
  efficiency: ExtractedField<number>;

  // Physical - Required
  /** Module length in mm (longer dimension) */
  length: ExtractedField<number>;
  /** Module width in mm (shorter dimension) */
  width: ExtractedField<number>;

  // Physical - Optional
  /** Module thickness/depth in mm */
  thickness: ExtractedField<number>;
  /** Module weight in kg */
  weight: ExtractedField<number>;

  // Cell Info - Optional
  /** Cell technology type */
  cellType: ExtractedField<string>;
  /** Number of cells */
  cellCount: ExtractedField<number>;
  /** Whether module is bifacial */
  bifacial: ExtractedField<boolean>;
  /** Bifaciality factor (0-1) */
  bifacialityFactor: ExtractedField<number>;

  // Temperature Coefficients - Optional
  /** Power temperature coefficient in %/°C */
  tempCoeffPmax: ExtractedField<number>;
  /** Voltage temperature coefficient in %/°C */
  tempCoeffVoc: ExtractedField<number>;
  /** Current temperature coefficient in %/°C */
  tempCoeffIsc: ExtractedField<number>;
}

/**
 * Parsing stage for UI feedback
 */
export type ParsingStage =
  | 'idle'
  | 'reading-pdf'
  | 'extracting-text'
  | 'analyzing'
  | 'complete'
  | 'error';

/**
 * Result of module spec sheet parsing
 */
export interface ModuleParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Extracted module family if successful */
  data?: ExtractedModuleFamily;
  /** Error message if failed */
  error?: string;
  /** Non-fatal warnings */
  warnings?: string[];
}

/**
 * Result of inverter spec sheet parsing
 */
export interface InverterParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Extracted inverter family if successful */
  data?: ExtractedInverterFamily;
  /** Error message if failed */
  error?: string;
  /** Non-fatal warnings */
  warnings?: string[];
}

/**
 * @deprecated Use ModuleParseResult instead
 * Kept for backward compatibility
 */
export type SpecSheetParseResult = ModuleParseResult;

/**
 * Options for spec sheet parsing
 */
export interface SpecSheetParseOptions {
  /** Maximum pages to process (default: 5) */
  maxPages?: number;
  /** Maximum text length to send to LLM (default: 50000) */
  maxTextLength?: number;
}

/**
 * Create an empty ExtractedField with missing confidence
 */
export function createMissingField<T>(): ExtractedField<T> {
  return {
    value: null,
    confidence: 'missing',
  };
}

/**
 * Create an ExtractedField with a value
 */
export function createExtractedField<T>(
  value: T,
  confidence: ConfidenceLevel,
  source?: string
): ExtractedField<T> {
  return {
    value,
    confidence,
    source,
  };
}
