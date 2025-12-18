import { Header } from '@/components/layout/Header';
import { useWorkflowStore } from '@/stores/workflowStore';

export function WorkflowSettings() {
  const workflow = useWorkflowStore((state) => state.workflow);

  return (
    <div className="flex h-full flex-col">
      <Header title="Workflow Settings" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header section */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Workflow Stages</h2>
            <p className="text-sm text-muted-foreground">
              Configure the stages that projects move through. Each stage can have task templates.
            </p>
          </div>

          {/* Workflow diagram */}
          <div className="space-y-3">
            {workflow.stages.map((stage, index) => (
              <div
                key={stage.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
              >
                {/* Stage number */}
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-sm font-semibold shrink-0">
                  {index + 1}
                </div>

                {/* Stage color indicator */}
                <div
                  className="h-10 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />

                {/* Stage info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{stage.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {stage.taskTemplates.length} task template{stage.taskTemplates.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {workflow.stages.length === 0 && (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No workflow stages configured</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add your first stage to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
