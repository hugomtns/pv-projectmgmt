import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { UserInviteForm } from '@/components/users/UserInviteForm';
import { UserList } from '@/components/users/UserList';
import { UserEditDialog } from '@/components/users/UserEditDialog';
import type { User } from '@/lib/types';

export function Users() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setSelectedUser(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header title="User Management">
        <div className="flex gap-4 flex-1 max-w-4xl">
          {/* Future: Add user management actions here if needed */}
        </div>
      </Header>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-8">
          <UserInviteForm />
          <UserList onEditUser={handleEditUser} />
        </div>
      </div>

      <UserEditDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={handleCloseEditDialog}
      />
    </div>
  );
}
