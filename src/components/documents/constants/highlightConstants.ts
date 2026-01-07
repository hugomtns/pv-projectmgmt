import type { HighlightColor } from '@/lib/types/document';

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#FBBF24',
  green: '#10B981',
  blue: '#3B82F6',
  pink: '#EC4899',
  orange: '#F97316',
};

export const HIGHLIGHT_COLOR_NAMES: Record<HighlightColor, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
  orange: 'Orange',
};

export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = 'yellow';
export const HIGHLIGHT_OPACITY = 0.25;
export const DRAG_THRESHOLD_PX = 10;
export const MIN_HIGHLIGHT_SIZE_PERCENT = 1;
