// lib/types.ts

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

// Design Management
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
}

export interface DesignVersion {
  id: string;
  designId: string;
  versionNumber: number;
  uploadedBy: string;
  uploadedAt: string;
  fileBlob: string; // Blob ID from IndexedDB
  fileSize: number;
  fileType: 'image' | 'pdf' | 'dxf' | 'gltf' | 'fbx' | 'obj';
}

export interface DesignComment {
  id: string;
  designId: string;
  versionId: string;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
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
