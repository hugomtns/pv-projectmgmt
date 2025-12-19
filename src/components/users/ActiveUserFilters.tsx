import { useUserFilterStore } from '@/stores/userFilterStore';
import { useUserStore } from '@/stores/userStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function ActiveUserFilters() {
  const filters = useUserFilterStore((state) => state.filters);
  const { setRoleFilter, setGroupFilter, setFunctionFilter, setSearch, clearFilters } = useUserFilterStore();
  const roles = useUserStore((state) => state.roles);
  const groups = useUserStore((state) => state.groups);

  const hasActiveFilters =
    filters.roles.length > 0 ||
    filters.groups.length > 0 ||
    filters.function !== '' ||
    filters.search !== '';

  if (!hasActiveFilters) return null;

  const removeRole = (roleId: string) => {
    setRoleFilter(filters.roles.filter((id) => id !== roleId));
  };

  const removeGroup = (groupId: string) => {
    setGroupFilter(filters.groups.filter((id) => id !== groupId));
  };

  const removeFunction = () => {
    setFunctionFilter('');
  };

  const removeSearch = () => {
    setSearch('');
  };

  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b border-border">
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {filters.roles.map((roleId) => {
        const role = roles.find((r) => r.id === roleId);
        return (
          <Badge key={roleId} variant="secondary" className="gap-1">
            Role: {role?.name || 'Unknown'}
            <button
              onClick={() => removeRole(roleId)}
              className="ml-1 hover:text-foreground"
              aria-label={`Remove ${role?.name} filter`}
            >
              ×
            </button>
          </Badge>
        );
      })}

      {filters.groups.map((groupId) => {
        const group = groups.find((g) => g.id === groupId);
        return (
          <Badge key={groupId} variant="secondary" className="gap-1">
            Group: {group?.name || 'Unknown'}
            <button
              onClick={() => removeGroup(groupId)}
              className="ml-1 hover:text-foreground"
              aria-label={`Remove ${group?.name} filter`}
            >
              ×
            </button>
          </Badge>
        );
      })}

      {filters.function && (
        <Badge variant="secondary" className="gap-1">
          Function: {filters.function}
          <button onClick={removeFunction} className="ml-1 hover:text-foreground" aria-label="Remove function filter">
            ×
          </button>
        </Badge>
      )}

      {filters.search && (
        <Badge variant="secondary" className="gap-1">
          Search: {filters.search}
          <button onClick={removeSearch} className="ml-1 hover:text-foreground" aria-label="Remove search filter">
            ×
          </button>
        </Badge>
      )}

      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
        Clear all
      </Button>
    </div>
  );
}
