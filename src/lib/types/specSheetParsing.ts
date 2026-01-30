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
 * Result of spec sheet parsing
 */
export interface SpecSheetParseResult {
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
