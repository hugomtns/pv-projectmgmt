import type { GroupPermissionOverride, PermissionSet } from '@/lib/types';
import { useUserStore } from '@/stores/userStore';

/**
 * Get all GroupPermissionOverrides that apply to a specific project.
 * Filters for entityType='projects', scope='specific', and projectId in specificEntityIds.
 */
export function getProjectGroupOverrides(
  projectId: string,
  overrides: GroupPermissionOverride[]
): GroupPermissionOverride[] {
  return overrides.filter(
    (o) =>
      o.entityType === 'projects' &&
      o.scope === 'specific' &&
      o.specificEntityIds.includes(projectId)
  );
}

/**
 * Find an existing override for a group that targets projects with scope='specific'.
 */
function findExistingOverride(
  groupId: string,
  overrides: GroupPermissionOverride[]
): GroupPermissionOverride | undefined {
  return overrides.find(
    (o) =>
      o.groupId === groupId &&
      o.entityType === 'projects' &&
      o.scope === 'specific'
  );
}

/**
 * Set project-specific CRUD permissions for a user group.
 * If the group already has a 'specific' projects override, adds/updates the projectId entry.
 * Otherwise creates a new override.
 */
export function setProjectGroupPermissions(
  projectId: string,
  groupId: string,
  permissions: Partial<PermissionSet>
): void {
  const store = useUserStore.getState();
  const existing = findExistingOverride(groupId, store.permissionOverrides);

  if (existing) {
    const updatedIds = existing.specificEntityIds.includes(projectId)
      ? existing.specificEntityIds
      : [...existing.specificEntityIds, projectId];

    store.updatePermissionOverride(existing.id, {
      specificEntityIds: updatedIds,
      permissions,
    });
  } else {
    store.addPermissionOverride({
      groupId,
      entityType: 'projects',
      scope: 'specific',
      specificEntityIds: [projectId],
      permissions,
    });
  }
}

/**
 * Remove a project from a group's specific override.
 * If the override has no remaining specificEntityIds, deletes it entirely.
 */
export function removeProjectGroupPermissions(
  projectId: string,
  groupId: string
): void {
  const store = useUserStore.getState();
  const existing = findExistingOverride(groupId, store.permissionOverrides);

  if (!existing) return;

  const remainingIds = existing.specificEntityIds.filter((id) => id !== projectId);

  if (remainingIds.length === 0) {
    store.deletePermissionOverride(existing.id);
  } else {
    store.updatePermissionOverride(existing.id, {
      specificEntityIds: remainingIds,
    });
  }
}
