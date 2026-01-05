import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentList } from '@/components/documents/DocumentList';
import type { Document } from '@/lib/types/document';

const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    name: 'Document 1',
    description: 'First document',
    status: 'draft',
    fileSize: 1024 * 1024,
    uploadedBy: 'User 1',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString(),
    currentVersionId: 'v1',
    versions: ['v1'],
    projectId: 'project-1',
  },
  {
    id: 'doc-2',
    name: 'Document 2',
    description: 'Second document',
    status: 'approved',
    fileSize: 2 * 1024 * 1024,
    uploadedBy: 'User 2',
    createdAt: new Date('2024-01-16').toISOString(),
    updatedAt: new Date('2024-01-16').toISOString(),
    currentVersionId: 'v1',
    versions: ['v1'],
    projectId: 'project-1',
  },
];

describe('DocumentList', () => {
  it('renders empty state when no documents', () => {
    render(<DocumentList documents={[]} />);
    expect(screen.getByText(/No documents yet/i)).toBeInTheDocument();
  });

  it('renders document cards', () => {
    render(<DocumentList documents={mockDocuments} />);
    expect(screen.getByText('Document 1')).toBeInTheDocument();
    expect(screen.getByText('Document 2')).toBeInTheDocument();
  });

  it('calls onDocumentClick with document id', () => {
    const onDocumentClick = vi.fn();
    render(<DocumentList documents={mockDocuments} onDocumentClick={onDocumentClick} />);

    const firstCard = screen.getByText('Document 1').closest('.cursor-pointer');
    fireEvent.click(firstCard!);

    expect(onDocumentClick).toHaveBeenCalledWith('doc-1');
  });

  it('renders multiple documents in grid', () => {
    const { container } = render(<DocumentList documents={mockDocuments} />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid?.children).toHaveLength(2);
  });
});
