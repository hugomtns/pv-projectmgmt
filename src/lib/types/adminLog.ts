import type { EntityType } from './permission';

export type AdminLogAction = 'create' | 'update' | 'delete';

export interface AdminLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AdminLogAction;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  details: Record<string, unknown>;
}

export interface AdminLogFilters {
  userId?: string;
  action?: AdminLogAction;
  entityType?: EntityType;
  dateFrom?: string;
  dateTo?: string;
}
