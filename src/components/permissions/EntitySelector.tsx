import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type { EntityType } from '@/lib/types/permission';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { getEntityTypeLabel } from '@/lib/permissions/entityHelpers';

interface EntitySelectorProps {
  entityType: EntityType;
  scope: 'all' | 'specific';
  selectedEntityIds: string[];
  onChange: (scope: 'all' | 'specific', selectedEntityIds: string[]) => void;
}

interface EntityOption {
  id: string;
  label: string;
}

export function EntitySelector({ entityType, scope, selectedEntityIds, onChange }: EntitySelectorProps) {
  const entityTypeLabel = getEntityTypeLabel(entityType);

  // Fetch entities based on type
  const getEntityOptions = (): EntityOption[] => {
    switch (entityType) {
      case 'projects': {
        const projects = useProjectStore.getState().projects;
        return projects.map(p => ({
          id: p.id,
          label: `${p.name} (${p.location})`
        }));
      }

      case 'workflows': {
        const workflow = useWorkflowStore.getState().workflow;
        return workflow.stages.map(s => ({
          id: s.id,
          label: s.name
        }));
      }

      case 'tasks': {
        const projects = useProjectStore.getState().projects;
        const workflow = useWorkflowStore.getState().workflow;
        const tasks: EntityOption[] = [];

        projects.forEach(project => {
          Object.entries(project.stages).forEach(([stageId, stageData]) => {
            const stage = workflow.stages.find(s => s.id === stageId);
            const stageName = stage?.name || 'Unknown Stage';

            stageData.tasks.forEach(task => {
              tasks.push({
                id: task.id,
                label: `${project.name} > ${stageName} > ${task.title}`
              });
            });
          });
        });

        return tasks;
      }

      case 'comments': {
        const projects = useProjectStore.getState().projects;
        const comments: EntityOption[] = [];

        projects.forEach(project => {
          Object.values(project.stages).forEach(stageData => {
            stageData.tasks.forEach(task => {
              task.comments.forEach(comment => {
                const snippet = comment.text.length > 50
                  ? comment.text.substring(0, 50) + '...'
                  : comment.text;
                comments.push({
                  id: comment.id,
                  label: `"${snippet}" - ${comment.author} (on: ${task.title})`
                });
              });
            });
          });
        });

        return comments;
      }

      case 'user_management':
        // No specific entities for user management
        return [];

      default:
        return [];
    }
  };

  const entityOptions = getEntityOptions();
  const hasSpecificEntities = entityType !== 'user_management' && entityOptions.length > 0;

  const handleScopeChange = (newScope: 'all' | 'specific') => {
    onChange(newScope, newScope === 'all' ? [] : selectedEntityIds);
  };

  const handleEntityToggle = (entityId: string, checked: boolean) => {
    const newSelectedIds = checked
      ? [...selectedEntityIds, entityId]
      : selectedEntityIds.filter(id => id !== entityId);
    onChange('specific', newSelectedIds);
  };

  return (
    <div className="space-y-3">
      <RadioGroup value={scope} onValueChange={handleScopeChange}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="all" id="scope-all" />
          <Label htmlFor="scope-all" className="font-normal cursor-pointer">
            All {entityTypeLabel}
          </Label>
        </div>

        {hasSpecificEntities && (
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific" id="scope-specific" />
            <Label htmlFor="scope-specific" className="font-normal cursor-pointer">
              Specific {entityTypeLabel}
            </Label>
          </div>
        )}
      </RadioGroup>

      {scope === 'specific' && hasSpecificEntities && (
        <div className="pl-6 space-y-2">
          {entityOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {entityTypeLabel.toLowerCase()} available
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {selectedEntityIds.length} selected
              </p>
              <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-3">
                {entityOptions.map(option => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`entity-${option.id}`}
                      checked={selectedEntityIds.includes(option.id)}
                      onCheckedChange={(checked) => handleEntityToggle(option.id, checked as boolean)}
                    />
                    <Label
                      htmlFor={`entity-${option.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {entityType === 'user_management' && (
        <p className="text-sm text-muted-foreground pl-6">
          User management permissions apply to all users and groups
        </p>
      )}
    </div>
  );
}
