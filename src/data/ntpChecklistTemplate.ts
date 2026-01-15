import type { NtpChecklistItem, NtpCategory } from '@/lib/types/ntpChecklist';

/**
 * Default NTP Checklist Template
 *
 * Based on industry-standard due diligence requirements for
 * utility-scale solar project financing (Notice to Proceed).
 */

type NtpChecklistItemTemplate = Omit<NtpChecklistItem, 'id' | 'createdAt' | 'updatedAt'>;

export const DEFAULT_NTP_CHECKLIST_ITEMS: NtpChecklistItemTemplate[] = [
  // Site Control
  {
    title: 'Land lease/option agreement executed',
    description: 'Secure site control through executed lease or option agreement with landowner',
    category: 'site_control',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Title search completed',
    description: 'Verify clean title with no encumbrances that would affect project development',
    category: 'site_control',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'ALTA survey completed',
    description: 'Complete American Land Title Association survey for boundary and easement verification',
    category: 'site_control',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Access easements secured',
    description: 'Obtain necessary easements for site access, transmission, and maintenance',
    category: 'site_control',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Property tax agreement',
    description: 'Negotiate property tax terms or PILOT (Payment in Lieu of Taxes) agreement',
    category: 'site_control',
    status: 'not_started',
    required: false,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },

  // Permitting
  {
    title: 'Conditional Use Permit (CUP) approved',
    description: 'Obtain local zoning approval for solar facility land use',
    category: 'permitting',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Building permit issued',
    description: 'Secure building permit for construction of solar facility structures',
    category: 'permitting',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Electrical permit issued',
    description: 'Obtain electrical permit for solar installation and grid connection work',
    category: 'permitting',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Grading permit issued',
    description: 'Secure grading permit if site preparation requires significant earthwork',
    category: 'permitting',
    status: 'not_started',
    required: false,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },

  // Grid / Interconnection
  {
    title: 'Interconnection application submitted',
    description: 'Submit interconnection request to utility or ISO/RTO queue',
    category: 'grid',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'System impact study completed',
    description: 'Complete utility system impact study identifying grid upgrade requirements',
    category: 'grid',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Facilities study completed',
    description: 'Complete facilities study with detailed interconnection cost estimates',
    category: 'grid',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Interconnection agreement executed',
    description: 'Execute Large Generator Interconnection Agreement (LGIA) with utility',
    category: 'grid',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Network upgrade cost estimate received',
    description: 'Receive final cost estimate for any required transmission upgrades',
    category: 'grid',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },

  // Environmental
  {
    title: 'Phase I ESA completed',
    description: 'Complete Phase I Environmental Site Assessment per ASTM E1527-21',
    category: 'environmental',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Wetlands delineation',
    description: 'Complete wetlands delineation if site contains potential wetland areas',
    category: 'environmental',
    status: 'not_started',
    required: false,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Endangered species survey',
    description: 'Complete biological survey for threatened and endangered species',
    category: 'environmental',
    status: 'not_started',
    required: false,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Cultural resources survey',
    description: 'Complete archaeological/cultural resources survey if required',
    category: 'environmental',
    status: 'not_started',
    required: false,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Stormwater management plan approved',
    description: 'Develop and obtain approval for stormwater pollution prevention plan (SWPPP)',
    category: 'environmental',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },

  // Commercial
  {
    title: 'Power Purchase Agreement (PPA) executed',
    description: 'Execute long-term PPA with creditworthy offtaker',
    category: 'commercial',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'REC purchase agreement',
    description: 'Execute Renewable Energy Certificate purchase agreement if separate from PPA',
    category: 'commercial',
    status: 'not_started',
    required: false,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Site lease subordination agreement',
    description: 'Obtain landlord consent and subordination for project financing',
    category: 'commercial',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Insurance requirements confirmed',
    description: 'Confirm insurance coverage requirements and obtain quotes/commitments',
    category: 'commercial',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },

  // Financial
  {
    title: 'Tax equity commitment letter',
    description: 'Obtain commitment letter from tax equity investor',
    category: 'financial',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Debt financing term sheet',
    description: 'Execute term sheet with construction and/or term debt lender',
    category: 'financial',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Financial model approved',
    description: 'Complete and validate project financial model with all stakeholders',
    category: 'financial',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
  {
    title: 'Independent engineer report',
    description: 'Obtain independent engineer technical review and report',
    category: 'financial',
    status: 'not_started',
    required: true,
    attachmentIds: [],
    notes: '',
    completedAt: null,
    completedBy: null,
  },
];

/**
 * Get items for a specific category
 */
export function getItemsByCategory(category: NtpCategory): NtpChecklistItemTemplate[] {
  return DEFAULT_NTP_CHECKLIST_ITEMS.filter((item) => item.category === category);
}

/**
 * Get count of required vs optional items
 */
export function getItemCounts(): { required: number; optional: number; total: number } {
  const required = DEFAULT_NTP_CHECKLIST_ITEMS.filter((item) => item.required).length;
  const optional = DEFAULT_NTP_CHECKLIST_ITEMS.filter((item) => !item.required).length;
  return { required, optional, total: DEFAULT_NTP_CHECKLIST_ITEMS.length };
}
