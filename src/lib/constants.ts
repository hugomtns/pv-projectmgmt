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
