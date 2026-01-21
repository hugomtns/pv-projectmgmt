import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - use unpkg for consistent loading
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface PDFDocumentInfo {
  numPages: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

/**
 * Load a PDF document from a blob
 */
export async function loadPDFFromBlob(blob: Blob): Promise<pdfjsLib.PDFDocumentProxy> {
  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

/**
 * Get PDF document metadata
 */
export async function getPDFInfo(pdfDocument: pdfjsLib.PDFDocumentProxy): Promise<PDFDocumentInfo> {
  const metadata = await pdfDocument.getMetadata();
  const info = metadata.info as Record<string, unknown>;

  return {
    numPages: pdfDocument.numPages,
    title: info?.Title as string | undefined,
    author: info?.Author as string | undefined,
    subject: info?.Subject as string | undefined,
    keywords: info?.Keywords as string | undefined,
    creator: info?.Creator as string | undefined,
    producer: info?.Producer as string | undefined,
    creationDate: info?.CreationDate ? new Date(info.CreationDate as string) : undefined,
    modificationDate: info?.ModDate ? new Date(info.ModDate as string) : undefined,
  };
}

/**
 * Render a PDF page to a canvas
 */
export async function renderPDFPage(
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.0
): Promise<void> {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  };

  await page.render(renderContext).promise;
}

/**
 * Get page dimensions for a specific page
 */
export async function getPageDimensions(
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<{ width: number; height: number }> {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.0 });

  return {
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Extract text content from a PDF page
 */
export async function extractPageText(
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<string> {
  const page = await pdfDocument.getPage(pageNumber);
  const textContent = await page.getTextContent();

  return textContent.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ');
}

/**
 * Calculate appropriate scale for fitting PDF to container
 */
export function calculateFitScale(
  pageWidth: number,
  pageHeight: number,
  containerWidth: number,
  containerHeight: number,
  fitMode: 'width' | 'height' | 'page'
): number {
  const widthScale = containerWidth / pageWidth;
  const heightScale = containerHeight / pageHeight;

  switch (fitMode) {
    case 'width':
      return widthScale;
    case 'height':
      return heightScale;
    case 'page':
      return Math.min(widthScale, heightScale);
    default:
      return 1.0;
  }
}
