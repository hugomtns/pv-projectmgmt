import { db } from './db';
import { useUserStore } from '@/stores/userStore';
import type { AdminLogAction } from './types/adminLog';
import type { EntityType } from './types/permission';

/**
 * Log an admin action to the audit log.
 * This function is non-blocking and fails silently to not break main operations.
 */
export async function logAdminAction(
  action: AdminLogAction,
  entityType: EntityType,
  entityId: string,
  entityName?: string,
  details?: Record<string, unknown>
): Promise<void> {
  const currentUser = useUserStore.getState().currentUser;

  // Only log if user is authenticated
  if (!currentUser) return;

  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: `${currentUser.firstName} ${currentUser.lastName}`,
    action,
    entityType,
    entityId,
    entityName,
    details: details || {},
  };

  try {
    await db.adminLogs.add(entry);
  } catch (error) {
    // Non-blocking - don't fail the main operation if logging fails
    console.error('Failed to log admin action:', error);
  }
}
