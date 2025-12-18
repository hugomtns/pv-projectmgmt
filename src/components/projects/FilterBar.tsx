import { useFilterStore } from '@/stores/filterStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { Priority } from '@/lib/types';

export function FilterBar() {
  const filters = useFilterStore((state) => state.filters);
  const { setStageFilter, setPriorityFilter, setOwnerFilter } = useFilterStore();
  const workflow = useWorkflowStore((state) => state.workflow);
  const projects = useProjectStore((state) => state.projects);

  // Calculate counts for each stage and priority
  const stageCounts = new Map<string, number>();
  const priorityCounts = new Map<Priority, number>();

  projects.forEach((project) => {
    stageCounts.set(project.currentStageId, (stageCounts.get(project.currentStageId) || 0) + 1);
    priorityCounts.set(project.priority, (priorityCounts.get(project.priority) || 0) + 1);
  });

  const handleStageToggle = (stageId: string) => {
    const newStages = filters.stages.includes(stageId)
      ? filters.stages.filter((id) => id !== stageId)
      : [...filters.stages, stageId];
    setStageFilter(newStages);
  };

  const handlePriorityToggle = (priority: Priority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];
    setPriorityFilter(newPriorities);
  };

  const activeFilterCount =
    filters.stages.length + filters.priorities.length + (filters.owner ? 1 : 0);

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
            <h4 className="font-medium text-sm mb-3">Stages</h4>
            <div className="space-y-2">
              {workflow.stages.map((stage) => (
                <div key={stage.id} className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`stage-${stage.id}`}
                      checked={filters.stages.includes(stage.id)}
                      onCheckedChange={() => handleStageToggle(stage.id)}
                    />
                    <label
                      htmlFor={`stage-${stage.id}`}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {stage.name}
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {stageCounts.get(stage.id) || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-3">Priority</h4>
            <div className="space-y-2">
              {([1, 2, 3, 4, 0] as Priority[]).map((priority) => (
                <div key={priority} className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${priority}`}
                      checked={filters.priorities.includes(priority)}
                      onCheckedChange={() => handlePriorityToggle(priority)}
                    />
                    <label
                      htmlFor={`priority-${priority}`}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {PRIORITY_LABELS[priority]}
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {priorityCounts.get(priority) || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-3">Owner</h4>
            <Input
              placeholder="Filter by owner..."
              value={filters.owner}
              onChange={(e) => setOwnerFilter(e.target.value)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
