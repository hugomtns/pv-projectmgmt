import type { User, CustomRole, GroupPermissionOverride, PermissionSet } from '@/lib/types';
import { resolvePermissions } from './permissionResolver';

/**
 * Check if user can upload new documents or versions
 */
export function canUploadDocument(
  user: User | null,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): boolean {
  if (!user) return false;

  const permissions = resolvePermissions(user, 'documents', undefined, permissionOverrides, roles);
  return permissions.create;
}

/**
 * Check if user can view/download documents
 */
export function canViewDocument(
  user: User | null,
  documentId: string,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): boolean {
  if (!user) return false;

  const permissions = resolvePermissions(user, 'documents', documentId, permissionOverrides, roles);
  return permissions.read;
}

/**
 * Check if user can add comments or drawings to documents
 */
export function canAnnotateDocument(
  user: User | null,
  documentId: string,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): boolean {
  if (!user) return false;

  const permissions = resolvePermissions(user, 'documents', documentId, permissionOverrides, roles);
  return permissions.update;
}

/**
 * Check if user can change document status (approve/reject)
 */
export function canChangeDocumentStatus(
  user: User | null,
  documentId: string,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): boolean {
  if (!user) return false;

  const permissions = resolvePermissions(user, 'documents', documentId, permissionOverrides, roles);
  // Require update permission for status changes
  return permissions.update;
}

/**
 * Check if user can delete documents
 */
export function canDeleteDocument(
  user: User | null,
  documentId: string,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): boolean {
  if (!user) return false;

  const permissions = resolvePermissions(user, 'documents', documentId, permissionOverrides, roles);
  return permissions.delete;
}

/**
 * Get all document permissions for a user
 */
export function getDocumentPermissions(
  user: User | null,
  documentId: string | undefined,
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

  return resolvePermissions(user, 'documents', documentId, permissionOverrides, roles);
}
