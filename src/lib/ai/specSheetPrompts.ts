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
 * Build the full prompt with extracted PDF text
 */
export function buildExtractionPrompt(pdfText: string): string {
  return `${MODULE_SPEC_EXTRACTION_PROMPT}

## Document Text

${pdfText}`;
}
