/**
 * LLM-based spec sheet parser
 *
 * Extracts module specifications from PDF datasheets using Gemini API.
 * Reuses existing PDF extraction utilities and follows patterns from documentReview.ts.
 */

import { loadPDFFromBlob } from '@/components/documents/utils/pdfUtils';
import { extractDocumentText } from '@/components/documents/utils/pdfTextExtractor';
import { buildExtractionPrompt } from './specSheetPrompts';
import type {
  ExtractedModuleData,
  ExtractedField,
  SpecSheetParseResult,
  SpecSheetParseOptions,
  ConfidenceLevel,
} from '@/lib/types/specSheetParsing';

/** Gemini model for spec extraction */
const GEMINI_MODEL = 'gemini-3-flash-preview';

/**
 * Parse a module spec sheet PDF and extract specifications
 */
export async function parseModuleSpecSheet(
  pdfBlob: Blob,
  options: SpecSheetParseOptions = {}
): Promise<SpecSheetParseResult> {
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
    const prompt = buildExtractionPrompt(textData.fullText);
    const geminiResponse = await callGeminiAPI(prompt);

    // Step 3: Parse and validate response
    const extractedData = parseGeminiResponse(geminiResponse);

    // Step 4: Generate warnings for low confidence required fields
    const warnings = generateWarnings(extractedData);

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

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Low temperature for consistent extraction
      topP: 0.8,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a few minutes.');
    }
    if (response.status === 400) {
      const errorMsg = (errorData as { error?: { message?: string } }).error?.message || '';
      throw new Error(`Request error: ${errorMsg || 'Try with a smaller document.'}`);
    }

    const errorMessage =
      (errorData as { error?: { message?: string } }).error?.message ||
      `API request failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Extract text from response
  const textPart = data.candidates?.[0]?.content?.parts?.find(
    (part: { text?: string }) => part.text
  );

  if (!textPart?.text) {
    throw new Error('No response received from AI. Please try again.');
  }

  return textPart.text;
}

/**
 * Parse and validate Gemini response
 */
function parseGeminiResponse(responseText: string): ExtractedModuleData {
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
  return normalizeExtractedData(response);
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
 * Normalize and validate extracted data
 */
function normalizeExtractedData(response: Record<string, unknown>): ExtractedModuleData {
  const specs = (response.specs as Record<string, unknown>) || {};

  return {
    manufacturer: normalizeField<string>(response.manufacturer),
    model: normalizeField<string>(response.model),
    specs: {
      // Electrical
      powerRating: normalizeField<number>(specs.powerRating),
      voc: normalizeField<number>(specs.voc),
      isc: normalizeField<number>(specs.isc),
      vmp: normalizeField<number>(specs.vmp),
      imp: normalizeField<number>(specs.imp),
      efficiency: normalizeField<number>(specs.efficiency),
      // Physical
      length: normalizeField<number>(specs.length),
      width: normalizeField<number>(specs.width),
      thickness: normalizeField<number>(specs.thickness),
      weight: normalizeField<number>(specs.weight),
      // Cell info
      cellType: normalizeCellType(specs.cellType),
      cellCount: normalizeField<number>(specs.cellCount),
      bifacial: normalizeField<boolean>(specs.bifacial),
      bifacialityFactor: normalizeField<number>(specs.bifacialityFactor),
      // Temperature coefficients
      tempCoeffPmax: normalizeField<number>(specs.tempCoeffPmax),
      tempCoeffVoc: normalizeField<number>(specs.tempCoeffVoc),
      tempCoeffIsc: normalizeField<number>(specs.tempCoeffIsc),
    },
  };
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
    if (value.includes('mono') || value.includes('perc')) {
      normalized.value = 'mono-Si';
    } else if (value.includes('poly') || value.includes('multi')) {
      normalized.value = 'poly-Si';
    } else if (value.includes('hjt') || value.includes('het') || value.includes('hit')) {
      normalized.value = 'HJT';
    } else if (value.includes('topcon') || value.includes('tunnel')) {
      normalized.value = 'TOPCon';
    } else if (value.includes('ibc') || value.includes('back contact')) {
      normalized.value = 'IBC';
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
 * Generate warnings for low confidence required fields
 */
function generateWarnings(data: ExtractedModuleData): string[] {
  const warnings: string[] = [];

  // Required fields that should have high/medium confidence
  const requiredFields: Array<{
    name: string;
    field: ExtractedField<unknown>;
  }> = [
    { name: 'Power Rating', field: data.specs.powerRating },
    { name: 'Voc', field: data.specs.voc },
    { name: 'Isc', field: data.specs.isc },
    { name: 'Vmp', field: data.specs.vmp },
    { name: 'Imp', field: data.specs.imp },
    { name: 'Efficiency', field: data.specs.efficiency },
    { name: 'Length', field: data.specs.length },
    { name: 'Width', field: data.specs.width },
  ];

  for (const { name, field } of requiredFields) {
    if (field.confidence === 'missing') {
      warnings.push(`${name} could not be extracted from the document.`);
    } else if (field.confidence === 'low') {
      warnings.push(`${name} extraction has low confidence. Please verify.`);
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
