import type { TaskStatus } from '../types';

/**
 * NTP (Notice to Proceed) Checklist Types
 *
 * NTP is a critical milestone in solar project development that indicates
 * all due diligence items have been verified and the project is ready
 * for construction financing.
 */

export type NtpCategory =
  | 'site_control'
  | 'permitting'
  | 'grid'
  | 'environmental'
  | 'commercial'
  | 'financial';

export interface NtpChecklistItem {
  id: string;
  title: string;
  description: string;
  category: NtpCategory;
  status: TaskStatus;
  required: boolean;
  attachmentIds: string[];
  notes: string;
  targetDate: string | null; // Target completion date in 'YYYY-MM-DD' format
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NtpChecklist {
  items: NtpChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export const NTP_CATEGORY_LABELS: Record<NtpCategory, string> = {
  site_control: 'Site Control',
  permitting: 'Permitting',
  grid: 'Grid / Interconnection',
  environmental: 'Environmental',
  commercial: 'Commercial',
  financial: 'Financial',
};

export const NTP_CATEGORY_ORDER: NtpCategory[] = [
  'site_control',
  'permitting',
  'grid',
  'environmental',
  'commercial',
  'financial',
];
