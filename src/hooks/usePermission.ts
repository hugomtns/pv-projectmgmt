import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import type { EntityType, PermissionAction } from '@/lib/types';

/**
 * Hook to check if the current user has permission to perform an action
 * on an entity type
 *
 * @param entityType - The entity type to check permissions for
 * @param action - The action to check (create, read, update, delete)
 * @param entityId - Optional specific entity ID to check permissions for
 * @returns true if the user has permission, false otherwise
 *
 * @example
 * const canCreateProjects = usePermission('projects', 'create');
 * const canDeleteTasks = usePermission('tasks', 'delete');
 * const canUpdateSpecificProject = usePermission('projects', 'update', 'project-123');
 */
export function usePermission(
  entityType: EntityType,
  action: PermissionAction,
  entityId?: string
): boolean {
  const currentUser = useUserStore(state => state.currentUser);
  const roles = useUserStore(state => state.roles);
  const overrides = useUserStore(state => state.permissionOverrides);

  if (!currentUser) {
    return false;
  }

  const permissions = resolvePermissions(
    currentUser,
    entityType,
    entityId,
    overrides,
    roles
  );

  return permissions[action];
}
