/**
 * NotificationItem - Single notification display
 *
 * Shows notification icon, title, message, timestamp, and unread indicator.
 * Handles click to navigate and mark as read.
 */

import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AtSign, CheckSquare, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Notification, NotificationType } from '@/lib/types/notification';

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'task_assigned':
      return <CheckSquare className="h-4 w-4 text-blue-500" />;
    case 'mentioned_in_comment':
      return <AtSign className="h-4 w-4 text-purple-500" />;
    case 'task_due_soon':
      return <Clock className="h-4 w-4 text-orange-500" />;
    default:
      return <CheckSquare className="h-4 w-4" />;
  }
}

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const navigate = useNavigate();
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const deleteNotification = useNotificationStore((state) => state.deleteNotification);

  const handleClick = () => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate based on link type
    if (notification.link) {
      const { link } = notification;
      switch (link.type) {
        case 'task':
          if (link.projectId) {
            // Navigate to project detail with task highlighted
            navigate(`/projects/${link.projectId}`, {
              state: { highlightTaskId: link.taskId, stageId: link.stageId },
            });
          }
          break;
        case 'document':
          if (link.documentId) {
            // Navigate to document with optional comment highlighted
            navigate(`/documents/${link.documentId}`, {
              state: link.commentId
                ? { highlightCommentId: link.commentId, commentType: link.commentType }
                : undefined,
            });
          }
          break;
        case 'design':
          if (link.designId) {
            // Navigate to design with optional comment highlighted
            navigate(`/designs/${link.designId}`, {
              state: link.commentId
                ? { highlightCommentId: link.commentId, commentType: link.commentType }
                : undefined,
            });
          }
          break;
      }
    }

    // Close dropdown
    onClose?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-accent rounded-md transition-colors',
        !notification.read && 'bg-accent/50'
      )}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm leading-tight',
                !notification.read && 'font-medium'
              )}
            >
              {notification.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          </div>

          {/* Delete button (appears on hover) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={handleDelete}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Delete notification</span>
          </Button>
        </div>

        {/* Timestamp and actor */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {notification.actorName && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {notification.actorName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Unread dot */}
      {!notification.read && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
      )}
    </div>
  );
}
