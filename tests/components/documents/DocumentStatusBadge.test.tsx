import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';

describe('DocumentStatusBadge', () => {
  it('renders draft status', () => {
    render(<DocumentStatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders in_review status', () => {
    render(<DocumentStatusBadge status="in_review" />);
    expect(screen.getByText('In Review')).toBeInTheDocument();
  });

  it('renders approved status', () => {
    render(<DocumentStatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders changes_requested status', () => {
    render(<DocumentStatusBadge status="changes_requested" />);
    expect(screen.getByText('Changes Requested')).toBeInTheDocument();
  });
});
