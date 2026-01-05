import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentCard } from '@/components/documents/DocumentCard';
import type { Document } from '@/lib/types/document';

const mockDocument: Document = {
  id: 'doc-1',
  name: 'Test Document',
  description: 'Test description',
  status: 'draft',
  fileSize: 1024 * 1024 * 2.5, // 2.5 MB
  uploadedBy: 'John Doe',
  createdAt: new Date('2024-01-15').toISOString(),
  updatedAt: new Date('2024-01-15').toISOString(),
  currentVersionId: 'v1',
  versions: ['v1'],
  projectId: 'project-1',
};

describe('DocumentCard', () => {
  it('renders document information', () => {
    render(<DocumentCard document={mockDocument} />);

    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('by John Doe')).toBeInTheDocument();
  });

  it('displays formatted file size', () => {
    render(<DocumentCard document={mockDocument} />);
    expect(screen.getByText('2.5 MB')).toBeInTheDocument();
  });

  it('displays formatted date', () => {
    render(<DocumentCard document={mockDocument} />);
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<DocumentCard document={mockDocument} onClick={onClick} />);

    const card = screen.getByText('Test Document').closest('.cursor-pointer');
    fireEvent.click(card!);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders without description', () => {
    const docWithoutDesc = { ...mockDocument, description: '' };
    render(<DocumentCard document={docWithoutDesc} />);

    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });
});
