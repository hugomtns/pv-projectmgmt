/**
 * NotificationPreferencesDialog - User notification settings
 *
 * Allows users to configure which notifications they receive.
 */

import { useEffect, useState } from 'react';
import { Bell, AtSign, CheckSquare, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/stores/userStore';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from '@/lib/types/notification';
import { toast } from 'sonner';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferencesDialog({
  open,
  onOpenChange,
}: NotificationPreferencesDialogProps) {
  const currentUser = useUserStore((state) => state.currentUser);
  const updateUser = useUserStore((state) => state.updateUser);

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  // Load user preferences when dialog opens
  useEffect(() => {
    if (open && currentUser) {
      setPreferences(
        currentUser.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES
      );
    }
  }, [open, currentUser]);

  const handleSave = () => {
    if (!currentUser) return;

    updateUser(currentUser.id, {
      notificationPreferences: preferences,
    });

    toast.success('Notification preferences saved');
    onOpenChange(false);
  };

  const handleReset = () => {
    setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
  };

  if (!currentUser) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Choose which notifications you want to receive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Task Assigned */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="task-assigned" className="text-sm font-medium">
                  Task Assignments
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when someone assigns a task to you
                </p>
              </div>
            </div>
            <Switch
              id="task-assigned"
              checked={preferences.taskAssigned}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, taskAssigned: checked }))
              }
            />
          </div>

          <Separator />

          {/* Mentioned in Comment */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                <AtSign className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="mentions" className="text-sm font-medium">
                  @Mentions
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when someone mentions you in a comment
                </p>
              </div>
            </div>
            <Switch
              id="mentions"
              checked={preferences.mentionedInComment}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({
                  ...prev,
                  mentionedInComment: checked,
                }))
              }
            />
          </div>

          <Separator />

          {/* Task Due Soon */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="due-soon" className="text-sm font-medium">
                    Due Date Reminders
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get reminded before tasks are due
                  </p>
                </div>
              </div>
              <Switch
                id="due-soon"
                checked={preferences.taskDueSoon}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, taskDueSoon: checked }))
                }
              />
            </div>

            {preferences.taskDueSoon && (
              <div className="ml-11 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Remind me</Label>
                  <span className="text-sm text-muted-foreground">
                    {preferences.taskDueSoonDays}{' '}
                    {preferences.taskDueSoonDays === 1 ? 'day' : 'days'} before
                  </span>
                </div>
                <Slider
                  value={[preferences.taskDueSoonDays]}
                  onValueChange={([value]) =>
                    setPreferences((prev) => ({
                      ...prev,
                      taskDueSoonDays: value,
                    }))
                  }
                  min={1}
                  max={7}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset to defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save preferences</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
