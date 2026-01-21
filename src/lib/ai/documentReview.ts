/**
 * AI-Powered Document Review
 *
 * Uses Gemini 2.5 Flash to compare two versions of a PDF document
 * and identify changes (additions, deletions, modifications).
 * Creates highlight comments on the current version to mark discrepancies.
 */

import { db, getBlob } from '@/lib/db';
import { useDocumentStore } from '@/stores/documentStore';
import { loadPDFFromBlob } from '@/components/documents/utils/pdfUtils';
import {
  extractDocumentText,
  findTextPosition,
  type DocumentTextData,
} from '@/components/documents/utils/pdfTextExtractor';
import type { HighlightColor } from '@/lib/types/document';

/**
 * Types of changes that can be identified
 */
export type ChangeType = 'addition' | 'deletion' | 'modification';

/**
 * A single change identified by the AI
 */
export interface IdentifiedChange {
  type: ChangeType;
  previousText?: string;
  currentText?: string;
  pageNumber: number;
  summary: string;
}

/**
 * Result of the AI review process
 */
export interface ReviewResult {
  success: boolean;
  changes: IdentifiedChange[];
  summary: string;
  commentsCreated: number;
  error?: string;
}

/**
 * Progress callback for UI updates
 */
export type ProgressCallback = (stage: string, message: string) => void;

/**
 * Map change types to highlight colors
 */
const CHANGE_TYPE_COLORS: Record<ChangeType, HighlightColor> = {
  modification: 'orange',
  addition: 'green',
  deletion: 'pink',
};

/**
 * AI author name for comments
 */
const AI_AUTHOR = 'AI Assistant';

/**
 * Build the Gemini prompt for document comparison
 */
function buildComparisonPrompt(
  previousText: string,
  currentText: string,
  prevVersionNum: number,
  currVersionNum: number
): string {
  return `You are a document comparison assistant. Compare these two document versions and identify all meaningful changes.

PREVIOUS VERSION (Version ${prevVersionNum}):
${previousText}

CURRENT VERSION (Version ${currVersionNum}):
${currentText}

Analyze the documents and identify:
1. **Additions**: New content that appears only in the current version
2. **Deletions**: Content that was in the previous version but removed from current
3. **Modifications**: Content that was changed between versions

For each change found, provide:
- type: "addition", "deletion", or "modification"
- previousText: The exact text from the previous version (null for additions)
- currentText: The exact text in the current version (null for deletions)
- pageNumber: The page number where this change appears in the CURRENT version (use 1 if deletion)
- summary: A brief human-readable description of what changed

Important guidelines:
- Focus on meaningful content changes, not minor formatting or whitespace
- Quote the actual text involved (keep quotes under 200 characters, use ... for longer text)
- For modifications, include both the old and new text
- Page numbers should reference the CURRENT version (for positioning highlights)

Respond ONLY with valid JSON in this exact format:
{
  "changes": [
    {
      "type": "addition",
      "previousText": null,
      "currentText": "The new text that was added",
      "pageNumber": 1,
      "summary": "Added new paragraph about X"
    },
    {
      "type": "deletion",
      "previousText": "The text that was removed",
      "currentText": null,
      "pageNumber": 1,
      "summary": "Removed section discussing Y"
    },
    {
      "type": "modification",
      "previousText": "Original wording here",
      "currentText": "New wording here",
      "pageNumber": 2,
      "summary": "Changed terminology from A to B"
    }
  ],
  "overallSummary": "Brief summary of all changes between versions"
}

If no meaningful changes are found, return:
{
  "changes": [],
  "overallSummary": "No significant changes detected between versions"
}`;
}

/**
 * Parse the Gemini response to extract changes
 */
