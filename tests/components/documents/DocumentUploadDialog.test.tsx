import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { useDocumentStore } from '@/stores/documentStore';

// Mock the document store
vi.mock('@/stores/documentStore', () => ({
  useDocumentStore: vi.fn(),
}));

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DocumentUploadDialog', () => {
  const mockUploadDocument = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useDocumentStore as any).mockReturnValue(mockUploadDocument);
  });

  it('renders when open', () => {
    render(
      <DocumentUploadDialog
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop a file here/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <DocumentUploadDialog
        open={false}
        onOpenChange={() => {}}
      />
    );

    expect(screen.queryByText('Upload Document')).not.toBeInTheDocument();
  });

  it('shows error when file is too large', async () => {
    render(
      <DocumentUploadDialog
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Create a mock file larger than 50MB
    const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf',
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/File size exceeds 50MB limit/i)).toBeInTheDocument();
    });
  });

  it('shows error when file type is invalid', async () => {
    render(
      <DocumentUploadDialog
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Create a mock file with invalid type
    const invalidFile = new File(['content'], 'test.txt', {
      type: 'text/plain',
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });
  });

  it('auto-fills name from filename', async () => {
    render(
      <DocumentUploadDialog
        open={true}
        onOpenChange={() => {}}
      />
    );

    const validFile = new File(['content'], 'my-document.pdf', {
      type: 'application/pdf',
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Document Name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('my-document');
    });
  });

  it('requires name field for upload', async () => {
    const mockOnOpenChange = vi.fn();

    render(
      <DocumentUploadDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const validFile = new File(['content'], 'test.pdf', {
      type: 'application/pdf',
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    // Clear the auto-filled name
    const nameInput = screen.getByLabelText(/Document Name/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    const uploadButton = screen.getByRole('button', { name: /Upload/i });

    // Button should be disabled when name is empty
    expect(uploadButton).toBeDisabled();
  });

  it('calls uploadDocument with correct parameters', async () => {
    mockUploadDocument.mockResolvedValue('doc-123');
    const mockOnOpenChange = vi.fn();

    render(
      <DocumentUploadDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        projectId="project-1"
      />
    );

    const validFile = new File(['content'], 'test.pdf', {
      type: 'application/pdf',
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Document Name/i);
      expect(nameInput).toHaveValue('test');
    });

    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: 'Test description' } });

    const uploadButton = screen.getByRole('button', { name: /Upload/i });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockUploadDocument).toHaveBeenCalledWith(
        validFile,
        'test',
        'Test description',
        'project-1',
        undefined
      );
    });
  });
});
