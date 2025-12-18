import { useState, useEffect } from 'react';
import { UserCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/stores/userStore';
import { toast } from 'sonner';
import type { UserGroup } from '@/lib/types';

interface GroupMembersDialogProps {
  group: UserGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupMembersDialog({ group, open, onOpenChange }: GroupMembersDialogProps) {
  const users = useUserStore(state => state.users);
  const roles = useUserStore(state => state.roles);
  const updateGroup = useUserStore(state => state.updateGroup);
  const updateUser = useUserStore(state => state.updateUser);

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Pre-check users already in group
  useEffect(() => {
    if (group) {
      setSelectedUserIds(group.memberIds);
    }
  }, [group, open]);

  const handleToggleUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds([...selectedUserIds, userId]);
    } else {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    }
  };

  const handleSave = () => {
    if (!group) return;

    // Update group memberIds
    updateGroup(group.id, {
      memberIds: selectedUserIds,
    });

    // Update user groupIds - bidirectional sync
    // For users being added to the group
    selectedUserIds.forEach(userId => {
      const user = users.find(u => u.id === userId);
      if (user && !user.groupIds.includes(group.id)) {
        updateUser(user.id, {
          groupIds: [...user.groupIds, group.id],
        });
      }
    });

    // For users being removed from the group
    group.memberIds.forEach(userId => {
      if (!selectedUserIds.includes(userId)) {
        const user = users.find(u => u.id === userId);
        if (user) {
          updateUser(user.id, {
            groupIds: user.groupIds.filter(id => id !== group.id),
          });
        }
      }
    });

    toast.success('Members updated', {
      description: `${group.name} now has ${selectedUserIds.length} ${selectedUserIds.length === 1 ? 'member' : 'members'}.`,
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (group) {
      setSelectedUserIds(group.memberIds);
    }
    onOpenChange(false);
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Manage Group Members
          </DialogTitle>
          <DialogDescription>
            Select users to add or remove from "{group.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users available. Create users first!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-accent">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={(checked) =>
                        handleToggleUser(user.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`user-${user.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.function} • {roles.find(r => r.id === user.roleId)?.name ?? 'Unknown'}
                        </p>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {selectedUserIds.length} {selectedUserIds.length === 1 ? 'member' : 'members'} selected
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
