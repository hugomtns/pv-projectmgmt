import { useState } from 'react';
import { Pencil, Trash2, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useUserStore } from '@/stores/userStore';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import type { User } from '@/lib/types';

interface UserListProps {
  searchQuery?: string;
  onEditUser?: (user: User) => void;
}

type SortKey = 'name' | 'email' | 'function' | 'role' | 'groups';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export function UserList({ searchQuery = '', onEditUser }: UserListProps) {
  const users = useUserStore(state => state.users);
  const groups = useUserStore(state => state.groups);
  const roles = useUserStore(state => state.roles);
  const deleteUser = useUserStore(state => state.deleteUser);

  const canUpdateUser = usePermission('user_management', 'update');
  const canDeleteUser = usePermission('user_management', 'delete');

  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5" />
      : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const getGroupNames = (groupIds: string[]): string => {
    const groupNames = groupIds
      .map(id => groups.find(g => g.id === id)?.name)
      .filter(Boolean);
    return groupNames.length > 0 ? groupNames.join(', ') : 'None';
  };

  const getRoleName = (roleId: string): string => {
    return roles.find(r => r.id === roleId)?.name ?? 'Unknown';
  };

  const getRoleBadgeVariant = (roleName: string): 'default' | 'secondary' | 'outline' => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'default';
      case 'user':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(query) ||
      user.lastName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue: string;
    let bValue: string;

    switch (sortConfig.key) {
      case 'name':
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case 'email':
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case 'function':
        aValue = a.function.toLowerCase();
        bValue = b.function.toLowerCase();
        break;
      case 'role':
        aValue = getRoleName(a.roleId).toLowerCase();
        bValue = getRoleName(b.roleId).toLowerCase();
        break;
      case 'groups':
        aValue = getGroupNames(a.groupIds).toLowerCase();
        bValue = getGroupNames(b.groupIds).toLowerCase();
        break;
      default:
        return 0;
    }

    const comparison = aValue.localeCompare(bValue);
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const handleDelete = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      deleteUser(user.id);
      toast.success('User deleted', {
        description: `${user.firstName} ${user.lastName} has been removed from the system.`,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-medium"
                >
                  Name
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('email')}
                  className="h-auto p-0 font-medium"
                >
                  Email
                  {getSortIcon('email')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('function')}
                  className="h-auto p-0 font-medium"
                >
                  Function
                  {getSortIcon('function')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('role')}
                  className="h-auto p-0 font-medium"
                >
                  Role
                  {getSortIcon('role')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('groups')}
                  className="h-auto p-0 font-medium"
                >
                  Groups
                  {getSortIcon('groups')}
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'No users found matching your search.' : 'No users yet. Invite your first user!'}
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.function}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(getRoleName(user.roleId))}>
                      {getRoleName(user.roleId)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getGroupNames(user.groupIds)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {canUpdateUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditUser?.(user)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {canDeleteUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
