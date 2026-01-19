/**
 * Notification types for the in-app notification system
 */

export type NotificationType = 'task_assigned' | 'mentioned_in_comment' | 'task_due_soon';

export interface NotificationLink {
  type: 'task' | 'document' | 'design';
  projectId?: string;
  stageId?: string;
  taskId?: string;
  documentId?: string;
  designId?: string;
  /** Comment ID for navigating to a specific comment */
  commentId?: string;
  /** Comment type for selecting the correct tab ('element' or 'general' for designs, 'location' or 'general' for documents) */
  commentType?: 'element' | 'general' | 'location';
}

export interface Notification {
  id: string;
  /** Recipient user ID */
  userId: string;
  /** Type of notification */
  type: NotificationType;
  /** Short title */
  title: string;
  /** Longer description */
  message: string;
  /** Whether the user has read/seen this notification */
  read: boolean;
  /** When the notification was created */
  createdAt: string;
  /** User ID of who triggered the notification */
  actorId: string;
  /** Display name of actor */
  actorName: string;
  /** Optional link for navigation when clicked */
  link?: NotificationLink;
}

export interface NotificationPreferences {
  /** Notify when assigned to a task */
  taskAssigned: boolean;
  /** Notify when mentioned in a comment */
  mentionedInComment: boolean;
  /** Notify when a task is due soon */
  taskDueSoon: boolean;
  /** Days before due date to send reminder */
  taskDueSoonDays: number;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  taskAssigned: true,
  mentionedInComment: true,
  taskDueSoon: true,
  taskDueSoonDays: 2,
};
