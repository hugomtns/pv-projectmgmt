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
}

export type ViewType = 'list' | 'board';
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

export interface DisplaySettings {
  view: ViewType;
  list: ListDisplaySettings;
  board: BoardDisplaySettings;
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
