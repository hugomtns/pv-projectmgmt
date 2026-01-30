/**
 * Structured prompts for LLM-based spec sheet extraction
 *
 * Uses Gemini API with JSON response format for consistent parsing.
 * Supports multi-model spec sheets (extracting all power variants).
 */

/**
 * System prompt for module spec sheet extraction (multi-model support)
 */
export const MODULE_SPEC_EXTRACTION_PROMPT = `You are a PV module specification extraction system. Extract ALL power variants from this solar panel datasheet.

Most spec sheets contain MULTIPLE power variants (e.g., 490W, 495W, 500W, 505W, 510W, 515W). Extract ALL of them.

For each field, provide:
- value: The extracted value (null if not found)
- confidence: "high" (clear match), "medium" (fuzzy match), "low" (inferred), or "missing" (not found)
- source: A short quote (max 40 chars) from the document

## Structure

The response has two sections:
1. **shared**: Specs that are THE SAME across all power variants (physical dimensions, cell info, temp coefficients)
2. **variants**: An ARRAY of electrical specs, one entry per power variant

## Shared Specifications (extract ONCE)

### Manufacturer
- manufacturer: Company name (e.g., "JinkoSolar", "LONGi", "Trina Solar")

### Physical Specifications
- length: Module length in mm (longer dimension, typically 2000-2400mm)
- width: Module width in mm (shorter dimension, typically 1000-1300mm)
- thickness: Module thickness/depth in mm (typically 30-40mm)
- weight: Module weight in kg (typically 25-35kg)

IMPORTANT: Convert dimensions to millimeters if given in other units.

### Cell Information
- cellType: One of: "mono-Si", "poly-Si", "thin-film", "HJT", "TOPCon", "IBC"
  - Monocrystalline/Mono PERC → "mono-Si"
  - Polycrystalline/Multi → "poly-Si"
  - Heterojunction/HIT → "HJT"
  - TOPCon/N-type i-TOPCon → "TOPCon"
  - IBC → "IBC"
  - CdTe/CIGS/Amorphous → "thin-film"
- cellCount: Number of cells (e.g., 108, 120, 132, 144)
- bifacial: true if bifacial/dual-glass, false otherwise
- bifacialityFactor: Bifaciality as decimal 0-1 (70% → 0.70)

### Temperature Coefficients
- tempCoeffPmax: Power temp coefficient in %/°C (typically -0.30 to -0.40)
- tempCoeffVoc: Voltage temp coefficient in %/°C (typically -0.25 to -0.35)
- tempCoeffIsc: Current temp coefficient in %/°C (typically +0.03 to +0.06)

## Variant Specifications (extract for EACH power variant)

For EACH power variant listed in the datasheet, extract:
- model: Full model name/number (e.g., "TSM-490NEG18RC.27", "PVSK-645M")
- powerRating: Peak power in Wp at STC
- efficiency: Module efficiency as percentage
- voc: Open circuit voltage in V (STC)
- isc: Short circuit current in A (STC)
- vmp: Voltage at maximum power point in V (STC)
- imp: Current at maximum power point in A (STC)

IMPORTANT: Use STC values (1000W/m², 25°C, AM1.5), NOT NOCT values.

## Response Format

{
  "shared": {
    "manufacturer": { "value": "string", "confidence": "high|medium|low|missing", "source": "quote" },
    "length": { "value": number, "confidence": "...", "source": "..." },
    "width": { "value": number, "confidence": "...", "source": "..." },
    "thickness": { "value": number, "confidence": "...", "source": "..." },
    "weight": { "value": number, "confidence": "...", "source": "..." },
    "cellType": { "value": "string", "confidence": "...", "source": "..." },
    "cellCount": { "value": number, "confidence": "...", "source": "..." },
    "bifacial": { "value": boolean, "confidence": "...", "source": "..." },
    "bifacialityFactor": { "value": number, "confidence": "...", "source": "..." },
    "tempCoeffPmax": { "value": number, "confidence": "...", "source": "..." },
    "tempCoeffVoc": { "value": number, "confidence": "...", "source": "..." },
    "tempCoeffIsc": { "value": number, "confidence": "...", "source": "..." }
  },
  "variants": [
    {
      "model": { "value": "TSM-490NEG18RC.27", "confidence": "high", "source": "TSM-490" },
      "powerRating": { "value": 490, "confidence": "high", "source": "490 Wp" },
      "efficiency": { "value": 22.0, "confidence": "high", "source": "22.0%" },
      "voc": { "value": 39.6, "confidence": "high", "source": "39.6 V" },
      "isc": { "value": 15.80, "confidence": "high", "source": "15.80 A" },
      "vmp": { "value": 32.9, "confidence": "high", "source": "32.9 V" },
      "imp": { "value": 14.91, "confidence": "high", "source": "14.91 A" }
    },
    {
      "model": { "value": "TSM-495NEG18RC.27", "confidence": "high", "source": "TSM-495" },
      "powerRating": { "value": 495, "confidence": "high", "source": "495 Wp" },
      ...
    }
  ]
}

## Rules
1. Extract ALL power variants - do not skip any
2. Use STC values, not NOCT values
3. Keep source quotes short (max 40 characters)
4. Convert dimensions to millimeters
5. Temperature coefficients in %/°C format
6. Order variants by power rating (lowest to highest)
7. If only one variant exists, still return it as an array with one element
`;

/**
 * Build the full module extraction prompt with extracted PDF text
 */
export function buildModuleExtractionPrompt(pdfText: string): string {
  return `${MODULE_SPEC_EXTRACTION_PROMPT}

## Document Text

${pdfText}`;
}

/**
 * @deprecated Use buildModuleExtractionPrompt instead
 */
export const buildExtractionPrompt = buildModuleExtractionPrompt;

