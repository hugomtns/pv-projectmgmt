import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { UserSelectField } from '@/components/users/UserSelectField';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants';
import { z } from 'zod';
import type { Priority } from '@/lib/types';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  location: z.string().min(1, 'Location is required'),
  priority: z.number().min(0).max(4),
  owner: z.string().min(1, 'Owner is required'),
});

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const addProject = useProjectStore((state) => state.addProject);
  const workflow = useWorkflowStore((state) => state.workflow);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<Priority>(3);
  const [owner, setOwner] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = projectSchema.safeParse({ name, location, priority, owner });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Get first stage
    const firstStage = workflow.stages[0];
    if (!firstStage) return;

    // Create initial tasks from first stage template
    const initialTasks = firstStage.taskTemplates.map((template) => ({
      id: crypto.randomUUID(),
      title: template.title,
      description: template.description,
      assignee: '',
      dueDate: null,
      status: 'not_started' as const,
      comments: [],
      attachments: [],
    }));

    // Create project with initial stage data
    addProject({
      name: result.data.name,
      location: result.data.location,
      priority: result.data.priority as Priority,
      owner: result.data.owner,
      currentStageId: firstStage.id,
      attachments: [],
      milestones: [],
      stages: {
        [firstStage.id]: {
          enteredAt: new Date().toISOString(),
          tasks: initialTasks,
        },
      },
    });

    // Reset form and close
    setName('');
    setLocation('');
    setPriority(3);
    setOwner('');
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Project Name *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              className="mt-1"
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="location" className="text-sm font-medium">
              Location *
            </label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
              className="mt-1"
            />
            {errors.location && <p className="text-sm text-red-500 mt-1">{errors.location}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Priority *</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {([1, 2, 3, 4, 0] as Priority[]).map((p) => (
                <Badge
                  key={p}
                  variant={priority === p ? 'default' : 'outline'}
                  className="cursor-pointer"
                  style={
                    priority === p
                      ? {
                          backgroundColor: PRIORITY_COLORS[p],
                          borderColor: PRIORITY_COLORS[p],
                        }
                      : undefined
                  }
                  onClick={() => setPriority(p)}
                >
                  {PRIORITY_LABELS[p]}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="owner" className="text-sm font-medium">
              Owner *
            </Label>
            <div className="mt-1">
              <UserSelectField
                value={owner}
                onValueChange={setOwner}
                placeholder="Select project owner"
              />
            </div>
            {errors.owner && <p className="text-sm text-red-500 mt-1">{errors.owner}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
