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

// Map NTP categories to milestone colors for visual consistency
export const NTP_CATEGORY_TO_MILESTONE_COLOR: Record<string, string> = {
  site_control: '#3b82f6',   // Blue
  permitting: '#a855f7',     // Purple
  grid: '#eab308',           // Yellow
  environmental: '#14b8a6',  // Teal
  commercial: '#f97316',     // Orange
  financial: '#06b6d4',      // Cyan
};

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

// Site Selection Scorecard
import type { ScorecardCategory, ScorecardRating, TrafficLightColor } from './types/siteScorecard';

export const SCORECARD_CATEGORY_LABELS: Record<ScorecardCategory, string> = {
  grid: 'Grid Connection',
  access: 'Site Access',
  land: 'Land Factors',
  environmental: 'Environmental',
};

export const SCORECARD_CATEGORY_DESCRIPTIONS: Record<ScorecardCategory, string> = {
  grid: 'Distance to substation, interconnection complexity, upgrade costs',
  access: 'Road access quality, proximity to main roads',
  land: 'Land cost/lease terms, ownership complexity, zoning status',
  environmental: 'Permitting risk, community acceptance, visual impact',
};

export const SCORECARD_RATING_LABELS: Record<NonNullable<ScorecardRating>, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

export const SCORECARD_TRAFFIC_LIGHT_COLORS: Record<TrafficLightColor, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
};

export const SCORECARD_TRAFFIC_LIGHT_LABELS: Record<TrafficLightColor, string> = {
  red: 'Poor',
  yellow: 'Fair',
  green: 'Good',
};

// Project Detail Sidebar - Section Groups
export const PROJECT_SECTION_GROUPS = [
  {
    id: 'management',
    label: 'Management',
    sections: [
      { id: 'properties', label: 'Properties', icon: 'Settings' },
      { id: 'status', label: 'Status', icon: 'CircleCheck' },
      { id: 'tasks', label: 'Tasks', icon: 'ListTodo' },
      { id: 'milestones', label: 'Milestones', icon: 'Flag' },
      { id: 'ntp-checklist', label: 'NTP Checklist', icon: 'ClipboardCheck' },
      { id: 'inspections', label: 'Inspections', icon: 'ClipboardList' },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    sections: [
      { id: 'sites', label: 'Sites', icon: 'MapPin' },
      { id: 'designs', label: 'Designs', icon: 'Layers' },
      { id: 'documents', label: 'Documents', icon: 'FileText' },
    ],
  },
] as const;

export type ProjectSectionId = typeof PROJECT_SECTION_GROUPS[number]['sections'][number]['id'];
