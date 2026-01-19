/**
 * Notification Store
 *
 * Manages in-app notifications for task assignments, @mentions, and due date reminders.
 * Notifications are persisted to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification, NotificationLink } from '@/lib/types/notification';

interface NotificationState {
  // State
  notifications: Notification[];

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: (userId: string) => void;
  deleteNotification: (notificationId: string) => void;
  clearAllForUser: (userId: string) => void;

  // Getters
  getUnreadCount: (userId: string) => number;
  getNotificationsForUser: (userId: string) => Notification[];
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
      },

      markAsRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        }));
      },

      markAllAsRead: (userId) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n
          ),
        }));
      },

      deleteNotification: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== notificationId),
        }));
      },

      clearAllForUser: (userId) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.userId !== userId),
        }));
      },

      getUnreadCount: (userId) => {
        return get().notifications.filter((n) => n.userId === userId && !n.read).length;
      },

      getNotificationsForUser: (userId) => {
        return get()
          .notifications.filter((n) => n.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },
    }),
    { name: 'notification-storage' }
  )
);

/**
 * Helper to create a notification link for a task
 */
export function createTaskLink(
  projectId: string,
  stageId: string,
  taskId: string
): NotificationLink {
  return {
    type: 'task',
    projectId,
    stageId,
    taskId,
  };
}

/**
 * Helper to create a notification link for a document
 */
export function createDocumentLink(
  documentId: string,
  commentId?: string,
  commentType?: 'location' | 'general'
): NotificationLink {
  return {
    type: 'document',
    documentId,
    commentId,
    commentType,
  };
}

/**
 * Helper to create a notification link for a design
 */
export function createDesignLink(
  designId: string,
  projectId?: string,
  commentId?: string,
  commentType?: 'element' | 'general'
): NotificationLink {
  return {
    type: 'design',
    designId,
    projectId,
    commentId,
    commentType,
  };
}
