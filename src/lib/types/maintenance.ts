/**
 * Maintenance Schedule Types
 *
 * Defines recurring maintenance schedules and task templates
 * for preventive maintenance of solar installations.
 */

export type MaintenanceCategory =
  | 'cleaning'
  | 'inspection'
  | 'electrical'
  | 'mechanical'
  | 'vegetation'
  | 'monitoring'
  | 'replacement';

export type RecurrenceType =
  | 'once'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual';

export interface MaintenanceTaskTemplate {
  id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  required: boolean;
  estimatedMinutes?: number;
}

export interface MaintenanceSchedule {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  category: MaintenanceCategory;
  recurrence: RecurrenceType;
  startDate: string;           // ISO date
  nextDueDate?: string;        // Calculated next occurrence
  isActive: boolean;

  taskTemplates: MaintenanceTaskTemplate[];
  equipmentTypes?: string[];   // Filter applicable equipment types
  defaultAssigneeId?: string;
  defaultAssigneeName?: string;

  // Metadata
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

// Labels for UI display
export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  cleaning: 'Cleaning',
  inspection: 'Inspection',
  electrical: 'Electrical',
  mechanical: 'Mechanical',
  vegetation: 'Vegetation Management',
  monitoring: 'Monitoring',
  replacement: 'Parts Replacement',
};

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  once: 'One-time',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

export const MAINTENANCE_CATEGORY_COLORS: Record<MaintenanceCategory, string> = {
  cleaning: '#3b82f6',       // blue
  inspection: '#a855f7',     // purple
  electrical: '#eab308',     // yellow
  mechanical: '#f97316',     // orange
  vegetation: '#22c55e',     // green
  monitoring: '#06b6d4',     // cyan
  replacement: '#ef4444',    // red
};

export const MAINTENANCE_CATEGORY_ORDER: MaintenanceCategory[] = [
  'inspection',
  'cleaning',
  'electrical',
  'mechanical',
  'vegetation',
  'monitoring',
  'replacement',
];

// Helper to calculate next due date from recurrence
export function calculateNextDueDate(
  startDate: string,
  recurrence: RecurrenceType,
  fromDate: Date = new Date()
): string | undefined {
  if (recurrence === 'once') {
    return startDate;
  }

  const start = new Date(startDate);
  const current = new Date(fromDate);
  let next = new Date(start);

  const intervals: Record<Exclude<RecurrenceType, 'once'>, number> = {
    weekly: 7,
    monthly: 30,
    quarterly: 91,
    semi_annual: 182,
    annual: 365,
  };

  const daysInterval = intervals[recurrence as Exclude<RecurrenceType, 'once'>];

  while (next <= current) {
    next.setDate(next.getDate() + daysInterval);
  }

  return next.toISOString().split('T')[0];
}
