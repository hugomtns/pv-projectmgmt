/**
 * Work Order Types
 *
 * Tracks maintenance work orders with task items, photos, signatures,
 * and cost tracking. Follows patterns from inspection system.
 */

import type { InspectionItemPhoto } from './inspection';
import type { MaintenanceCategory } from './maintenance';

export type WorkOrderType =
  | 'preventive'
  | 'corrective'
  | 'emergency';

export type WorkOrderPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type WorkOrderStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type WorkOrderItemResult =
  | 'pending'
  | 'completed'
  | 'skipped'
  | 'failed';

export interface WorkOrderPart {
  id: string;
  name: string;
  partNumber?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface WorkOrderItem {
  id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  result: WorkOrderItemResult;
  required: boolean;
  notes?: string;
  photos: InspectionItemPhoto[];
  timeSpentMinutes?: number;
  partsUsed: WorkOrderPart[];

  // Punch list tracking (same as inspections)
  isPunchListItem: boolean;
  punchListResolvedAt?: string;
  punchListResolvedBy?: string;

  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderSignature {
  id: string;
  signedBy: string;
  signedById: string;
  signedAt: string;
  role: 'technician' | 'supervisor' | 'owner_representative';
}

export interface WorkOrder {
  id: string;
  projectId: string;
  scheduleId?: string;      // If created from a maintenance schedule
  equipmentId?: string;     // If related to specific equipment

  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;

  title: string;
  description: string;
  scheduledDate: string;    // ISO date
  dueDate?: string;         // ISO date
  completedAt?: string;

  // Assignment
  assigneeId?: string;
  assigneeName?: string;

  // Work items
  items: WorkOrderItem[];
  signatures: WorkOrderSignature[];
  overallNotes?: string;

  // Cost tracking (calculated on completion)
  laborHours?: number;
  laborRate?: number;       // Per hour
  laborCost?: number;       // Calculated
  partsCost?: number;       // Sum of all parts
  totalCost?: number;       // Labor + parts

  // Metadata
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

// Template for creating work orders (similar to inspection templates)
export type WorkOrderItemTemplate = Omit<
  WorkOrderItem,
  'id' | 'photos' | 'notes' | 'partsUsed' | 'isPunchListItem' | 'punchListResolvedAt' | 'punchListResolvedBy' | 'createdAt' | 'updatedAt' | 'timeSpentMinutes'
> & {
  result: 'pending';
};

// Labels for UI display
export const WORK_ORDER_TYPE_LABELS: Record<WorkOrderType, string> = {
  preventive: 'Preventive',
  corrective: 'Corrective',
  emergency: 'Emergency',
};

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const WORK_ORDER_PRIORITY_COLORS: Record<WorkOrderPriority, string> = {
  low: '#22c55e',      // green
  medium: '#eab308',   // yellow
  high: '#f97316',     // orange
  critical: '#ef4444', // red
};

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const WORK_ORDER_STATUS_COLORS: Record<WorkOrderStatus, string> = {
  draft: '#6b7280',       // gray
  scheduled: '#3b82f6',   // blue
  in_progress: '#eab308', // yellow
  on_hold: '#f97316',     // orange
  completed: '#22c55e',   // green
  cancelled: '#ef4444',   // red
};

export const WORK_ORDER_ITEM_RESULT_LABELS: Record<WorkOrderItemResult, string> = {
  pending: 'Pending',
  completed: 'Completed',
  skipped: 'Skipped',
  failed: 'Failed',
};

export const WORK_ORDER_SIGNATURE_ROLE_LABELS: Record<WorkOrderSignature['role'], string> = {
  technician: 'Technician',
  supervisor: 'Supervisor',
  owner_representative: 'Owner Representative',
};
