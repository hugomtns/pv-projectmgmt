import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentViewer } from '@/components/documents/DocumentViewer';

// Mock react-pdf
vi.mock('react-pdf', () => ({
  pdfjs: {
    GlobalWorkerOptions: { workerSrc: '' },
    version: '3.11.174',
  },
  Document: ({ children, onLoadSuccess }: any) => {
    // Simulate successful load
    if (onLoadSuccess) {
      setTimeout(() => onLoadSuccess({ numPages: 3 }), 0);
    }
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber }: any) => (
    <div data-testid={`pdf-page-${pageNumber}`}>Page {pageNumber}</div>
  ),
}));

describe('DocumentViewer', () => {
  const defaultProps = {
    documentId: 'doc-1',
    documentName: 'Test Document.pdf',
    status: 'draft' as const,
    fileUrl: 'blob:test-url',
    onClose: vi.fn(),
  };

  it('renders document name and status', () => {
    render(<DocumentViewer {...defaultProps} />);
    expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<DocumentViewer {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-x')
    );
    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders zoom controls', () => {
    render(<DocumentViewer {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const hasZoomIn = buttons.some((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-zoom-in')
    );
    const hasZoomOut = buttons.some((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-zoom-out')
    );

    expect(hasZoomIn).toBe(true);
    expect(hasZoomOut).toBe(true);
  });

  it('renders PDF document component', () => {
    render(<DocumentViewer {...defaultProps} />);
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
  });
});
