import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';

export type SupportedFileType = 'pdf' | 'image' | 'docx';

/**
 * Determine file type from blob's MIME type
 */
export function getFileType(blob: Blob): SupportedFileType | null {
  const type = blob.type.toLowerCase();

  if (type === 'application/pdf') {
    return 'pdf';
  }

  if (type.startsWith('image/')) {
    return 'image';
  }

  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword'
  ) {
    return 'docx';
  }

  return null;
}

/**
 * Validate file size (max 50MB)
 */
export function validateFileSize(blob: Blob): boolean {
  const maxSize = 50 * 1024 * 1024; // 50MB
  return blob.size <= maxSize;
}

/**
 * Validate file type
 */
export function validateFileType(blob: Blob): boolean {
  const fileType = getFileType(blob);
  return fileType !== null;
}

/**
 * Convert DOCX to PDF using mammoth.js and jsPDF
 * Returns a PDF blob
 */
export async function convertDocxToPdf(docxBlob: Blob): Promise<Blob> {
  // Read DOCX file
  const arrayBuffer = await docxBlob.arrayBuffer();

  // Convert DOCX to HTML using mammoth
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  tempDiv.style.width = '8.5in'; // Standard letter width
  tempDiv.style.padding = '1in';
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  tempDiv.style.fontSize = '12pt';
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  document.body.appendChild(tempDiv);

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  // Get content height
  const contentHeight = tempDiv.scrollHeight;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Split content across pages
  let position = 0;
  let pageNumber = 0;

  while (position < contentHeight) {
    if (pageNumber > 0) {
      pdf.addPage();
    }

    // Add content to PDF page
    // Note: This is a simplified approach. For production, consider using html2canvas or html2pdf
    const text = tempDiv.textContent || '';
    const lines = pdf.splitTextToSize(text, pageWidth - 72); // 1in margins

    pdf.text(lines, 36, 36 + (pageNumber === 0 ? 0 : -position));

    position += pageHeight;
    pageNumber++;
  }

  // Clean up
  document.body.removeChild(tempDiv);

  // Convert PDF to blob
  const pdfBlob = pdf.output('blob');
  return pdfBlob;
}

/**
 * Convert image to PDF
 * Returns a PDF blob with the image embedded
 */
export async function convertImageToPdf(imageBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);

    img.onload = () => {
      try {
        // Calculate dimensions to fit on page
        const imgWidth = img.width;
        const imgHeight = img.height;
        const aspectRatio = imgWidth / imgHeight;

        // Use letter size with margins
        const pageWidth = 612; // 8.5in in points
        const pageHeight = 792; // 11in in points
        const margin = 36; // 0.5in margins

        const maxWidth = pageWidth - 2 * margin;
        const maxHeight = pageHeight - 2 * margin;

        let finalWidth = maxWidth;
        let finalHeight = finalWidth / aspectRatio;

        if (finalHeight > maxHeight) {
          finalHeight = maxHeight;
          finalWidth = finalHeight * aspectRatio;
        }

        // Create PDF
        const pdf = new jsPDF({
          orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
          unit: 'pt',
          format: 'letter',
        });

        // Add image centered on page
        const x = (pageWidth - finalWidth) / 2;
        const y = (pageHeight - finalHeight) / 2;

        pdf.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);

        // Convert to blob
        const pdfBlob = pdf.output('blob');
        URL.revokeObjectURL(url);
        resolve(pdfBlob);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Get page count from a file
 * For PDFs, use PDF.js. For images/DOCX, assume 1 page (or convert first)
 */
export async function getPageCount(blob: Blob): Promise<number> {
  const fileType = getFileType(blob);

  if (fileType === 'pdf') {
    // This requires PDF.js - circular dependency, so return placeholder
    // Actual implementation should be in the component that has access to PDF.js
    return 1;
  }

  // Images and DOCX (when converted) typically result in single page
  return 1;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
