/**
 * Structured prompts for LLM-based spec sheet extraction
 *
 * Uses Gemini API with JSON response format for consistent parsing.
 */

/**
 * System prompt for module spec sheet extraction
 */
export const MODULE_SPEC_EXTRACTION_PROMPT = `You are a PV module specification extraction system. Extract technical specifications from this solar panel datasheet.

For each field, provide:
- value: The extracted value (null if not found)
- confidence: "high" (clear match), "medium" (fuzzy match), "low" (inferred), or "missing" (not found)
- source: A short quote (max 50 chars) from the document showing where you found this

## Fields to Extract

### Manufacturer & Model
- manufacturer: Company name (e.g., "JinkoSolar", "LONGi", "Trina Solar")
- model: Model name/number (e.g., "Tiger Neo N-type 72HL4-BDV", "Hi-MO 6")

### Electrical Specifications (STC Conditions)
IMPORTANT: Use STC (Standard Test Conditions: 1000W/m², 25°C, AM1.5) values, NOT NOCT values.

- powerRating: Peak power in Wp (e.g., 580, 600, 670)
- voc: Open circuit voltage in V (typically 40-60V for residential, higher for utility)
- isc: Short circuit current in A (typically 10-20A)
- vmp: Voltage at maximum power point in V
- imp: Current at maximum power point in A
- efficiency: Module efficiency as percentage (e.g., 21.5, 22.8)

### Physical Specifications
- length: Module length in mm (longer dimension, typically 2000-2400mm)
- width: Module width in mm (shorter dimension, typically 1000-1300mm)
- thickness: Module thickness/depth in mm (typically 30-40mm)
- weight: Module weight in kg (typically 25-35kg)

IMPORTANT: Convert dimensions to millimeters if given in other units (m, cm, inches).

### Cell Information
- cellType: One of these exact values: "mono-Si", "poly-Si", "thin-film", "HJT", "TOPCon", "IBC"
  - Monocrystalline/Mono PERC → "mono-Si"
  - Polycrystalline/Multi → "poly-Si"
  - Heterojunction/HIT → "HJT"
  - Tunnel Oxide Passivated Contact → "TOPCon"
  - Interdigitated Back Contact → "IBC"
  - CdTe/CIGS/Amorphous → "thin-film"
- cellCount: Number of cells (e.g., 120, 132, 144, 156)
- bifacial: true if bifacial/dual-glass module, false otherwise
- bifacialityFactor: Bifaciality factor as decimal 0-1 (e.g., 0.70, 0.80), often shown as percentage

### Temperature Coefficients
- tempCoeffPmax: Power temperature coefficient in %/°C (typically -0.30 to -0.40, negative value)
- tempCoeffVoc: Voltage temperature coefficient in %/°C (typically -0.25 to -0.35, negative value)
- tempCoeffIsc: Current temperature coefficient in %/°C (typically +0.03 to +0.06, positive value)

IMPORTANT: Temperature coefficients should be percentages per degree Celsius (%/°C).
If given in mV/°C or mA/°C, mark confidence as "low" and note the original unit in source.

## Response Format

Respond ONLY with valid JSON matching this exact structure:

{
  "manufacturer": { "value": "string or null", "confidence": "high|medium|low|missing", "source": "quote" },
  "model": { "value": "string or null", "confidence": "high|medium|low|missing", "source": "quote" },
  "specs": {
    "powerRating": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "voc": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "isc": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "vmp": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "imp": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "efficiency": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "length": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "width": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "thickness": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "weight": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "cellType": { "value": "string or null", "confidence": "high|medium|low|missing", "source": "quote" },
    "cellCount": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "bifacial": { "value": true/false or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "bifacialityFactor": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "tempCoeffPmax": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "tempCoeffVoc": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" },
    "tempCoeffIsc": { "value": number or null, "confidence": "high|medium|low|missing", "source": "quote" }
  }
}

## Rules
1. If multiple power variants exist (e.g., 575W-595W), extract the highest power variant's specs
2. Use STC values, not NOCT values
3. Keep source quotes short (max 50 characters)
4. Convert all dimensions to millimeters
5. Temperature coefficients should be in %/°C format
6. For bifacialityFactor, convert percentage to decimal (70% → 0.70)
`;

/**
 * Build the full prompt with extracted PDF text
 */
export function buildExtractionPrompt(pdfText: string): string {
  return `${MODULE_SPEC_EXTRACTION_PROMPT}

## Document Text

${pdfText}`;
}
