import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useWorkflowStore } from '@/stores/workflowStore';
import { StageCard } from '@/components/workflow/StageCard';
import { StageEditor } from '@/components/workflow/StageEditor';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function WorkflowSettings() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const removeStage = useWorkflowStore((state) => state.removeStage);
  const reorderStages = useWorkflowStore((state) => state.reorderStages);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleEdit = (stageId: string) => {
    setEditingStageId(stageId);
  };

  const handleDelete = (stageId: string, stageName: string) => {
    if (confirm(`Are you sure you want to delete the "${stageName}" stage? This will affect the workflow for new projects.`)) {
      removeStage(stageId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = workflow.stages.findIndex((s) => s.id === active.id);
      const newIndex = workflow.stages.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderStages(oldIndex, newIndex);
      }
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={workflow.stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
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
            </SortableContext>
          </DndContext>

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

      {/* Stage Editor */}
      <StageEditor
        stageId={editingStageId}
        onClose={() => setEditingStageId(null)}
      />
    </div>
  );
}
