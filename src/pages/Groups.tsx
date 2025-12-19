import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { GroupList } from '@/components/groups/GroupList';
import { GroupFormDialog } from '@/components/groups/GroupFormDialog';
import { GroupMembersDialog } from '@/components/groups/GroupMembersDialog';
import { GroupPermissionsDialog } from '@/components/groups/GroupPermissionsDialog';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import type { UserGroup } from '@/lib/types';

export function Groups() {
  const canCreateGroup = usePermission('user_management', 'create');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);

  const handleEditGroup = (group: UserGroup) => {
    setSelectedGroup(group);
    setEditDialogOpen(true);
  };

  const handleManageMembers = (group: UserGroup) => {
    setSelectedGroup(group);
    setMembersDialogOpen(true);
  };

  const handleManagePermissions = (group: UserGroup) => {
    setSelectedGroup(group);
    setPermissionsDialogOpen(true);
  };

  const handleCloseEditDialog = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setSelectedGroup(null);
    }
  };

  const handleCloseMembersDialog = (open: boolean) => {
    setMembersDialogOpen(open);
    if (!open) {
      setSelectedGroup(null);
    }
  };

  const handleClosePermissionsDialog = (open: boolean) => {
    setPermissionsDialogOpen(open);
    if (!open) {
      setSelectedGroup(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Group Management">
        <div className="flex gap-4 flex-1 max-w-4xl justify-end">
          {canCreateGroup && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              Create Group
            </Button>
          )}
        </div>
      </Header>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <GroupList
            onEditGroup={handleEditGroup}
            onManageMembers={handleManageMembers}
            onManagePermissions={handleManagePermissions}
          />
        </div>
      </div>

      <GroupFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <GroupFormDialog
        group={selectedGroup}
        open={editDialogOpen}
        onOpenChange={handleCloseEditDialog}
      />
      <GroupMembersDialog
        group={selectedGroup}
        open={membersDialogOpen}
        onOpenChange={handleCloseMembersDialog}
      />
      <GroupPermissionsDialog
        group={selectedGroup}
        open={permissionsDialogOpen}
        onOpenChange={handleClosePermissionsDialog}
      />
    </div>
  );
}
