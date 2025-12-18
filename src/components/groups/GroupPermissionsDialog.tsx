import { Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { UserGroup } from '@/lib/types';

interface GroupPermissionsDialogProps {
  group: UserGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupPermissionsDialog({ group, open, onOpenChange }: GroupPermissionsDialogProps) {
  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Group Permissions
          </DialogTitle>
          <DialogDescription>
            Manage permission overrides for "{group.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="rounded-full bg-muted p-4">
              <Info className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Permission Overrides Coming Soon</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Group-based permission overrides will allow you to grant or restrict specific permissions
                for this group on different entity types (projects, workflows, tasks, etc.).
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                For now, users in this group inherit permissions from their assigned roles.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
