import { useWorkflowStore } from '@/stores/workflowStore';
import type { Project } from '@/lib/types';

interface StageStepperProps {
  project: Project;
  selectedStageId: string;
  onStageSelect: (stageId: string) => void;
}

export function StageStepper({ project, selectedStageId, onStageSelect }: StageStepperProps) {
  const workflow = useWorkflowStore((state) => state.workflow);

  const currentStageIndex = workflow.stages.findIndex((s) => s.id === project.currentStageId);

  return (
    <div className="space-y-2">
      {workflow.stages.map((stage, index) => {
        const isCompleted = index < currentStageIndex;
        const isCurrent = stage.id === project.currentStageId;
        const isSelected = stage.id === selectedStageId;
        const hasVisited = !!project.stages[stage.id];

        return (
          <button
            key={stage.id}
            onClick={() => onStageSelect(stage.id)}
            className={`w-full text-left rounded-lg p-3 transition-colors ${
              isSelected
                ? 'bg-primary text-primary-foreground'
                : isCurrent
                  ? 'bg-muted border-2 border-primary'
                  : isCompleted
                    ? 'bg-muted/50'
                    : 'bg-muted/20 hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Status indicator */}
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>

              {/* Stage info */}
              <div className="flex-1">
                <div className="font-medium text-sm">{stage.name}</div>
                {hasVisited && project.stages[stage.id] && (
                  <div className="text-xs opacity-70 mt-0.5">
                    {project.stages[stage.id].tasks.filter((t) => t.status === 'complete').length}/
                    {project.stages[stage.id].tasks.length} tasks
                  </div>
                )}
              </div>

              {/* Current indicator */}
              {isCurrent && (
                <div className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/20">
                  Current
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
