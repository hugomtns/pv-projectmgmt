import type { User, CustomRole, GroupPermissionOverride, EntityType, PermissionSet } from '@/lib/types';

/**
 * Resolves the effective permissions for a user on a specific entity type
 *
 * Permission Resolution Logic:
 * 1. Start with ROLE DEFAULTS for the user's role
 * 2. Get all GROUPS the user belongs to
 * 3. For each group, check for OVERRIDES matching the entity type
 * 4. Apply overrides using UNION with HIGHEST PERMISSION WINS:
 *    - If any override grants 'create', user can create
 *    - If any override grants 'read', user can read
 *    - etc.
 * 5. Specific entity overrides take precedence over "all" overrides
 */
export function resolvePermissions(
  user: User,
  entityType: EntityType,
  entityId: string | undefined,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): PermissionSet {
  // Step 1: Get role defaults
  const userRole = roles.find(r => r.id === user.roleId);
  const basePermissions: PermissionSet = userRole?.permissions[entityType] ?? {
    create: false,
    read: false,
    update: false,
    delete: false,
  };

  // Step 2: Get user's groups
  const userGroups = user.groupIds;

  if (userGroups.length === 0) {
    return basePermissions;
  }

  // Step 3 & 4: Find applicable overrides
  const applicableOverrides = permissionOverrides.filter(
    override => userGroups.includes(override.groupId) && override.entityType === entityType
  );

  if (applicableOverrides.length === 0) {
    return basePermissions;
  }

  // Step 5: Separate "all" vs "specific" overrides
  const allOverrides = applicableOverrides.filter(override => override.scope === 'all');
  const specificOverrides = entityId
    ? applicableOverrides.filter(
        override => override.scope === 'specific' && override.specificEntityIds.includes(entityId)
      )
    : [];

  // Start with base permissions
  const effectivePermissions: PermissionSet = { ...basePermissions };

  // Apply "all" overrides with OR logic (union)
  allOverrides.forEach(override => {
    if (override.permissions.create !== undefined) {
      effectivePermissions.create = effectivePermissions.create || override.permissions.create;
    }
    if (override.permissions.read !== undefined) {
      effectivePermissions.read = effectivePermissions.read || override.permissions.read;
    }
    if (override.permissions.update !== undefined) {
      effectivePermissions.update = effectivePermissions.update || override.permissions.update;
    }
    if (override.permissions.delete !== undefined) {
      effectivePermissions.delete = effectivePermissions.delete || override.permissions.delete;
    }
  });

  // Apply specific entity overrides (replace, not OR)
  specificOverrides.forEach(override => {
    if (override.permissions.create !== undefined) {
      effectivePermissions.create = override.permissions.create;
    }
    if (override.permissions.read !== undefined) {
      effectivePermissions.read = override.permissions.read;
    }
    if (override.permissions.update !== undefined) {
      effectivePermissions.update = override.permissions.update;
    }
    if (override.permissions.delete !== undefined) {
      effectivePermissions.delete = override.permissions.delete;
    }
  });

  return effectivePermissions;
}

/**
 * Resolves permissions for all entity types for a user
 */
export function resolveAllPermissions(
  user: User,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): Record<EntityType, PermissionSet> {
  const entityTypes: EntityType[] = [
    'projects',
    'workflows',
    'tasks',
    'comments',
    'user_management',
  ];

  const permissions: Record<string, PermissionSet> = {};

  entityTypes.forEach(entityType => {
    permissions[entityType] = resolvePermissions(
      user,
      entityType,
      undefined,
      permissionOverrides,
      roles
    );
  });

  return permissions as Record<EntityType, PermissionSet>;
}
