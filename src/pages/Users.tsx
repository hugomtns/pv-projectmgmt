import { useState } from 'react';
import { Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { UserList } from '@/components/users/UserList';
import { UserInviteDialog } from '@/components/users/UserInviteDialog';
import { UserEditDialog } from '@/components/users/UserEditDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/usePermission';
import type { User } from '@/lib/types';

export function Users() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const canCreateUser = usePermission('user_management', 'create');

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
        <div className="flex gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {canCreateUser && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              Invite User
            </Button>
          )}
        </div>
      </Header>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <UserList searchQuery={searchQuery} onEditUser={handleEditUser} />
        </div>
      </div>

      <UserInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
      <UserEditDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={handleCloseEditDialog}
      />
    </div>
  );
}
