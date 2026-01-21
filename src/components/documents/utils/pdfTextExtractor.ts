/**
 * Enhanced PDF text extraction with position information
 *
 * Extracts text items from PDF pages along with their bounding box positions
 * in percentage coordinates (0-100) for use with the annotation system.
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';

/**
 * A single text item extracted from a PDF with position information
 */
export interface TextItem {
  /** The text content */
  str: string;
  /** X position as percentage (0-100) from left edge */
  x: number;
  /** Y position as percentage (0-100) from top edge */
  y: number;
  /** Width as percentage (0-100) of page width */
  width: number;
  /** Height as percentage (0-100) of page height */
  height: number;
  /** Page number (1-indexed) */
  page: number;
}

/**
 * Text data for a single page
 */
export interface PageTextData {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Full text of the page (concatenated) */
  text: string;
  /** Individual text items with positions */
  items: TextItem[];
  /** Original PDF page width in points */
  pageWidth: number;
  /** Original PDF page height in points */
  pageHeight: number;
}

/**
 * Text data for an entire document
 */
export interface DocumentTextData {
  /** Text data for each page */
  pages: PageTextData[];
  /** Full text of the document (all pages concatenated) */
  fullText: string;
  /** Total number of pages */
  pageCount: number;
}

// Average character width as fraction of font size (approximation)
const AVG_CHAR_WIDTH_RATIO = 0.5;

// Default font size when not available from transform
const DEFAULT_FONT_SIZE = 12;

/**
 * Extract text with position information from a single PDF page
 */
export async function extractPageTextWithPositions(
  pdfDocument: PDFDocumentProxy,
  pageNumber: number
): Promise<PageTextData> {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();

  const pageWidth = viewport.width;
  const pageHeight = viewport.height;

  const items: TextItem[] = [];
  let pageText = '';

  for (const item of textContent.items) {
    // Skip items without string content
    if (!('str' in item) || !item.str.trim()) {
      continue;
    }

    const text = item.str;
    pageText += text + ' ';

    // Extract position from transform matrix
    // transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const transform = item.transform;
    const translateX = transform[4];
    const translateY = transform[5];

    // Font size is typically derived from scaleY (transform[3])
    const fontSize = Math.abs(transform[3]) || DEFAULT_FONT_SIZE;

    // Calculate width: use item.width if available, otherwise estimate
    let itemWidth: number;
    if ('width' in item && typeof item.width === 'number') {
      itemWidth = item.width;
    } else {
      // Estimate based on character count and font size
      itemWidth = text.length * fontSize * AVG_CHAR_WIDTH_RATIO;
    }

    // Height is approximately the font size
    const itemHeight = fontSize;

    // Convert PDF coordinates (bottom-left origin) to percentage coordinates (top-left origin)
    // PDF Y increases upward, we need Y increasing downward
    const x = (translateX / pageWidth) * 100;
    const y = ((pageHeight - translateY) / pageHeight) * 100;
    const width = (itemWidth / pageWidth) * 100;
    const height = (itemHeight / pageHeight) * 100;

    // Clamp values to valid range
    items.push({
      str: text,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y - height)), // Adjust Y to top of text
      width: Math.max(0.1, Math.min(100 - x, width)),
      height: Math.max(0.1, Math.min(100 - y, height)),
      page: pageNumber,
    });
  }

  return {
    pageNumber,
    text: pageText.trim(),
    items,
    pageWidth,
    pageHeight,
  };
}

/**
 * Extract text with position information from an entire PDF document
 *
 * @throws Error if document has no extractable text (scanned/image PDF)
 * @throws Error if document exceeds size limits
 */
export async function extractDocumentText(
  pdfDocument: PDFDocumentProxy,
  options: {
    maxPages?: number;
    maxTextLength?: number;
  } = {}
): Promise<DocumentTextData> {
  const { maxPages = 50, maxTextLength = 100000 } = options;

  const numPages = pdfDocument.numPages;

  // Check page limit
  if (numPages > maxPages) {
    throw new Error(
      `Document has ${numPages} pages. Maximum supported is ${maxPages} pages for AI analysis.`
    );
  }

  const pages: PageTextData[] = [];
  let fullText = '';
  let totalTextLength = 0;

  for (let i = 1; i <= numPages; i++) {
    const pageData = await extractPageTextWithPositions(pdfDocument, i);
    pages.push(pageData);

    totalTextLength += pageData.text.length;

    // Check text length limit
    if (totalTextLength > maxTextLength) {
      throw new Error(
        `Document text exceeds maximum size (${maxTextLength} characters) for AI analysis.`
      );
    }

    // Add page separator for full text
    if (fullText) {
      fullText += '\n\n--- Page ' + i + ' ---\n\n';
    }
    fullText += pageData.text;
  }

  // Check if document has meaningful text
  if (totalTextLength < 50) {
    throw new Error(
      'This PDF appears to be scanned or image-based. Text extraction is not available for AI review.'
    );
  }

  return {
    pages,
    fullText,
    pageCount: numPages,
  };
}

/**
 * Find the position of a text string within a page's text items
 * Uses fuzzy matching to handle whitespace differences
 *
 * @returns LocationAnchor-compatible object or null if not found
 */
export function findTextPosition(
  searchText: string,
  pageItems: TextItem[],
  pageNumber: number
): { x: number; y: number; width: number; height: number; page: number } | null {
  if (!searchText || pageItems.length === 0) {
    return null;
  }

  // Normalize search text
  const normalizedSearch = searchText.toLowerCase().replace(/\s+/g, ' ').trim();

  if (!normalizedSearch) {
    return null;
  }

  // Build running text and track item positions
  let runningText = '';
  const itemPositions: Array<{ start: number; end: number; item: TextItem }> = [];

  for (const item of pageItems) {
    const start = runningText.length;
    runningText += item.str + ' ';
    const end = runningText.length;
    itemPositions.push({ start, end, item });
  }

  // Normalize running text and find match
  const normalizedRunning = runningText.toLowerCase().replace(/\s+/g, ' ');
  const matchIndex = normalizedRunning.indexOf(normalizedSearch);

  if (matchIndex === -1) {
    // Try finding a partial match (first 50 chars)
    const shortSearch = normalizedSearch.substring(0, 50);
    const shortMatchIndex = normalizedRunning.indexOf(shortSearch);

    if (shortMatchIndex === -1) {
      return null;
    }

    // Use short match
    return findBoundingBox(shortMatchIndex, shortMatchIndex + shortSearch.length, itemPositions, pageNumber);
  }

  return findBoundingBox(matchIndex, matchIndex + normalizedSearch.length, itemPositions, pageNumber);
}

/**
 * Find the bounding box that encompasses text items in a given range
 */
function findBoundingBox(
  startIndex: number,
  endIndex: number,
  itemPositions: Array<{ start: number; end: number; item: TextItem }>,
  pageNumber: number
): { x: number; y: number; width: number; height: number; page: number } | null {
  // Find items that overlap with the match range
  const matchingItems: TextItem[] = [];

  for (const { start, end, item } of itemPositions) {
    // Check if this item overlaps with the match range
    if (start < endIndex && end > startIndex) {
      matchingItems.push(item);
    }
  }

  if (matchingItems.length === 0) {
    return null;
  }

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of matchingItems) {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, item.y + item.height);
  }

  // Add padding (2% of page)
  const padding = 2;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(100, maxX + padding);
  maxY = Math.min(100, maxY + padding);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    page: pageNumber,
  };
}
