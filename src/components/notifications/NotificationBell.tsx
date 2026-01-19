/**
 * NotificationBell - Header notification bell with dropdown
 *
 * Shows bell icon with unread count badge.
 * Popover dropdown displays notification list with mark all as read.
 */

import { useState } from 'react';
import { Bell, CheckCheck, Settings, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationItem } from './NotificationItem';
import { NotificationPreferencesDialog } from './NotificationPreferencesDialog';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const currentUser = useUserStore((state) => state.currentUser);
  const { getUnreadCount, getNotificationsForUser, markAllAsRead } =
    useNotificationStore();

  // If no user logged in, don't show the bell
  if (!currentUser) {
    return null;
  }

  const unreadCount = getUnreadCount(currentUser.id);
  const notifications = getNotificationsForUser(currentUser.id);

  const handleMarkAllAsRead = () => {
    markAllAsRead(currentUser.id);
  };

  const handleOpenPreferences = () => {
    setOpen(false);
    setPreferencesOpen(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium',
                  unreadCount < 10 ? 'h-4 w-4' : 'h-5 min-w-5 px-1'
                )}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-80 p-0"
          align="end"
          alignOffset={-4}
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <h4 className="font-semibold text-sm">Notifications</h4>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleOpenPreferences}
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="sr-only">Notification settings</span>
              </Button>
            </div>
          </div>

          {/* Notification list */}
          {notifications.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="p-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClose={() => setOpen(false)}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <NotificationPreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </>
  );
}
