export type EntityType =
  | 'projects'
  | 'workflows'
  | 'tasks'
  | 'comments'
  | 'user_management'
  | 'documents'
  | 'designs'
  | 'financials'
  | 'components';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export interface PermissionSet {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface CustomRole {
  id: string;                    // e.g., 'role-admin'
  name: string;
  description: string;
  isSystem: boolean;             // true = immutable system role
  permissions: Record<EntityType, PermissionSet>;
  createdAt: string;
  updatedAt: string;
}

export interface GroupPermissionOverride {
  id: string;
  groupId: string;               // FK to UserGroup.id
  entityType: EntityType;
  scope: 'all' | 'specific';
  specificEntityIds: string[];   // Only used when scope = 'specific'
  permissions: Partial<PermissionSet>;  // Only overridden actions
}