function parseGeminiResponse(responseText: string): {
  changes: IdentifiedChange[];
  overallSummary: string;
} {
  console.log('[AI Review] Raw Gemini response:', responseText.substring(0, 500) + '...');

  // Remove markdown code blocks if present
  let jsonText = responseText.trim();

  // Handle various markdown code block formats
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
    console.log('[AI Review] Extracted JSON from code block');
  }

  // Try to find JSON object if response has extra text
  if (!jsonText.startsWith('{')) {
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      console.log('[AI Review] Extracted JSON object from response');
    }
  }

  console.log('[AI Review] Cleaned JSON (first 500 chars):', jsonText.substring(0, 500));

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (parseError) {
    console.error('[AI Review] JSON parse error:', parseError);
    console.error('[AI Review] Failed JSON text:', jsonText);
    throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }

  const response = parsed as Record<string, unknown>;

  // Validate structure
  if (!response.changes || !Array.isArray(response.changes)) {
    console.error('[AI Review] Invalid response structure:', response);
    throw new Error('Invalid response format: missing changes array');
  }

  // Validate and normalize each change
  const changes: IdentifiedChange[] = (response.changes as unknown[]).map((change: unknown, index: number) => {
    const c = change as Record<string, unknown>;

    if (!c.type || !['addition', 'deletion', 'modification'].includes(c.type as string)) {
      console.warn(`[AI Review] Invalid change type at index ${index}:`, c.type);
      // Default to modification if type is invalid
      c.type = 'modification';
    }

    return {
      type: c.type as ChangeType,
      previousText: c.previousText as string | undefined,
      currentText: c.currentText as string | undefined,
      pageNumber: typeof c.pageNumber === 'number' ? c.pageNumber : 1,
      summary: (c.summary as string) || 'Change detected',
    };
  });

  console.log(`[AI Review] Parsed ${changes.length} changes from response`);

  return {
    changes,
    overallSummary: (response.overallSummary as string) || 'Document comparison complete',
  };
}

/**
 * Call the Gemini API for document comparison
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.'
    );
  }

  console.log('[AI Review] Calling Gemini API...');
  console.log('[AI Review] Prompt length:', prompt.length, 'characters');

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Low temperature for consistent, factual responses
      topP: 0.8,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json', // Request JSON response format
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  console.log('[AI Review] Gemini API response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[AI Review] Gemini API error:', errorData);

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
  console.log('[AI Review] Gemini API response received');

  // Extract text from response
  const textPart = data.candidates?.[0]?.content?.parts?.find(
    (part: { text?: string }) => part.text
  );

  if (!textPart?.text) {
    console.error('[AI Review] No text in response:', JSON.stringify(data, null, 2));
    throw new Error('No response received from AI. Please try again.');
  }

  return textPart.text;
}

/**
 * Format a comment for a change
 */
function formatChangeComment(change: IdentifiedChange): string {
  const truncate = (text: string | undefined, maxLen: number): string => {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  };

  switch (change.type) {
    case 'addition':
      return `[AI Review] Added:\n"${truncate(change.currentText, 150)}"\n\n${change.summary}`;

    case 'deletion':
      return `[AI Review] Removed:\n"${truncate(change.previousText, 150)}"\n\n${change.summary}`;

    case 'modification':
      return `[AI Review] Modified:\nFrom: "${truncate(change.previousText, 75)}"\nTo: "${truncate(change.currentText, 75)}"\n\n${change.summary}`;
  }
}

/**
 * Load PDF blob for a document version
 */
async function loadVersionBlob(versionId: string): Promise<Blob> {
  const version = await db.documentVersions.get(versionId);
  if (!version) {
    throw new Error(`Version not found: ${versionId}`);
  }

  const blobId = version.pdfFileBlob || version.originalFileBlob;
  const blob = await getBlob(blobId);

  if (!blob) {
    throw new Error(`File not found for version: ${versionId}`);
  }

  return blob;
}

/**
 * Run the full document review process
 */
