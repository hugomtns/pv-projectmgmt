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
 * Extracted module data with confidence tracking for each field
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
 * Module specifications with confidence tracking
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
  /** Extracted data if successful */
  data?: ExtractedModuleData;
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
