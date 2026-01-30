/**
 * Hook for managing spec sheet parsing state
 *
 * Handles the async parsing flow with stage tracking for UI feedback.
 */

import { useState, useCallback } from 'react';
import { parseModuleSpecSheet, isGeminiConfigured } from '@/lib/ai/specSheetParser';
import type {
  ExtractedModuleData,
  ParsingStage,
  SpecSheetParseResult,
} from '@/lib/types/specSheetParsing';

export interface UseSpecSheetParserReturn {
  /** Current parsing stage */
  stage: ParsingStage;
  /** Parsed result data */
  result: ExtractedModuleData | null;
  /** Error message if parsing failed */
  error: string | null;
  /** Non-fatal warnings */
  warnings: string[];
  /** Whether Gemini API is configured */
  isConfigured: boolean;
  /** Parse a PDF file */
  parseFile: (file: File) => Promise<void>;
  /** Reset state to idle */
  reset: () => void;
}

/**
 * Hook for spec sheet parsing with state management
 */
export function useSpecSheetParser(): UseSpecSheetParserReturn {
  const [stage, setStage] = useState<ParsingStage>('idle');
  const [result, setResult] = useState<ExtractedModuleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const isConfigured = isGeminiConfigured();

  const parseFile = useCallback(async (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      setStage('error');
      return;
    }

    // Check API configuration
    if (!isGeminiConfigured()) {
      setError('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.');
      setStage('error');
      return;
    }

    // Reset state
    setError(null);
    setWarnings([]);
    setResult(null);

    try {
      // Stage 1: Reading PDF
      setStage('reading-pdf');
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });

      // Stage 2: Extracting text (happens inside parseModuleSpecSheet)
      setStage('extracting-text');
      // Small delay to show the stage transition
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Stage 3: Analyzing with AI
      setStage('analyzing');

      const parseResult: SpecSheetParseResult = await parseModuleSpecSheet(blob);

      if (parseResult.success && parseResult.data) {
        setResult(parseResult.data);
        setWarnings(parseResult.warnings || []);
        setStage('complete');
      } else {
        setError(parseResult.error || 'Failed to parse spec sheet.');
        setStage('error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setStage('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStage('idle');
    setResult(null);
    setError(null);
    setWarnings([]);
  }, []);

  return {
    stage,
    result,
    error,
    warnings,
    isConfigured,
    parseFile,
    reset,
  };
}

/**
 * Get human-readable message for parsing stage
 */
export function getStageMessage(stage: ParsingStage): string {
  switch (stage) {
    case 'idle':
      return 'Ready to upload';
    case 'reading-pdf':
      return 'Reading PDF file...';
    case 'extracting-text':
      return 'Extracting text content...';
    case 'analyzing':
      return 'Analyzing with AI...';
    case 'complete':
      return 'Extraction complete';
    case 'error':
      return 'Extraction failed';
    default:
      return '';
  }
}
