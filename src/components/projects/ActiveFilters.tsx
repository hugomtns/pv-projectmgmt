import { useFilterStore } from '@/stores/filterStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useUserStore } from '@/stores/userStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getUserDisplayName } from '@/lib/userUtils';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { Priority } from '@/lib/types';

export function ActiveFilters() {
  const filters = useFilterStore((state) => state.filters);
  const { setStageFilter, setPriorityFilter, setOwnersFilter, setSearch, clearFilters } = useFilterStore();
  const workflow = useWorkflowStore((state) => state.workflow);
  const users = useUserStore((state) => state.users);

  const hasActiveFilters =
    filters.stages.length > 0 ||
    filters.priorities.length > 0 ||
    filters.owners.length > 0 ||
    filters.search !== '';

  if (!hasActiveFilters) return null;

  const removeStage = (stageId: string) => {
    setStageFilter(filters.stages.filter((id) => id !== stageId));
  };

  const removePriority = (priority: Priority) => {
    setPriorityFilter(filters.priorities.filter((p) => p !== priority));
  };

  const removeOwner = (ownerId: string) => {
    setOwnersFilter(filters.owners.filter((id) => id !== ownerId));
  };

  const removeSearch = () => {
    setSearch('');
  };

  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b border-border">
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {filters.stages.map((stageId) => {
        const stage = workflow.stages.find((s) => s.id === stageId);
        return (
          <Badge key={stageId} variant="secondary" className="gap-1">
            Stage: {stage?.name || 'Unknown'}
            <button
              onClick={() => removeStage(stageId)}
              className="ml-1 hover:text-foreground"
              aria-label={`Remove ${stage?.name} filter`}
            >
              ×
            </button>
          </Badge>
        );
      })}

      {filters.priorities.map((priority) => (
        <Badge key={priority} variant="secondary" className="gap-1">
          Priority: {PRIORITY_LABELS[priority]}
          <button
            onClick={() => removePriority(priority)}
            className="ml-1 hover:text-foreground"
            aria-label={`Remove ${PRIORITY_LABELS[priority]} filter`}
          >
            ×
          </button>
        </Badge>
      ))}

      {filters.owners.map((ownerId) => {
        const ownerName = getUserDisplayName(ownerId, users);
        return (
          <Badge key={ownerId} variant="secondary" className="gap-1">
            Owner: {ownerName}
            <button
              onClick={() => removeOwner(ownerId)}
              className="ml-1 hover:text-foreground"
              aria-label={`Remove ${ownerName} filter`}
            >
              ×
            </button>
          </Badge>
        );
      })}

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
