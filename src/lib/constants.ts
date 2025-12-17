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