export async function runDocumentReview(
  documentId: string,
  currentVersionId: string,
  previousVersionId: string,
  onProgress: ProgressCallback
): Promise<ReviewResult> {
  console.log('[AI Review] Starting document review');
  console.log('[AI Review] Document ID:', documentId);
  console.log('[AI Review] Current version:', currentVersionId);
  console.log('[AI Review] Previous version:', previousVersionId);

  try {
    // Stage 1: Extract text from both versions
    onProgress('extracting', 'Extracting text from documents...');
    console.log('[AI Review] Stage 1: Extracting text from documents...');

    const [prevBlob, currBlob] = await Promise.all([
      loadVersionBlob(previousVersionId),
      loadVersionBlob(currentVersionId),
    ]);
    console.log('[AI Review] Loaded blobs - prev:', prevBlob.size, 'bytes, curr:', currBlob.size, 'bytes');

    const [prevPdf, currPdf] = await Promise.all([
      loadPDFFromBlob(prevBlob),
      loadPDFFromBlob(currBlob),
    ]);
    console.log('[AI Review] Loaded PDFs - prev:', prevPdf.numPages, 'pages, curr:', currPdf.numPages, 'pages');

    const [prevTextData, currTextData] = await Promise.all([
      extractDocumentText(prevPdf),
      extractDocumentText(currPdf),
    ]);
    console.log('[AI Review] Extracted text - prev:', prevTextData.fullText.length, 'chars, curr:', currTextData.fullText.length, 'chars');

    // Get version numbers for the prompt
    const [prevVersion, currVersion] = await Promise.all([
      db.documentVersions.get(previousVersionId),
      db.documentVersions.get(currentVersionId),
    ]);

    const prevVersionNum = prevVersion?.versionNumber || 1;
    const currVersionNum = currVersion?.versionNumber || 2;

    // Stage 2: Send to Gemini for analysis
    onProgress('analyzing', 'Analyzing changes with AI...');
    console.log('[AI Review] Stage 2: Analyzing changes with AI...');

    const prompt = buildComparisonPrompt(
      prevTextData.fullText,
      currTextData.fullText,
      prevVersionNum,
      currVersionNum
    );

    const geminiResponse = await callGeminiAPI(prompt);
    const { changes, overallSummary } = parseGeminiResponse(geminiResponse);

    console.log('[AI Review] Analysis complete:', changes.length, 'changes found');
    console.log('[AI Review] Summary:', overallSummary);

    if (changes.length === 0) {
      console.log('[AI Review] No changes detected, completing');
      return {
        success: true,
        changes: [],
        summary: overallSummary,
        commentsCreated: 0,
      };
    }

    // Stage 3: Create comments for each change
    onProgress('creating-comments', 'Creating highlight comments...');
    console.log('[AI Review] Stage 3: Creating highlight comments...');

    const addComment = useDocumentStore.getState().addComment;
    let commentsCreated = 0;

    for (const change of changes) {
      // Find position for this change in the current version
      const position = findPositionForChange(change, currTextData);

      if (position) {
        const commentText = formatChangeComment(change);
        const highlightColor = CHANGE_TYPE_COLORS[change.type];

        console.log(`[AI Review] Creating ${change.type} comment on page ${position.page} at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);

        const commentId = await addComment(
          documentId,
          currentVersionId,
          commentText,
          {
            x: position.x,
            y: position.y,
            page: position.page,
            width: position.width,
            height: position.height,
            highlightColor,
          },
          [], // No mentions
          AI_AUTHOR // Author override
        );

        if (commentId) {
          commentsCreated++;
        }
      } else {
        console.warn('[AI Review] Could not find position for change:', change.summary);
      }
    }

    console.log('[AI Review] Review complete:', commentsCreated, 'comments created');

    return {
      success: true,
      changes,
      summary: overallSummary,
      commentsCreated,
    };
  } catch (error) {
    console.error('[AI Review] Error during review:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      success: false,
      changes: [],
      summary: '',
      commentsCreated: 0,
      error: message,
    };
  }
}

/**
 * Find the visual position for a change in the current document
 */
function findPositionForChange(
  change: IdentifiedChange,
  currentTextData: DocumentTextData
): { x: number; y: number; width: number; height: number; page: number } | null {
  // For additions and modifications, search for the current text
  // For deletions, we need to find surrounding context
  const searchText = change.type === 'deletion' ? change.previousText : change.currentText;

  if (!searchText) {
    return null;
  }

  // Determine which page to search
  const pageIndex = Math.min(change.pageNumber - 1, currentTextData.pages.length - 1);
  const page = currentTextData.pages[Math.max(0, pageIndex)];

  if (!page) {
    return null;
  }

  // Try to find position on the specified page
  let position = findTextPosition(searchText, page.items, page.pageNumber);

  // If not found on specified page, search all pages
  if (!position) {
    for (const p of currentTextData.pages) {
      position = findTextPosition(searchText, p.items, p.pageNumber);
      if (position) {
        break;
      }
    }
  }

  // For deletions where we can't find the exact text, try to find surrounding words
  if (!position && change.type === 'deletion' && change.previousText) {
    // Get first few words as context
    const words = change.previousText.split(/\s+/).slice(0, 3).join(' ');
    for (const p of currentTextData.pages) {
      position = findTextPosition(words, p.items, p.pageNumber);
      if (position) {
        break;
      }
    }
  }

  // If still no position found, use a default position on the specified page
  if (!position) {
    const targetPage = currentTextData.pages[Math.max(0, pageIndex)];
    if (targetPage && targetPage.items.length > 0) {
      // Use the first item's position as fallback
      const firstItem = targetPage.items[0];
      position = {
        x: Math.max(0, firstItem.x - 2),
        y: Math.max(0, firstItem.y - 2),
        width: Math.min(50, 100 - firstItem.x),
        height: 5,
        page: targetPage.pageNumber,
      };
    }
  }

  return position;
}
