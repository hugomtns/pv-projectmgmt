export type AiFeature = 'image-generation' | 'document-review' | 'spec-sheet-parsing';

export type AiLogStatus = 'success' | 'error' | 'timeout';

export interface AiLogEntry {
  id: string;
  timestamp: string;
  feature: AiFeature;
  model: string;
  status: AiLogStatus;
  /** Duration of the API call in milliseconds */
  durationMs: number;
  /** Prompt length in characters */
  promptLength: number;
  /** Whether the request included an image input */
  hasImageInput: boolean;
  /** HTTP status code from the API response */
  httpStatus?: number;
  /** Error message if status is 'error' */
  error?: string;
  /** Token usage from the API response (if available) */
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Extra context for debugging */
  metadata?: Record<string, unknown>;
}

export interface AiLogFilters {
  feature?: AiFeature;
  status?: AiLogStatus;
  dateFrom?: string;
  dateTo?: string;
}
