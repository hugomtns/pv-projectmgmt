import { useUserFilterStore } from '@/stores/userFilterStore';
import { useUserStore } from '@/stores/userStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

export function UserFilterBar() {
  const filters = useUserFilterStore((state) => state.filters);
  const { setRoleFilter, setGroupFilter, setFunctionFilter } = useUserFilterStore();
  const users = useUserStore((state) => state.users);
  const groups = useUserStore((state) => state.groups);
  const roles = useUserStore((state) => state.roles);

  // Calculate counts for each role and group
  const roleCounts = new Map<string, number>();
  const groupCounts = new Map<string, number>();

  users.forEach((user) => {
    roleCounts.set(user.roleId, (roleCounts.get(user.roleId) || 0) + 1);
    user.groupIds.forEach((groupId) => {
      groupCounts.set(groupId, (groupCounts.get(groupId) || 0) + 1);
    });
  });

  const handleRoleToggle = (roleId: string) => {
    const newRoles = filters.roles.includes(roleId)
      ? filters.roles.filter((id) => id !== roleId)
      : [...filters.roles, roleId];
    setRoleFilter(newRoles);
  };

  const handleGroupToggle = (groupId: string) => {
    const newGroups = filters.groups.includes(groupId)
      ? filters.groups.filter((id) => id !== groupId)
      : [...filters.groups, groupId];
    setGroupFilter(newGroups);
  };

  const activeFilterCount =
    filters.roles.length + filters.groups.length + (filters.function ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-3">Role</h4>
            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={filters.roles.includes(role.id)}
                      onCheckedChange={() => handleRoleToggle(role.id)}
                    />
                    <label
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role.name}
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {roleCounts.get(role.id) || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-3">Groups</h4>
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={filters.groups.includes(group.id)}
                      onCheckedChange={() => handleGroupToggle(group.id)}
                    />
                    <label
                      htmlFor={`group-${group.id}`}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {group.name}
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {groupCounts.get(group.id) || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-3">Function</h4>
            <Input
              placeholder="Filter by function..."
              value={filters.function}
              onChange={(e) => setFunctionFilter(e.target.value)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
