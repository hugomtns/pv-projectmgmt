import { useState } from 'react';
import { useMaintenanceStore } from '@/stores/maintenanceStore';
import { useUserStore } from '@/stores/userStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserSelectField } from '@/components/users/UserSelectField';
import type { MaintenanceCategory, RecurrenceType, MaintenanceTaskTemplate } from '@/lib/types/maintenance';
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_CATEGORY_ORDER,
  RECURRENCE_LABELS,
} from '@/lib/types/maintenance';
import { MAINTENANCE_TASK_TEMPLATES, PRESET_SCHEDULES } from '@/data/maintenanceTemplates';
import { Plus, X } from 'lucide-react';

interface CreateScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateScheduleDialog({
  open,
  onOpenChange,
  projectId,
}: CreateScheduleDialogProps) {
  const createSchedule = useMaintenanceStore((state) => state.createSchedule);
  const users = useUserStore((state) => state.users);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'inspection' as MaintenanceCategory,
    recurrence: 'quarterly' as RecurrenceType,
    startDate: new Date().toISOString().split('T')[0],
    defaultAssigneeId: '',
    taskTemplates: [] as MaintenanceTaskTemplate[],
  });

  const [showPresets, setShowPresets] = useState(true);

  // Get available tasks for the selected category
  const availableTasks = MAINTENANCE_TASK_TEMPLATES[formData.category];

  const handlePresetSelect = (presetName: string) => {
    const preset = PRESET_SCHEDULES.find((p) => p.name === presetName);
    if (!preset) return;

    const tasks = MAINTENANCE_TASK_TEMPLATES[preset.category]
      .filter((t) => (preset.tasks as readonly string[]).includes(t.title))
      .map((t) => ({
        ...t,
        id: crypto.randomUUID(),
      }));

    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      category: preset.category,
      recurrence: preset.recurrence,
      taskTemplates: tasks,
    }));
    setShowPresets(false);
  };

  const handleAddTask = (task: typeof availableTasks[0]) => {
    const newTask: MaintenanceTaskTemplate = {
      id: crypto.randomUUID(),
      title: task.title,
      description: task.description,
      category: task.category,
      required: task.required,
      estimatedMinutes: task.estimatedMinutes,
    };

    setFormData((prev) => ({
      ...prev,
      taskTemplates: [...prev.taskTemplates, newTask],
    }));
  };

  const handleRemoveTask = (taskId: string) => {
    setFormData((prev) => ({
      ...prev,
      taskTemplates: prev.taskTemplates.filter((t) => t.id !== taskId),
    }));
  };

  const handleToggleRequired = (taskId: string) => {
    setFormData((prev) => ({
      ...prev,
      taskTemplates: prev.taskTemplates.map((t) =>
        t.id === taskId ? { ...t, required: !t.required } : t
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return;

    const assignee = users.find((u) => u.id === formData.defaultAssigneeId);

    createSchedule({
      projectId,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category,
      recurrence: formData.recurrence,
      startDate: formData.startDate,
      isActive: true,
      taskTemplates: formData.taskTemplates,
      defaultAssigneeId: formData.defaultAssigneeId || undefined,
      defaultAssigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : undefined,
    });

    // Reset form
    setFormData({
      name: '',
      description: '',
      category: 'inspection',
      recurrence: 'quarterly',
      startDate: new Date().toISOString().split('T')[0],
      defaultAssigneeId: '',
      taskTemplates: [],
    });
    setShowPresets(true);

    onOpenChange(false);
  };

  // Tasks already added (by title)
  const addedTaskTitles = new Set(formData.taskTemplates.map((t) => t.title));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Maintenance Schedule</DialogTitle>
        </DialogHeader>

        {/* Preset Selection */}
        {showPresets && (
          <div className="space-y-3">
            <Label>Quick Start - Select a Preset</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_SCHEDULES.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  className="h-auto py-3 px-4 justify-start text-left"
                  onClick={() => handlePresetSelect(preset.name)}
                >
                  <div>
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {RECURRENCE_LABELS[preset.recurrence]} - {preset.tasks.length} tasks
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowPresets(false)}
            >
              Or create custom schedule
            </Button>
          </div>
        )}

        {/* Custom Form */}
        {!showPresets && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Schedule Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Quarterly Inspection"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            {/* Category & Recurrence */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, category: v as MaintenanceCategory, taskTemplates: [] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_CATEGORY_ORDER.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {MAINTENANCE_CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recurrence</Label>
                <Select
                  value={formData.recurrence}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, recurrence: v as RecurrenceType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map((rec) => (
                      <SelectItem key={rec} value={rec}>
                        {RECURRENCE_LABELS[rec]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start Date & Assignee */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Assignee</Label>
                <UserSelectField
                  value={formData.defaultAssigneeId}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, defaultAssigneeId: v }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Task Templates */}
            <div className="space-y-2">
              <Label>Tasks</Label>

              {/* Added tasks */}
              {formData.taskTemplates.length > 0 && (
                <div className="space-y-2 mb-3">
                  {formData.taskTemplates.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-2 p-2 bg-muted rounded"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox
                          checked={task.required}
                          onCheckedChange={() => handleToggleRequired(task.id)}
                        />
                        <span className="text-sm truncate">{task.title}</span>
                        {task.required && (
                          <span className="text-xs text-orange-600">Required</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleRemoveTask(task.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available tasks to add */}
              <div className="border rounded p-3 max-h-48 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2">
                  Click to add tasks from {MAINTENANCE_CATEGORY_LABELS[formData.category]}
                </p>
                <div className="space-y-1">
                  {availableTasks.map((task) => {
                    const isAdded = addedTaskTitles.has(task.title);
                    return (
                      <Button
                        key={task.title}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-auto py-1.5 text-left"
                        disabled={isAdded}
                        onClick={() => handleAddTask(task)}
                      >
                        <Plus className="h-3 w-3 mr-2 shrink-0" />
                        <span className="truncate">{task.title}</span>
                        {isAdded && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPresets(true)}>
                Back to Presets
              </Button>
              <Button type="submit" disabled={!formData.name.trim()}>
                Create Schedule
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
