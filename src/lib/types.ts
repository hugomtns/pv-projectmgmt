// lib/types.ts

import type { NtpChecklist } from './types/ntpChecklist';

export type Priority = 0 | 1 | 2 | 3 | 4;
// 0 = On Hold, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low

export type TaskStatus = 'not_started' | 'in_progress' | 'complete';

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string; // ISO timestamp
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string | null;
  status: TaskStatus;
  comments: Comment[];
  attachments: string[]; // Document IDs
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  taskTemplates: TaskTemplate[];
}

export interface Workflow {
  stages: Stage[];
}

export interface ProjectStageData {
  enteredAt: string;
  tasks: Task[];
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  date: string; // ISO 8601 format 'YYYY-MM-DD'
  completed: boolean;
  completedAt: string | null; // ISO timestamp when marked complete
  color: string; // Hex color from preset palette
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface Project {
  id: string;
  name: string;
  location: string;
  priority: Priority;
  owner: string;
  currentStageId: string;
  createdAt: string;
  updatedAt: string;
  stages: Record<string, ProjectStageData>;
  attachments: string[]; // Document IDs
  milestones: Milestone[]; // Project milestones
  ntpChecklist?: NtpChecklist; // NTP readiness checklist
}

export type ViewType = 'list' | 'board' | 'timeline';
export type GroupingOption = 'none' | 'stage' | 'priority' | 'owner';
export type BoardColumns = 'stage' | 'priority';
export type BoardRows = 'none' | 'priority' | 'owner';

export interface ListDisplaySettings {
  grouping: GroupingOption;
  ordering: { field: string; direction: 'asc' | 'desc' };
  showEmptyGroups: boolean;
  properties: string[];
}

export interface BoardDisplaySettings {
  columns: BoardColumns;
  rows: BoardRows;
  ordering: { field: string; direction: 'asc' | 'desc' };
  showEmptyColumns: boolean;
  properties: string[];
}

export interface TimelineDisplaySettings {
  viewMode: 'month' | 'quarter' | 'year';
  showCompletedMilestones: boolean;
  groupBy: 'none' | 'stage' | 'priority';
  ordering: { field: string; direction: 'asc' | 'desc' };
  properties: string[];
}

export interface DisplaySettings {
  view: ViewType;
  list: ListDisplaySettings;
  board: BoardDisplaySettings;
  timeline: TimelineDisplaySettings;
}

export interface Filters {
  stages: string[];
  priorities: Priority[];
  owners: string[];
  search: string;
}

// User Management & Permissions
export type {
  User,
  UserGroup,
} from './types/user';

export type {
  EntityType,
  PermissionAction,
  PermissionSet,
  CustomRole,
  GroupPermissionOverride,
} from './types/permission';

// Document Management
export type {
  Document,
  DocumentVersion,
  DocumentStatus,
  DocumentComment,
  LocationAnchor,
  Drawing,
  WorkflowEvent,
} from './types/document';

// NTP Checklist
export type {
  NtpCategory,
  NtpChecklistItem,
  NtpChecklist,
} from './types/ntpChecklist';
export { NTP_CATEGORY_LABELS, NTP_CATEGORY_ORDER } from './types/ntpChecklist';

// Site Management
export type {
  Site,
  SiteBoundary,
  SiteExclusionZone,
  ExclusionZoneType,
  KMLParseResult,
} from './types/site';
export { EXCLUSION_ZONE_LABELS } from './types/site';

// Site Selection Scorecard
export type {
  ScorecardCategory,
  ScorecardRating,
  CategoryScore,
  TrafficLightColor,
  SiteScorecard,
} from './types/siteScorecard';
export {
  DEFAULT_SCORECARD_WEIGHTS,
  isScorecardComplete,
  getTrafficLightColor,
  calculateCompositeScore,
  createEmptyScorecard,
} from './types/siteScorecard';

// Design Management
export interface GPSCoordinates {
  latitude: number;   // e.g., 37.7749
  longitude: number;  // e.g., -122.4194
  elevation?: number; // meters above sea level (optional)
}

export interface Design {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  // thumbnail functionality to be added later
  createdBy: string; // User's full name
  creatorId: string; // User ID for permission logic (owner only edit)
  createdAt: string;
  updatedAt: string;
  versions: string[]; // IDs of DesignVersion
  currentVersionId: string;
  // GPS coordinates for satellite imagery overlay
  gpsCoordinates?: GPSCoordinates;
  satelliteZoomLevel?: number; // Default: 18 (high detail, ~0.5m/pixel)
  groundSizeMeters?: number; // Ground plane size in meters (default: 200)
}

export interface DesignVersion {
  id: string;
  designId: string;
  versionNumber: number;
  uploadedBy: string;
  uploadedAt: string;
  fileBlob: string; // Blob ID from IndexedDB
  fileSize: number;
  fileType: 'dxf';
}

// Element types that can have comments attached in 3D viewer
export type CommentableElementType = 'panel' | 'inverter' | 'transformer' | 'combiner';

// Anchor for element-based comments (similar to LocationAnchor for documents)
export interface ElementAnchor {
  elementType: CommentableElementType;
  elementId: string;  // For panels: instance index as string; for equipment: equipment.id
  elementLabel?: string;  // Human-readable label, e.g., "Panel #42", "Inverter INV-01"
}

export interface DesignComment {
  id: string;
  designId: string;
  versionId: string;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  type: 'design' | 'element';  // Comment type: design-level or element-anchored
  elementAnchor?: ElementAnchor;  // Only present when type === 'element'
}

export interface DesignWorkflowEvent {
  id: string;
  designId: string;
  action: 'created' | 'status_changed' | 'version_uploaded';
  actor: string;
  timestamp: string;
  fromStatus?: Design['status'];
  toStatus?: Design['status'];
  note?: string;
}

// On-Site Inspections
export type {
  InspectionType,
  InspectionStatus,
  InspectionItemResult,
  InspectionCategory,
  InspectionItemPhoto,
  InspectionItem,
  InspectorSignature,
  Inspection,
  InspectionItemTemplate,
} from './types/inspection';
export {
  INSPECTION_TYPE_LABELS,
  INSPECTION_STATUS_LABELS,
  INSPECTION_RESULT_LABELS,
  INSPECTION_CATEGORY_LABELS,
  INSPECTION_CATEGORY_ORDER,
  INSPECTION_SIGNATURE_ROLE_LABELS,
} from './types/inspection';

// Equipment Management
export type {
  EquipmentType,
  EquipmentStatus,
  Equipment,
} from './types/equipment';
export {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_COLORS,
  EQUIPMENT_TYPE_ORDER,
} from './types/equipment';

// Maintenance Schedules
export type {
  MaintenanceCategory,
  RecurrenceType,
  MaintenanceTaskTemplate,
  MaintenanceSchedule,
} from './types/maintenance';
export {
  MAINTENANCE_CATEGORY_LABELS,
  RECURRENCE_LABELS,
  MAINTENANCE_CATEGORY_COLORS,
  MAINTENANCE_CATEGORY_ORDER,
  calculateNextDueDate,
} from './types/maintenance';

// Work Orders
export type {
  WorkOrderType,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderItemResult,
  WorkOrderPart,
  WorkOrderItem,
  WorkOrderSignature,
  WorkOrder,
  WorkOrderItemTemplate,
} from './types/workOrder';
export {
  WORK_ORDER_TYPE_LABELS,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_PRIORITY_COLORS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_COLORS,
  WORK_ORDER_ITEM_RESULT_LABELS,
  WORK_ORDER_SIGNATURE_ROLE_LABELS,
} from './types/workOrder';

// Performance Logs
export type {
  PerformancePeriod,
  PerformanceLog,
  PerformanceKPIs,
} from './types/performanceLog';
export {
  PERFORMANCE_PERIOD_LABELS,
  calculatePerformanceKPIs,
} from './types/performanceLog';
