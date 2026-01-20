/**
 * Site Comment Types
 *
 * Simple text-based comments for sites (no location anchoring).
 * Supports @mentions for notifications.
 */

export interface SiteComment {
  id: string;
  siteId: string;
  content: string;
  createdBy: string; // User's full name
  creatorId: string; // User ID for permission checks
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  /** User IDs mentioned in the comment via @mentions */
  mentions?: string[];
}
