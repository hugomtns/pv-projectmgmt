import { Header } from '@/components/layout/Header';
import { useWorkflowStore } from '@/stores/workflowStore';
import { StageCard } from '@/components/workflow/StageCard';

export function WorkflowSettings() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const removeStage = useWorkflowStore((state) => state.removeStage);

  const handleEdit = (stageId: string) => {
    // Will be implemented in P9-4
    console.log('Edit stage:', stageId);
  };

  const handleDelete = (stageId: string, stageName: string) => {
    if (confirm(`Are you sure you want to delete the "${stageName}" stage? This will affect the workflow for new projects.`)) {
      removeStage(stageId);
    }
  };

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
              <StageCard
                key={stage.id}
                stage={stage}
                index={index}
                onEdit={() => handleEdit(stage.id)}
                onDelete={() => handleDelete(stage.id, stage.name)}
              />
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
