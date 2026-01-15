import type { User, CustomRole, GroupPermissionOverride, PermissionSet } from '@/lib/types';
import { resolvePermissions } from './permissionResolver';

/**
 * Check if user can create sites
 */
export function canCreateSite(
  user: User | null,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): boolean {
  if (!user) return false;

  const permissions = resolvePermissions(user, 'sites', undefined, permissionOverrides, roles);
  return permissions.create;
}

/**
 * Check if user can view sites
 */
export function canViewSite(
  user: User | null,
  siteId: string,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): boolean {
  if (!user) return false;

  const permissions = resolvePermissions(user, 'sites', siteId, permissionOverrides, roles);
  return permissions.read;
}

/**
 * Check if user can update a site (creator or admin only)
 */
export function canUpdateSite(
  user: User | null,
  siteId: string,
  creatorId: string,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): boolean {
  if (!user) return false;

  const isAdmin = user.roleId === 'role-admin';
  const isCreator = user.id === creatorId;
  if (!isAdmin && !isCreator) return false;

  const permissions = resolvePermissions(user, 'sites', siteId, permissionOverrides, roles);
  return permissions.update;
}

/**
 * Check if user can delete a site (creator or admin only)
 */
export function canDeleteSite(
  user: User | null,
  siteId: string,
  creatorId: string,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): boolean {
  if (!user) return false;

  const isAdmin = user.roleId === 'role-admin';
  const isCreator = user.id === creatorId;
  if (!isAdmin && !isCreator) return false;

  const permissions = resolvePermissions(user, 'sites', siteId, permissionOverrides, roles);
  return permissions.delete;
}

/**
 * Get all site permissions for a user
 */
export function getSitePermissions(
  user: User | null,
  siteId: string | undefined,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): PermissionSet {
  if (!user) {
    return {
      create: false,
      read: false,
      update: false,
      delete: false,
    };
  }

  return resolvePermissions(user, 'sites', siteId, permissionOverrides, roles);
}
