import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useWorkflowStore } from '@/stores/workflowStore';
import { StageCard } from '@/components/workflow/StageCard';
import { StageEditor } from '@/components/workflow/StageEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { defaultWorkflow } from '@/data/seedData';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#0ea5e9'];

export function WorkflowSettings() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const removeStage = useWorkflowStore((state) => state.removeStage);
  const reorderStages = useWorkflowStore((state) => state.reorderStages);
  const addStage = useWorkflowStore((state) => state.addStage);
  const resetToDefault = useWorkflowStore((state) => state.resetToDefault);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(DEFAULT_COLORS[0]);

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

  const handleAddStage = () => {
    if (!newStageName.trim()) return;

    addStage({
      name: newStageName,
      color: newStageColor,
      taskTemplates: [],
    });

    setNewStageName('');
    setNewStageColor(DEFAULT_COLORS[0]);
    setIsAdding(false);
  };

  const handleResetToDefault = () => {
    if (
      confirm(
        'Reset workflow to default?\n\nThis will restore the default 8-stage workflow. This change only affects new projects - existing projects will keep their current stage assignments.\n\nAre you sure you want to continue?'
      )
    ) {
      resetToDefault();
      useWorkflowStore.setState({ workflow: defaultWorkflow });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header title="Workflow Settings" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header section */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Workflow Stages</h2>
              <p className="text-sm text-muted-foreground">
                Configure the stages that projects move through. Each stage can have task templates.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetToDefault}>
              Reset to Default
            </Button>
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

          {/* Add Stage */}
          {!isAdding ? (
            <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
              + Add Stage
            </Button>
          ) : (
            <div className="p-4 border border-border rounded-lg space-y-3">
              <Input
                autoFocus
                placeholder="Stage name"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
              />
              <div>
                <label className="text-sm font-medium block mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewStageColor(color)}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        newStageColor === color ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setNewStageName('');
                    setNewStageColor(DEFAULT_COLORS[0]);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddStage}>Add Stage</Button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {workflow.stages.length === 0 && !isAdding && (
            <div className="text-center py-12 border border-dashed rounded-lg space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-muted p-3">
                  <svg
                    className="h-6 w-6 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">No workflow stages configured</p>
                <p className="text-sm text-muted-foreground">
                  Add your first stage to define your project workflow, or use the default workflow
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Click "Add Stage" below or "Reset to Default" to restore the 8-stage PV workflow
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
