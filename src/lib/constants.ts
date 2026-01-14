export const PRIORITY_LABELS: Record<number, string> = {
  0: 'On Hold',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low'
};

export const PRIORITY_COLORS: Record<number, string> = {
  0: '#6b7280', // gray
  1: '#ef4444', // red
  2: '#f97316', // orange
  3: '#eab308', // yellow
  4: '#22c55e'  // green
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete'
};

export const MILESTONE_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Cyan', value: '#06b6d4' },
] as const;

// Reserved colors for milestone status (not user-selectable)
export const MILESTONE_STATUS_COLORS = {
  completed: '#22c55e', // Green
  overdue: '#ef4444',   // Red
} as const;

// Drawing annotation colors (used in DocumentViewer drawing toolbar)
export const DRAWING_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#22C55E', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#000000', // black
  '#FFFFFF', // white
] as const;

// Standard dialog sizes for consistent modal widths
export const DIALOG_SIZES = {
  sm: 'sm:max-w-[400px]',  // Simple confirmations, single field
  md: 'sm:max-w-[500px]',  // Standard forms (2-4 fields)
  lg: 'sm:max-w-[600px]',  // Complex forms, with preview
  xl: 'sm:max-w-[800px]',  // Multi-step, with side panel
} as const;
