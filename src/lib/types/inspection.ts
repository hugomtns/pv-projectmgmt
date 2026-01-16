/**
 * On-Site Inspection Types
 *
 * Inspections track field visits for solar project quality assurance,
 * including pre-construction, progress, commissioning, and O&M checks.
 */

export type InspectionType =
  | 'pre_construction'
  | 'progress'
  | 'commissioning'
  | 'annual_om';

export type InspectionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type InspectionItemResult =
  | 'pass'
  | 'fail'
  | 'na'
  | 'pending';

export type InspectionCategory =
  | 'site_preparation'
  | 'structural'
  | 'electrical'
  | 'modules'
  | 'inverters'
  | 'safety'
  | 'documentation';

export interface InspectionItemPhoto {
  id: string;
  blobId: string;       // Reference to IndexedDB blob
  fileName: string;
  fileSize: number;
  capturedAt: string;   // ISO timestamp
  caption?: string;
}

export interface InspectionItem {
  id: string;
  title: string;
  description: string;
  category: InspectionCategory;
  result: InspectionItemResult;
  required: boolean;
  photos: InspectionItemPhoto[];
  notes: string;
  isPunchListItem: boolean;
  punchListResolvedAt?: string;
  punchListResolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectorSignature {
  id: string;
  signedBy: string;      // User full name
  signedById: string;    // User ID
  signedAt: string;      // ISO timestamp
  role: 'inspector' | 'witness' | 'owner_representative';
}

export interface Inspection {
  id: string;
  projectId: string;
  siteId?: string;       // Optional link to specific site
  type: InspectionType;
  status: InspectionStatus;
  scheduledDate: string; // 'YYYY-MM-DD'
  completedDate?: string;

  // Inspector info
  inspectorName: string;
  inspectorId: string;
  inspectorCompany?: string;

  // Checklist items
  items: InspectionItem[];

  // Summary
  overallNotes: string;
  signatures: InspectorSignature[];

  // Metadata
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

// Template type for creating inspections
export type InspectionItemTemplate = Omit<
  InspectionItem,
  'id' | 'photos' | 'notes' | 'isPunchListItem' | 'punchListResolvedAt' | 'punchListResolvedBy' | 'createdAt' | 'updatedAt'
> & {
  result: 'pending'; // Templates always start as pending
};

// Labels
export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  pre_construction: 'Pre-Construction',
  progress: 'Progress',
  commissioning: 'Commissioning',
  annual_om: 'Annual O&M',
};

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const INSPECTION_RESULT_LABELS: Record<InspectionItemResult, string> = {
  pass: 'Pass',
  fail: 'Fail',
  na: 'N/A',
  pending: 'Pending',
};

export const INSPECTION_CATEGORY_LABELS: Record<InspectionCategory, string> = {
  site_preparation: 'Site Preparation',
  structural: 'Structural / Racking',
  electrical: 'Electrical',
  modules: 'PV Modules',
  inverters: 'Inverters',
  safety: 'Safety',
  documentation: 'Documentation',
};

export const INSPECTION_CATEGORY_ORDER: InspectionCategory[] = [
  'site_preparation',
  'structural',
  'electrical',
  'modules',
  'inverters',
  'safety',
  'documentation',
];

export const INSPECTION_SIGNATURE_ROLE_LABELS: Record<InspectorSignature['role'], string> = {
  inspector: 'Inspector',
  witness: 'Witness',
  owner_representative: 'Owner Representative',
};
