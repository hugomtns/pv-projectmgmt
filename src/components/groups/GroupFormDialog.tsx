import { useState, useEffect } from 'react';
import { UsersRound, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/stores/userStore';
import { toast } from 'sonner';
import type { UserGroup } from '@/lib/types';

interface GroupFormDialogProps {
  group?: UserGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupFormDialog({ group, open, onOpenChange }: GroupFormDialogProps) {
  const addGroup = useUserStore(state => state.addGroup);
  const updateGroup = useUserStore(state => state.updateGroup);

  const isEditMode = !!group;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-populate form when group changes
  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        description: group.description,
      });
      setErrors({});
    } else {
      setFormData({
        name: '',
        description: '',
      });
      setErrors({});
    }
  }, [group, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditMode && group) {
      updateGroup(group.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
      });
      toast.success('Group updated successfully', {
        description: `Changes to ${formData.name} have been saved.`,
      });
    } else {
      addGroup({
        name: formData.name.trim(),
        description: formData.description.trim(),
        memberIds: [],
      });
      toast.success('Group created successfully', {
        description: `${formData.name} has been added to the system.`,
      });
    }

    // Clear form and close dialog
    setFormData({
      name: '',
      description: '',
    });
    setErrors({});
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <UsersRound className="h-5 w-5" />
                Edit Group
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Create New Group
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update group information'
              : 'Create a new group to organize users with similar permissions'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Project Alpha Team"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupDescription">Description</Label>
            <textarea
              id="groupDescription"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the group's purpose..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditMode ? (
                'Save Changes'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Group
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
