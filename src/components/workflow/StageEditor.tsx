import { useState } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface StageEditorProps {
  stageId: string | null;
  onClose: () => void;
}

const STAGE_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#0ea5e9', // blue
];

export function StageEditor({ stageId, onClose }: StageEditorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateStage = useWorkflowStore((state) => state.updateStage);
  const addTaskTemplate = useWorkflowStore((state) => state.addTaskTemplate);
  const removeTaskTemplate = useWorkflowStore((state) => state.removeTaskTemplate);

  const stage = workflow.stages.find((s) => s.id === stageId);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  if (!stage || !stageId) return null;

  const handleNameChange = (name: string) => {
    updateStage(stageId, { name });
  };

  const handleColorChange = (color: string) => {
    updateStage(stageId, { color });
  };

  const handleAddTemplate = () => {
    if (!newTemplateTitle.trim()) return;

    addTaskTemplate(stageId, {
      title: newTemplateTitle,
      description: newTemplateDescription,
    });

    setNewTemplateTitle('');
    setNewTemplateDescription('');
    setIsAddingTemplate(false);
  };

  const handleDeleteTemplate = (templateId: string, templateTitle: string) => {
    if (confirm(`Delete task template "${templateTitle}"?`)) {
      removeTaskTemplate(stageId, templateId);
    }
  };

  return (
    <Sheet open={!!stageId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Stage</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stage Name */}
          <div>
            <label className="text-sm font-medium">Stage Name</label>
            <Input
              value={stage.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Stage Color */}
          <div>
            <label className="text-sm font-medium block mb-2">Stage Color</label>
            <div className="flex flex-wrap gap-2">
              {STAGE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`h-10 w-10 rounded-full transition-transform ${
                    stage.color === color ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Task Templates */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Task Templates</label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddingTemplate(true)}
              >
                + Add Template
              </Button>
            </div>

            {/* Template list */}
            <div className="space-y-2">
              {stage.taskTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{template.title}</div>
                    {template.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTemplate(template.id, template.title)}
                  >
                    Delete
                  </Button>
                </div>
              ))}

              {stage.taskTemplates.length === 0 && !isAddingTemplate && (
                <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
                  No task templates
                </div>
              )}
            </div>

            {/* Add template form */}
            {isAddingTemplate && (
              <div className="mt-3 space-y-2 p-3 border border-border rounded-lg">
                <Input
                  autoFocus
                  placeholder="Template title"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingTemplate(false);
                      setNewTemplateTitle('');
                      setNewTemplateDescription('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddTemplate}>
                    Add Template
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