// ============================================================================
// INVERTER EXTRACTION
// ============================================================================

/**
 * System prompt for inverter spec sheet extraction (multi-model support)
 */
export const INVERTER_SPEC_EXTRACTION_PROMPT = `You are a solar inverter specification extraction system. Extract ALL power variants from this inverter datasheet.

Some spec sheets contain MULTIPLE power variants (e.g., 250kW, 255kW). Extract ALL of them.

For each field, provide:
- value: The extracted value (null if not found)
- confidence: "high" (clear match), "medium" (fuzzy match), "low" (inferred), or "missing" (not found)
- source: A short quote (max 40 chars) from the document

## Structure

The response has two sections:
1. **shared**: Specs that are THE SAME across all power variants (DC input specs, AC voltage, efficiency, dimensions)
2. **variants**: An ARRAY of power-specific specs, one entry per model variant

## Shared Specifications (extract ONCE)

### Manufacturer
- manufacturer: Company name (e.g., "Huawei", "SMA", "Sungrow", "Chint Power Systems")

### DC Input
- maxDcVoltage: Maximum DC input voltage in V (typically 1000V or 1500V)
- mpptVoltageMin: MPPT minimum operating voltage in V
- mpptVoltageMax: MPPT maximum operating voltage in V
- mpptCount: Number of MPPT trackers (e.g., 1, 6, 12)
- stringsPerMppt: Number of string inputs per MPPT (if specified)

IMPORTANT: For MPPT voltage range like "500V-1500V", extract min=500 and max=1500.

### AC Output
- acVoltage: Nominal AC output voltage in V (e.g., 400, 480, 690, 800)
- acFrequency: Rated frequency in Hz (50 or 60)

### Performance
- maxEfficiency: Maximum efficiency as percentage (typically 98-99%)
- euroEfficiency: European or CEC weighted efficiency as percentage

### Physical
- length: Inverter width in mm (W dimension)
- width: Inverter height in mm (H dimension)
- height: Inverter depth in mm (D dimension)
- weight: Inverter weight in kg

IMPORTANT: Dimensions are often given as W×H×D or L×W×H. Convert to mm if needed.

### Type
- inverterType: One of: "string", "central", "micro"
  - String inverter: Most common, 3kW-350kW range
  - Central inverter: Large utility-scale, 500kW-5MW+
  - Microinverter: Panel-level, 200-500W

## Variant Specifications (extract for EACH power variant)

For EACH power variant listed in the datasheet, extract:
- model: Full model name/number (e.g., "SUN2000-330KTL-H1", "Si 250K-HV")
- acPowerRating: AC output power rating in kW (NOT kVA - if only kVA given, use that value)
- maxDcPower: Maximum DC input power in kW (if specified)
- maxDcCurrent: Maximum DC input current in A (total, or per-MPPT × mpptCount)
- maxAcCurrent: Maximum AC output current in A

## Response Format

{
  "shared": {
    "manufacturer": { "value": "string", "confidence": "high|medium|low|missing", "source": "quote" },
    "maxDcVoltage": { "value": number, "confidence": "...", "source": "..." },
    "mpptVoltageMin": { "value": number, "confidence": "...", "source": "..." },
    "mpptVoltageMax": { "value": number, "confidence": "...", "source": "..." },
    "mpptCount": { "value": number, "confidence": "...", "source": "..." },
    "stringsPerMppt": { "value": number, "confidence": "...", "source": "..." },
    "acVoltage": { "value": number, "confidence": "...", "source": "..." },
    "acFrequency": { "value": number, "confidence": "...", "source": "..." },
    "maxEfficiency": { "value": number, "confidence": "...", "source": "..." },
    "euroEfficiency": { "value": number, "confidence": "...", "source": "..." },
    "length": { "value": number, "confidence": "...", "source": "..." },
    "width": { "value": number, "confidence": "...", "source": "..." },
    "height": { "value": number, "confidence": "...", "source": "..." },
    "weight": { "value": number, "confidence": "...", "source": "..." },
    "inverterType": { "value": "string", "confidence": "...", "source": "..." }
  },
  "variants": [
    {
      "model": { "value": "Si 250K-HV", "confidence": "high", "source": "Si 250K-HV" },
      "acPowerRating": { "value": 250, "confidence": "high", "source": "250kVA" },
      "maxDcPower": { "value": null, "confidence": "missing", "source": null },
      "maxDcCurrent": { "value": 360, "confidence": "high", "source": "30A x 12" },
      "maxAcCurrent": { "value": 180.5, "confidence": "high", "source": "180.5A" }
    },
    {
      "model": { "value": "Si 255K-HV", "confidence": "high", "source": "Si 255K-HV" },
      "acPowerRating": { "value": 255, "confidence": "high", "source": "255kVA" },
      "maxDcPower": { "value": null, "confidence": "missing", "source": null },
      "maxDcCurrent": { "value": 360, "confidence": "high", "source": "30A x 12" },
      "maxAcCurrent": { "value": 184, "confidence": "high", "source": "184A" }
    }
  ]
}

## Rules
1. Extract ALL power variants - do not skip any
2. Keep source quotes short (max 40 characters)
3. Convert dimensions to millimeters
4. For MPPT current given as "30A x 12", calculate total (360A) for maxDcCurrent
5. Order variants by power rating (lowest to highest)
6. If only one variant exists, still return it as an array with one element
7. Use kW for power ratings (not kVA) - if document only shows kVA, use that value
8. For frequency, extract the primary value (50 or 60 Hz)
`;

/**
 * Build the full inverter extraction prompt with extracted PDF text
 */
export function buildInverterExtractionPrompt(pdfText: string): string {
  return `${INVERTER_SPEC_EXTRACTION_PROMPT}

## Document Text

${pdfText}`;
}
