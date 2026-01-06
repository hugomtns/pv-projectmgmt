import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationLayer } from '@/components/documents/AnnotationLayer';
import type { DocumentComment } from '@/lib/types';

// Mock LocationCommentPin component
vi.mock('@/components/documents/LocationCommentPin', () => ({
  LocationCommentPin: ({ location, number, onClick, highlighted }: any) => (
    <g
      data-testid={`location-pin-${number}`}
      onClick={onClick}
      data-highlighted={highlighted}
    >
      <circle cx={location.x} cy={location.y} r="2" />
      <text x={location.x} y={location.y}>
        {number}
      </text>
    </g>
  ),
}));

// Mock coordinate utilities
vi.mock('@/components/documents/utils/coordinateUtils', () => ({
  getEventPercentageCoordinates: vi.fn(() => ({ x: 50, y: 50 })),
}));

describe('AnnotationLayer', () => {
  const mockComments: DocumentComment[] = [
    {
      id: 'comment-1',
      documentId: 'doc-1',
      versionId: 'version-1',
      type: 'location',
      text: 'Test comment 1',
      author: 'Test User',
      createdAt: new Date().toISOString(),
      resolved: false,
      location: { x: 25, y: 30, page: 1 },
    },
    {
      id: 'comment-2',
      documentId: 'doc-1',
      versionId: 'version-1',
      type: 'location',
      text: 'Test comment 2',
      author: 'Test User',
      createdAt: new Date().toISOString(),
      resolved: false,
      location: { x: 75, y: 80, page: 1 },
    },
    {
      id: 'comment-3',
      documentId: 'doc-1',
      versionId: 'version-1',
      type: 'location',
      text: 'Test comment on page 2',
      author: 'Test User',
      createdAt: new Date().toISOString(),
      resolved: false,
      location: { x: 50, y: 50, page: 2 },
    },
    {
      id: 'comment-4',
      documentId: 'doc-1',
      versionId: 'version-1',
      type: 'document',
      text: 'Document-level comment (should not render)',
      author: 'Test User',
      createdAt: new Date().toISOString(),
      resolved: false,
    },
  ];

  const defaultProps = {
    documentId: 'doc-1',
    versionId: 'version-1',
    currentPage: 1,
    comments: mockComments,
    annotationMode: false,
    onPinClick: vi.fn(),
  };

  it('renders an SVG with correct viewBox', () => {
    const { container } = render(<AnnotationLayer {...defaultProps} />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('none');
  });

  it('filters and renders only location comments for current page', () => {
    render(<AnnotationLayer {...defaultProps} />);

    // Should render 2 pins for page 1
    expect(screen.getByTestId('location-pin-1')).toBeInTheDocument();
    expect(screen.getByTestId('location-pin-2')).toBeInTheDocument();

    // Should not render pin for page 2
    expect(screen.queryByTestId('location-pin-3')).not.toBeInTheDocument();
  });

  it('renders location pins for different page when currentPage changes', () => {
    const { rerender } = render(<AnnotationLayer {...defaultProps} />);

    // Initially on page 1
    expect(screen.getByTestId('location-pin-1')).toBeInTheDocument();
    expect(screen.getByTestId('location-pin-2')).toBeInTheDocument();

    // Switch to page 2
    rerender(<AnnotationLayer {...defaultProps} currentPage={2} />);

    // Now should show only one pin for page 2
    const pins = screen.queryAllByTestId(/location-pin-/);
    expect(pins).toHaveLength(1); // Only the page 2 comment
  });

  it('calls onPinClick when a pin is clicked', () => {
    const onPinClick = vi.fn();
    render(<AnnotationLayer {...defaultProps} onPinClick={onPinClick} />);

    const pin = screen.getByTestId('location-pin-1');
    fireEvent.click(pin);

    expect(onPinClick).toHaveBeenCalledTimes(1);
    expect(onPinClick).toHaveBeenCalledWith('comment-1');
  });

  it('highlights the specified comment pin', () => {
    render(
      <AnnotationLayer
        {...defaultProps}
        highlightedCommentId="comment-2"
      />
    );

    const pin2 = screen.getByTestId('location-pin-2');
    expect(pin2.getAttribute('data-highlighted')).toBe('true');

    const pin1 = screen.getByTestId('location-pin-1');
    expect(pin1.getAttribute('data-highlighted')).toBe('false');
  });

  it('applies cursor-crosshair class when annotation mode is active', () => {
    const { container } = render(
      <AnnotationLayer {...defaultProps} annotationMode={true} />
    );

    const svg = container.querySelector('svg');
    expect(svg?.className.baseVal).toContain('cursor-crosshair');
  });

  it('applies cursor-default class when annotation mode is inactive', () => {
    const { container } = render(
      <AnnotationLayer {...defaultProps} annotationMode={false} />
    );

    const svg = container.querySelector('svg');
    expect(svg?.className.baseVal).toContain('cursor-default');
  });

  it('shows annotation mode hint when annotation mode is active and no comments', () => {
    render(
      <AnnotationLayer
        {...defaultProps}
        annotationMode={true}
        comments={[]}
      />
    );

    expect(screen.getByText('Click anywhere to add a comment')).toBeInTheDocument();
  });

  it('hides annotation mode hint when comments exist', () => {
    render(
      <AnnotationLayer
        {...defaultProps}
        annotationMode={true}
      />
    );

    expect(screen.queryByText('Click anywhere to add a comment')).not.toBeInTheDocument();
  });

  it('calls onAddComment with coordinates when SVG is clicked in annotation mode', () => {
    const onAddComment = vi.fn();
    const { container } = render(
      <AnnotationLayer
        {...defaultProps}
        annotationMode={true}
        onAddComment={onAddComment}
      />
    );

    const svg = container.querySelector('svg');
    fireEvent.click(svg!);

    expect(onAddComment).toHaveBeenCalledTimes(1);
    expect(onAddComment).toHaveBeenCalledWith(50, 50, 1); // Using mocked coordinates
  });

  it('does not call onAddComment when annotation mode is inactive', () => {
    const onAddComment = vi.fn();
    const { container } = render(
      <AnnotationLayer
        {...defaultProps}
        annotationMode={false}
        onAddComment={onAddComment}
      />
    );

    const svg = container.querySelector('svg');
    fireEvent.click(svg!);

    expect(onAddComment).not.toHaveBeenCalled();
  });

  it('does not call onAddComment when clicking on a pin', () => {
    const onAddComment = vi.fn();
    render(
      <AnnotationLayer
        {...defaultProps}
        annotationMode={true}
        onAddComment={onAddComment}
      />
    );

    const pin = screen.getByTestId('location-pin-1');
    fireEvent.click(pin);

    // onPinClick should be called, but onAddComment should not
    expect(onAddComment).not.toHaveBeenCalled();
    expect(defaultProps.onPinClick).toHaveBeenCalled();
  });

  it('filters comments by documentId', () => {
    const mixedComments = [
      ...mockComments,
      {
        id: 'comment-other',
        documentId: 'doc-2',
        versionId: 'version-1',
        type: 'location' as const,
        text: 'Different document',
        author: 'Test User',
        createdAt: new Date().toISOString(),
        resolved: false,
        location: { x: 50, y: 50, page: 1 },
      },
    ];

    render(
      <AnnotationLayer
        {...defaultProps}
        comments={mixedComments}
      />
    );

    // Should still only render 2 pins (not 3)
    expect(screen.getByTestId('location-pin-1')).toBeInTheDocument();
    expect(screen.getByTestId('location-pin-2')).toBeInTheDocument();
    expect(screen.queryByTestId('location-pin-3')).not.toBeInTheDocument();
  });

  it('filters comments by versionId', () => {
    const mixedComments = [
      ...mockComments,
      {
        id: 'comment-v2',
        documentId: 'doc-1',
        versionId: 'version-2',
        type: 'location' as const,
        text: 'Different version',
        author: 'Test User',
        createdAt: new Date().toISOString(),
        resolved: false,
        location: { x: 50, y: 50, page: 1 },
      },
    ];

    render(
      <AnnotationLayer
        {...defaultProps}
        comments={mixedComments}
      />
    );

    // Should still only render 2 pins (not 3)
    expect(screen.getByTestId('location-pin-1')).toBeInTheDocument();
    expect(screen.getByTestId('location-pin-2')).toBeInTheDocument();
    expect(screen.queryByTestId('location-pin-3')).not.toBeInTheDocument();
  });

  it('renders empty SVG when no location comments match filters', () => {
    const { container } = render(
      <AnnotationLayer
        {...defaultProps}
        comments={[]}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // No pins should be rendered
    expect(screen.queryByTestId(/location-pin-/)).not.toBeInTheDocument();
  });

  it('assigns sequential numbers to pins', () => {
    render(<AnnotationLayer {...defaultProps} />);

    const pin1 = screen.getByTestId('location-pin-1');
    const pin2 = screen.getByTestId('location-pin-2');

    expect(pin1).toBeInTheDocument();
    expect(pin2).toBeInTheDocument();

    // Numbers should be displayed in text elements
    expect(pin1.querySelector('text')?.textContent).toBe('1');
    expect(pin2.querySelector('text')?.textContent).toBe('2');
  });
});
