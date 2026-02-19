import { db } from './db';
import type { AiFeature, AiLogEntry, AiLogStatus } from './types/aiLog';

interface AiCallContext {
  feature: AiFeature;
  model: string;
  promptLength: number;
  hasImageInput: boolean;
  metadata?: Record<string, unknown>;
}

interface AiCallResult {
  status: AiLogStatus;
  httpStatus?: number;
  error?: string;
  tokenUsage?: AiLogEntry['tokenUsage'];
}

/**
 * Start tracking an AI API call. Returns a `finish` callback to record the outcome.
 *
 * Usage:
 *   const finish = aiLogger.start({ feature, model, promptLength, hasImageInput });
 *   // ... make API call ...
 *   finish({ status: 'success', httpStatus: 200 });
 */
function start(context: AiCallContext) {
  const startTime = performance.now();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  console.log(
    `[AI:${context.feature}] Starting call — model=${context.model}, promptLen=${context.promptLength}, hasImage=${context.hasImageInput}`
  );

  return function finish(result: AiCallResult) {
    const durationMs = Math.round(performance.now() - startTime);

    const entry: AiLogEntry = {
      id,
      timestamp,
      feature: context.feature,
      model: context.model,
      status: result.status,
      durationMs,
      promptLength: context.promptLength,
      hasImageInput: context.hasImageInput,
      httpStatus: result.httpStatus,
      error: result.error,
      tokenUsage: result.tokenUsage,
      metadata: context.metadata,
    };

    if (result.status === 'error') {
      console.error(
        `[AI:${context.feature}] FAILED after ${durationMs}ms — HTTP ${result.httpStatus ?? '?'}: ${result.error}`
      );
    } else {
      console.log(
        `[AI:${context.feature}] Completed in ${durationMs}ms — HTTP ${result.httpStatus ?? '?'}` +
          (result.tokenUsage?.totalTokens
            ? `, tokens=${result.tokenUsage.totalTokens}`
            : '')
      );
    }

    // Persist to IndexedDB (non-blocking, never throws)
    db.aiLogs.add(entry).catch((err) => {
      console.warn('[AI Logger] Failed to persist log entry:', err);
    });
  };
}

export const aiLogger = { start };
