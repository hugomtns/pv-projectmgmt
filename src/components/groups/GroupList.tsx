import { Users, Pencil, Trash2, UserCog, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserStore } from '@/stores/userStore';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import type { UserGroup } from '@/lib/types';

interface GroupListProps {
  onEditGroup?: (group: UserGroup) => void;
  onManageMembers?: (group: UserGroup) => void;
  onManagePermissions?: (group: UserGroup) => void;
}

export function GroupList({ onEditGroup, onManageMembers, onManagePermissions }: GroupListProps) {
  const groups = useUserStore(state => state.groups);
  const deleteGroup = useUserStore(state => state.deleteGroup);

  const canUpdateGroup = usePermission('user_management', 'update');
  const canDeleteGroup = usePermission('user_management', 'delete');

  const handleDelete = (group: UserGroup) => {
    if (window.confirm(`Are you sure you want to delete the group "${group.name}"? This will remove all members from the group.`)) {
      deleteGroup(group.id);
      toast.success('Group deleted', {
        description: `${group.name} has been removed from the system.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Groups</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </p>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No groups yet. Create your first group!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{group.name}</CardTitle>
                    <CardDescription className="mt-1.5 line-clamp-2">
                      {group.description}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                    <Users className="h-3.5 w-3.5" />
                    {group.memberIds.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {canUpdateGroup && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditGroup?.(group)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  {canUpdateGroup && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onManageMembers?.(group)}
                    >
                      <UserCog className="h-4 w-4" />
                      Members
                    </Button>
                  )}
                  {canUpdateGroup && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onManagePermissions?.(group)}
                    >
                      <Shield className="h-4 w-4" />
                      Permissions
                    </Button>
                  )}
                  {canDeleteGroup && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(group)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
