/**
 * LLM-based spec sheet parser
 *
 * Extracts module and inverter specifications from PDF datasheets using Gemini API.
 * Supports multi-model spec sheets (extracting all power variants).
 */

import { loadPDFFromBlob } from '@/components/documents/utils/pdfUtils';
import { extractDocumentText } from '@/components/documents/utils/pdfTextExtractor';
import { buildModuleExtractionPrompt, buildInverterExtractionPrompt } from './specSheetPrompts';
import { aiLogger } from '@/lib/aiLogger';
import type {
  ExtractedModuleFamily,
  SharedModuleSpecs,
  ModuleVariant,
  ExtractedInverterFamily,
  SharedInverterSpecs,
  InverterVariant,
  ExtractedField,
  ModuleParseResult,
  InverterParseResult,
  SpecSheetParseOptions,
  ConfidenceLevel,
} from '@/lib/types/specSheetParsing';

/** Gemini model for spec extraction */
const GEMINI_MODEL = 'gemini-3-flash-preview';

/**
 * Parse a module spec sheet PDF and extract specifications
 * Returns all power variants found in the spec sheet
 */
export async function parseModuleSpecSheet(
  pdfBlob: Blob,
  options: SpecSheetParseOptions = {}
): Promise<ModuleParseResult> {
  const { maxPages = 5, maxTextLength = 50000 } = options;

  try {
    // Step 1: Load and extract text from PDF
    const pdfDocument = await loadPDFFromBlob(pdfBlob);

    let textData;
    try {
      textData = await extractDocumentText(pdfDocument, {
        maxPages,
        maxTextLength,
      });
    } catch (extractError) {
      const message =
        extractError instanceof Error ? extractError.message : 'Failed to extract text';
      return {
        success: false,
        error: message,
      };
    }

    // Step 2: Build prompt and call Gemini API
    const prompt = buildModuleExtractionPrompt(textData.fullText);
    const geminiResponse = await callGeminiAPI(prompt);

    // Step 3: Parse and validate response
    const extractedData = parseModuleGeminiResponse(geminiResponse);

    // Step 4: Generate warnings for low confidence required fields
    const warnings = generateModuleWarnings(extractedData);

    return {
      success: true,
      data: extractedData,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Parse an inverter spec sheet PDF and extract specifications
 * Returns all power variants found in the spec sheet
 */
export async function parseInverterSpecSheet(
  pdfBlob: Blob,
  options: SpecSheetParseOptions = {}
): Promise<InverterParseResult> {
  const { maxPages = 5, maxTextLength = 50000 } = options;

  try {
    // Step 1: Load and extract text from PDF
    const pdfDocument = await loadPDFFromBlob(pdfBlob);

    let textData;
    try {
      textData = await extractDocumentText(pdfDocument, {
        maxPages,
        maxTextLength,
      });
    } catch (extractError) {
      const message =
        extractError instanceof Error ? extractError.message : 'Failed to extract text';
      return {
        success: false,
        error: message,
      };
    }

    // Step 2: Build prompt and call Gemini API
    const prompt = buildInverterExtractionPrompt(textData.fullText);
    const geminiResponse = await callGeminiAPI(prompt);

    // Step 3: Parse and validate response
    const extractedData = parseInverterGeminiResponse(geminiResponse);

    // Step 4: Generate warnings for low confidence required fields
    const warnings = generateInverterWarnings(extractedData);

    return {
      success: true,
      data: extractedData,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Call the Gemini API for spec extraction
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.'
    );
  }

  const finish = aiLogger.start({
    feature: 'spec-sheet-parsing',
    model: GEMINI_MODEL,
    promptLength: prompt.length,
    hasImageInput: false,
  });

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Low temperature for consistent extraction
      topP: 0.8,
      maxOutputTokens: 8192, // Increased for multi-model responses
      responseMimeType: 'application/json',
    },
  };

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    finish({ status: 'error', error: message });
    throw err;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    let errorMessage: string;
    if (response.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
    } else if (response.status === 400) {
      const errorMsg = (errorData as { error?: { message?: string } }).error?.message || '';
      errorMessage = `Request error: ${errorMsg || 'Try with a smaller document.'}`;
    } else {
      errorMessage =
        (errorData as { error?: { message?: string } }).error?.message ||
        `API request failed: ${response.status}`;
    }

    finish({ status: 'error', httpStatus: response.status, error: errorMessage });
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Extract token usage if available
  const usageMetadata = data.usageMetadata;
  const tokenUsage = usageMetadata
    ? {
        promptTokens: usageMetadata.promptTokenCount,
        completionTokens: usageMetadata.candidatesTokenCount,
        totalTokens: usageMetadata.totalTokenCount,
      }
    : undefined;

  // Extract text from response
  const textPart = data.candidates?.[0]?.content?.parts?.find(
    (part: { text?: string }) => part.text
  );

  if (!textPart?.text) {
    finish({ status: 'error', httpStatus: response.status, error: 'No text in response', tokenUsage });
    throw new Error('No response received from AI. Please try again.');
  }

  finish({ status: 'success', httpStatus: response.status, tokenUsage });
  return textPart.text;
}

/**
 * Parse and validate Gemini response for modules
 */
function parseModuleGeminiResponse(responseText: string): ExtractedModuleFamily {
  // Remove markdown code blocks if present
  let jsonText = responseText.trim();

  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  // Try to find JSON object if response has extra text
  if (!jsonText.startsWith('{')) {
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    // Try to repair truncated JSON
    const repairedJson = repairTruncatedJson(jsonText);
    try {
      parsed = JSON.parse(repairedJson);
    } catch {
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  const response = parsed as Record<string, unknown>;

  // Validate and normalize the response
  return normalizeModuleData(response);
}

/**
 * Attempt to repair truncated JSON
 */
function repairTruncatedJson(jsonText: string): string {
  let repaired = jsonText.trim();

  if (repaired.endsWith('}')) {
    return repaired;
  }

  // Count unclosed braces and brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of repaired) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
  }

  // Close unclosed string
  if (inString) {
    repaired += '"';
  }

  // Remove trailing comma
  repaired = repaired.replace(/,\s*$/, '');

  // Close unclosed brackets/braces
  while (bracketCount > 0) {
    repaired += ']';
    bracketCount--;
  }
  while (braceCount > 0) {
    repaired += '}';
    braceCount--;
  }

  return repaired;
}

/**
 * Normalize and validate extracted module data
 */
function normalizeModuleData(response: Record<string, unknown>): ExtractedModuleFamily {
  const sharedRaw = (response.shared as Record<string, unknown>) || {};
  const variantsRaw = (response.variants as unknown[]) || [];

  // Normalize shared specs
  const shared: SharedModuleSpecs = {
    manufacturer: normalizeField<string>(sharedRaw.manufacturer),
    length: normalizeField<number>(sharedRaw.length),
    width: normalizeField<number>(sharedRaw.width),
    thickness: normalizeField<number>(sharedRaw.thickness),
    weight: normalizeField<number>(sharedRaw.weight),
    cellType: normalizeCellType(sharedRaw.cellType),
    cellCount: normalizeField<number>(sharedRaw.cellCount),
    bifacial: normalizeField<boolean>(sharedRaw.bifacial),
    bifacialityFactor: normalizeField<number>(sharedRaw.bifacialityFactor),
    tempCoeffPmax: normalizeField<number>(sharedRaw.tempCoeffPmax),
    tempCoeffVoc: normalizeField<number>(sharedRaw.tempCoeffVoc),
    tempCoeffIsc: normalizeField<number>(sharedRaw.tempCoeffIsc),
  };

  // Normalize variants
  const variants: ModuleVariant[] = variantsRaw.map((v) => {
    const variant = v as Record<string, unknown>;
    return {
      model: normalizeField<string>(variant.model),
      powerRating: normalizeField<number>(variant.powerRating),
      efficiency: normalizeField<number>(variant.efficiency),
      voc: normalizeField<number>(variant.voc),
      isc: normalizeField<number>(variant.isc),
      vmp: normalizeField<number>(variant.vmp),
      imp: normalizeField<number>(variant.imp),
    };
  });

  // Sort variants by power rating
  variants.sort((a, b) => {
    const powerA = a.powerRating.value ?? 0;
    const powerB = b.powerRating.value ?? 0;
    return powerA - powerB;
  });

  return { shared, variants };
}

/**
 * Normalize a single field
 */
function normalizeField<T>(field: unknown): ExtractedField<T> {
  if (!field || typeof field !== 'object') {
    return { value: null, confidence: 'missing' };
  }

  const f = field as Record<string, unknown>;

  // Validate confidence level
  const validConfidences: ConfidenceLevel[] = ['high', 'medium', 'low', 'missing'];
  const confidence = validConfidences.includes(f.confidence as ConfidenceLevel)
    ? (f.confidence as ConfidenceLevel)
    : 'missing';

  return {
    value: f.value as T | null,
    confidence,
    source: typeof f.source === 'string' ? f.source : undefined,
  };
}

/**
 * Normalize cell type to valid values
 */
function normalizeCellType(field: unknown): ExtractedField<string> {
  const normalized = normalizeField<string>(field);

  if (normalized.value) {
    const validTypes = ['mono-Si', 'poly-Si', 'thin-film', 'HJT', 'TOPCon', 'IBC'];
    const value = normalized.value.toLowerCase();

    // Map common variations
    if (value.includes('topcon') || value.includes('tunnel') || value.includes('n-type i-topcon')) {
      normalized.value = 'TOPCon';
    } else if (value.includes('hjt') || value.includes('het') || value.includes('hit')) {
      normalized.value = 'HJT';
    } else if (value.includes('ibc') || value.includes('back contact')) {
      normalized.value = 'IBC';
    } else if (value.includes('mono') || value.includes('perc')) {
      normalized.value = 'mono-Si';
    } else if (value.includes('poly') || value.includes('multi')) {
      normalized.value = 'poly-Si';
    } else if (
      value.includes('thin') ||
      value.includes('cdte') ||
      value.includes('cigs')
    ) {
      normalized.value = 'thin-film';
    } else if (!validTypes.includes(normalized.value)) {
      // If not a valid type, keep the value but lower confidence
      normalized.confidence = 'low';
    }
  }

  return normalized;
}

/**
 * Generate warnings for low confidence required module fields
 */
function generateModuleWarnings(data: ExtractedModuleFamily): string[] {
  const warnings: string[] = [];

  // Check shared specs
  const sharedRequired: Array<{ name: string; field: ExtractedField<unknown> }> = [
    { name: 'Manufacturer', field: data.shared.manufacturer },
    { name: 'Length', field: data.shared.length },
    { name: 'Width', field: data.shared.width },
  ];

  for (const { name, field } of sharedRequired) {
    if (field.confidence === 'missing') {
      warnings.push(`${name} could not be extracted from the document.`);
    } else if (field.confidence === 'low') {
      warnings.push(`${name} extraction has low confidence. Please verify.`);
    }
  }

  // Check if any variants were found
  if (data.variants.length === 0) {
    warnings.push('No power variants found in the document.');
  } else {
    // Check first variant for required electrical specs
    const firstVariant = data.variants[0];
    const variantRequired: Array<{ name: string; field: ExtractedField<unknown> }> = [
      { name: 'Power Rating', field: firstVariant.powerRating },
      { name: 'Voc', field: firstVariant.voc },
      { name: 'Isc', field: firstVariant.isc },
    ];

    for (const { name, field } of variantRequired) {
      if (field.confidence === 'missing') {
        warnings.push(`${name} could not be extracted for some variants.`);
      }
    }
  }

  return warnings;
}

/**
 * Check if Gemini API key is configured
 */
export function isGeminiConfigured(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}

// ============================================================================
// INVERTER PARSING
// ============================================================================

/**
 * Parse and validate Gemini response for inverters
 */
function parseInverterGeminiResponse(responseText: string): ExtractedInverterFamily {
  // Remove markdown code blocks if present
  let jsonText = responseText.trim();

  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  // Try to find JSON object if response has extra text
  if (!jsonText.startsWith('{')) {
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    // Try to repair truncated JSON
    const repairedJson = repairTruncatedJson(jsonText);
    try {
      parsed = JSON.parse(repairedJson);
    } catch {
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }

  const response = parsed as Record<string, unknown>;

  // Validate and normalize the response
  return normalizeInverterData(response);
}

/**
 * Normalize and validate extracted inverter data
 */
function normalizeInverterData(response: Record<string, unknown>): ExtractedInverterFamily {
  const sharedRaw = (response.shared as Record<string, unknown>) || {};
  const variantsRaw = (response.variants as unknown[]) || [];

  // Normalize shared specs
  const shared: SharedInverterSpecs = {
    manufacturer: normalizeField<string>(sharedRaw.manufacturer),
    // DC Input
    maxDcVoltage: normalizeField<number>(sharedRaw.maxDcVoltage),
    mpptVoltageMin: normalizeField<number>(sharedRaw.mpptVoltageMin),
    mpptVoltageMax: normalizeField<number>(sharedRaw.mpptVoltageMax),
    mpptCount: normalizeField<number>(sharedRaw.mpptCount),
    stringsPerMppt: normalizeField<number>(sharedRaw.stringsPerMppt),
    // AC Output
    acVoltage: normalizeField<number>(sharedRaw.acVoltage),
    acFrequency: normalizeField<number>(sharedRaw.acFrequency),
    // Performance
    maxEfficiency: normalizeField<number>(sharedRaw.maxEfficiency),
    euroEfficiency: normalizeField<number>(sharedRaw.euroEfficiency),
    // Physical
    length: normalizeField<number>(sharedRaw.length),
    width: normalizeField<number>(sharedRaw.width),
    height: normalizeField<number>(sharedRaw.height),
    weight: normalizeField<number>(sharedRaw.weight),
    // Type
    inverterType: normalizeInverterType(sharedRaw.inverterType),
  };

  // Normalize variants
  const variants: InverterVariant[] = variantsRaw.map((v) => {
    const variant = v as Record<string, unknown>;
    return {
      model: normalizeField<string>(variant.model),
      acPowerRating: normalizeField<number>(variant.acPowerRating),
      maxDcPower: normalizeField<number>(variant.maxDcPower),
      maxDcCurrent: normalizeField<number>(variant.maxDcCurrent),
      maxAcCurrent: normalizeField<number>(variant.maxAcCurrent),
    };
  });

  // Sort variants by AC power rating
  variants.sort((a, b) => {
    const powerA = a.acPowerRating.value ?? 0;
    const powerB = b.acPowerRating.value ?? 0;
    return powerA - powerB;
  });

  return { shared, variants };
}

/**
 * Normalize inverter type to valid values
 */
function normalizeInverterType(field: unknown): ExtractedField<string> {
  const normalized = normalizeField<string>(field);

  if (normalized.value) {
    const validTypes = ['string', 'central', 'micro'];
    const value = normalized.value.toLowerCase();

    // Map common variations
    if (value.includes('string')) {
      normalized.value = 'string';
    } else if (value.includes('central') || value.includes('utility')) {
      normalized.value = 'central';
    } else if (value.includes('micro')) {
      normalized.value = 'micro';
    } else if (!validTypes.includes(normalized.value)) {
      // Default to string inverter for most cases
      normalized.value = 'string';
      normalized.confidence = 'low';
    }
  } else {
    // Default to string if not specified
    normalized.value = 'string';
    normalized.confidence = 'low';
  }

  return normalized;
}

/**
 * Generate warnings for low confidence required inverter fields
 */
function generateInverterWarnings(data: ExtractedInverterFamily): string[] {
  const warnings: string[] = [];

  // Check shared specs
  const sharedRequired: Array<{ name: string; field: ExtractedField<unknown> }> = [
    { name: 'Manufacturer', field: data.shared.manufacturer },
    { name: 'Max DC Voltage', field: data.shared.maxDcVoltage },
    { name: 'AC Voltage', field: data.shared.acVoltage },
  ];

  for (const { name, field } of sharedRequired) {
    if (field.confidence === 'missing') {
      warnings.push(`${name} could not be extracted from the document.`);
    } else if (field.confidence === 'low') {
      warnings.push(`${name} extraction has low confidence. Please verify.`);
    }
  }

  // Check if any variants were found
  if (data.variants.length === 0) {
    warnings.push('No power variants found in the document.');
  } else {
    // Check first variant for required specs
    const firstVariant = data.variants[0];
    const variantRequired: Array<{ name: string; field: ExtractedField<unknown> }> = [
      { name: 'AC Power Rating', field: firstVariant.acPowerRating },
    ];

    for (const { name, field } of variantRequired) {
      if (field.confidence === 'missing') {
        warnings.push(`${name} could not be extracted for some variants.`);
      }
    }
  }

  return warnings;
}
