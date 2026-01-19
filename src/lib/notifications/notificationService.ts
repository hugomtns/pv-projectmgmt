/**
 * Notification Service
 *
 * Handles triggering notifications for various events.
 * Checks user preferences before sending notifications.
 */

import { useNotificationStore, createTaskLink, createDocumentLink, createDesignLink } from '@/stores/notificationStore';
import { useUserStore } from '@/stores/userStore';
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from '@/lib/types/notification';
import type { User, Task } from '@/lib/types';

/**
 * Get user's notification preferences (with defaults)
 */
function getUserPreferences(user: User): NotificationPreferences {
  return user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
}

/**
 * Check if user wants to receive a specific notification type
 */
function shouldNotify(user: User, type: 'taskAssigned' | 'mentionedInComment' | 'taskDueSoon'): boolean {
  const prefs = getUserPreferences(user);
  return prefs[type];
}

/**
 * Get the user by ID
 */
function getUser(userId: string): User | undefined {
  return useUserStore.getState().users.find((u) => u.id === userId);
}

/**
 * Notify users when mentioned in a comment
 */
export function notifyMention(params: {
  actorId: string;
  actorName: string;
  mentionedUserIds: string[];
  commentText: string;
  commentId?: string;
  context:
    | { type: 'task'; projectId: string; stageId: string; taskId: string; taskTitle: string }
    | { type: 'document'; documentId: string; documentName: string; commentType?: 'location' | 'general' }
    | { type: 'design'; designId: string; designName: string; projectId?: string; commentType?: 'element' | 'general' };
}): void {
  const { actorId, actorName, mentionedUserIds, commentText, commentId, context } = params;
  const { addNotification } = useNotificationStore.getState();

  // Truncate comment for message
  const truncatedComment =
    commentText.length > 100 ? `${commentText.slice(0, 100)}...` : commentText;

  for (const userId of mentionedUserIds) {
    // Don't notify yourself
    if (userId === actorId) continue;

    const user = getUser(userId);
    if (!user) continue;

    // Check preferences
    if (!shouldNotify(user, 'mentionedInComment')) continue;

    // Create notification based on context type
    let title: string;
    let link;

    switch (context.type) {
      case 'task':
        title = `Mentioned in task: ${context.taskTitle}`;
        link = createTaskLink(context.projectId, context.stageId, context.taskId);
        break;
      case 'document':
        title = `Mentioned in document: ${context.documentName}`;
        link = createDocumentLink(context.documentId, commentId, context.commentType);
        break;
      case 'design':
        title = `Mentioned in design: ${context.designName}`;
        link = createDesignLink(context.designId, context.projectId, commentId, context.commentType);
        break;
    }

    addNotification({
      userId,
      type: 'mentioned_in_comment',
      title,
      message: `${actorName} mentioned you: "${truncatedComment}"`,
      actorId,
      actorName,
      link,
    });
  }
}

/**
 * Notify user when assigned to a task
 */
export function notifyTaskAssigned(params: {
  actorId: string;
  actorName: string;
  assigneeId: string;
  task: Task;
  projectId: string;
  stageId: string;
  projectName?: string;
}): void {
  const { actorId, actorName, assigneeId, task, projectId, stageId, projectName } = params;

  // Don't notify yourself
  if (assigneeId === actorId) return;

  const user = getUser(assigneeId);
  if (!user) return;

  // Check preferences
  if (!shouldNotify(user, 'taskAssigned')) return;

  const { addNotification } = useNotificationStore.getState();

  addNotification({
    userId: assigneeId,
    type: 'task_assigned',
    title: `New task assigned: ${task.title}`,
    message: projectName
      ? `${actorName} assigned you to "${task.title}" in project "${projectName}"`
      : `${actorName} assigned you to "${task.title}"`,
    actorId,
    actorName,
    link: createTaskLink(projectId, stageId, task.id),
  });
}

/**
 * Notify user about upcoming due date
 */
export function notifyTaskDueSoon(params: {
  userId: string;
  task: Task;
  projectId: string;
  stageId: string;
  daysUntilDue: number;
  projectName?: string;
}): void {
  const { userId, task, projectId, stageId, daysUntilDue, projectName } = params;

  const user = getUser(userId);
  if (!user) return;

  // Check preferences
  const prefs = getUserPreferences(user);
  if (!prefs.taskDueSoon) return;

  // Check if within notification window
  if (daysUntilDue > prefs.taskDueSoonDays) return;

  const { addNotification } = useNotificationStore.getState();

  const dueText =
    daysUntilDue === 0
      ? 'due today'
      : daysUntilDue === 1
      ? 'due tomorrow'
      : `due in ${daysUntilDue} days`;

  addNotification({
    userId,
    type: 'task_due_soon',
    title: `Task ${dueText}: ${task.title}`,
    message: projectName
      ? `Your task "${task.title}" in project "${projectName}" is ${dueText}`
      : `Your task "${task.title}" is ${dueText}`,
    actorId: userId, // System-generated, actor is the user themselves
    actorName: 'System',
    link: createTaskLink(projectId, stageId, task.id),
  });
}

/**
 * Check all tasks for upcoming due dates and notify assignees
 * This should be called periodically (e.g., on app load, once per day)
 */
export function checkDueDateReminders(): void {
  // This would need access to all projects and tasks
  // For now, this is a placeholder that could be called from a useEffect
  // The actual implementation would iterate through all tasks and check due dates
}
