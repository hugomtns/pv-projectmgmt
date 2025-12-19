import { useState } from 'react';
import { Pencil, Trash2, ArrowUp, ArrowDown, ChevronsUpDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserStore } from '@/stores/userStore';
import { useUserFilterStore } from '@/stores/userFilterStore';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import { UserAvatar } from './UserAvatar';
import type { User } from '@/lib/types';

interface UserListProps {
  onEditUser?: (user: User) => void;
}

type SortKey = 'name' | 'email' | 'function' | 'role' | 'groups';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const GRID_COLS = 'minmax(200px, 2fr) minmax(250px, 2.5fr) minmax(180px, 1.5fr) minmax(120px, 1fr) minmax(180px, 1.5fr) minmax(150px, 1.25fr)';

export function UserList({ onEditUser }: UserListProps) {
  const users = useUserStore(state => state.users);
  const groups = useUserStore(state => state.groups);
  const roles = useUserStore(state => state.roles);
  const deleteUser = useUserStore(state => state.deleteUser);
  const filters = useUserFilterStore(state => state.filters);

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

  // Apply filters
  const filteredUsers = users.filter((user) => {
    if (filters.roles.length > 0 && !filters.roles.includes(user.roleId)) return false;
    if (filters.groups.length > 0 && !user.groupIds.some(gid => filters.groups.includes(gid))) return false;
    if (filters.function && !user.function.toLowerCase().includes(filters.function.toLowerCase())) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Apply sorting
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

  const hasActiveFilters = filters.search || filters.roles.length > 0 || filters.groups.length > 0 || filters.function;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header Row */}
      <div
        className="grid border-b border-border bg-muted/50"
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        <div className="px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('name')}
            className="h-auto p-0 font-medium"
          >
            Name
            {getSortIcon('name')}
          </Button>
        </div>
        <div className="px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('email')}
            className="h-auto p-0 font-medium"
          >
            Email
            {getSortIcon('email')}
          </Button>
        </div>
        <div className="px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('function')}
            className="h-auto p-0 font-medium"
          >
            Function
            {getSortIcon('function')}
          </Button>
        </div>
        <div className="px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('role')}
            className="h-auto p-0 font-medium"
          >
            Role
            {getSortIcon('role')}
          </Button>
        </div>
        <div className="px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort('groups')}
            className="h-auto p-0 font-medium"
          >
            Groups
            {getSortIcon('groups')}
          </Button>
        </div>
        <div className="px-4 py-3 text-sm font-medium text-muted-foreground text-right">Actions</div>
      </div>

      {/* Data Rows or Empty State */}
      {sortedUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {hasActiveFilters
              ? 'No users found matching your filters.'
              : 'No users yet. Invite your first user!'}
          </p>
        </div>
      ) : (
        sortedUsers.map((user) => (
          <div
            key={user.id}
            className="grid hover:bg-muted/50 border-b border-border last:border-b-0"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div
              className="px-4 py-3 cursor-pointer"
              onClick={() => onEditUser?.(user)}
            >
              <div className="flex items-center gap-2">
                <UserAvatar userId={user.id} size="sm" showTooltip={false} />
                <span className="text-sm font-medium truncate" title={`${user.firstName} ${user.lastName}`}>
                  {user.firstName} {user.lastName}
                </span>
              </div>
            </div>
            <div
              className="px-4 py-3 text-sm truncate cursor-pointer"
              title={user.email}
              onClick={() => onEditUser?.(user)}
            >
              {user.email}
            </div>
            <div
              className="px-4 py-3 text-sm truncate cursor-pointer"
              title={user.function}
              onClick={() => onEditUser?.(user)}
            >
              {user.function}
            </div>
            <div
              className="px-4 py-3 text-sm cursor-pointer"
              onClick={() => onEditUser?.(user)}
            >
              <Badge variant={getRoleBadgeVariant(getRoleName(user.roleId))}>
                {getRoleName(user.roleId)}
              </Badge>
            </div>
            <div
              className="px-4 py-3 text-sm text-muted-foreground truncate cursor-pointer"
              title={getGroupNames(user.groupIds)}
              onClick={() => onEditUser?.(user)}
            >
              {getGroupNames(user.groupIds)}
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                {canUpdateUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditUser?.(user);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                {canDeleteUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(user);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
