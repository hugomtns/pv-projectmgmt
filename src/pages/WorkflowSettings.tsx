import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useWorkflowStore } from '@/stores/workflowStore';
import { StageCard } from '@/components/workflow/StageCard';
import { StageEditor } from '@/components/workflow/StageEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#0ea5e9'];

export function WorkflowSettings() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const removeStage = useWorkflowStore((state) => state.removeStage);
  const reorderStages = useWorkflowStore((state) => state.reorderStages);
  const addStage = useWorkflowStore((state) => state.addStage);
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
