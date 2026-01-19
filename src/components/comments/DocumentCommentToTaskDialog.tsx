/**
 * DocumentCommentToTaskDialog - Convert a document/design comment into a task
 *
 * Allows selecting project and stage, with pre-filled fields from comment.
 */

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, ListTodo } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { toast } from 'sonner';

interface CommentData {
  id: string;
  text: string;
  author: string;
  mentions?: string[];
}

interface DocumentCommentToTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: CommentData;
  /** Pre-selected project ID (from document/design) */
  defaultProjectId?: string;
  /** Callback when task is created, returns the task ID */
  onTaskCreated?: (taskId: string, projectId: string, stageId: string) => void;
}

export function DocumentCommentToTaskDialog({
  open,
  onOpenChange,
  comment,
  defaultProjectId,
  onTaskCreated,
}: DocumentCommentToTaskDialogProps) {
  const users = useUserStore((state) => state.users);
  const projects = useProjectStore((state) => state.projects);
  const addTask = useProjectStore((state) => state.addTask);
  const workflow = useWorkflowStore((state) => state.workflow);

  // Default values from comment
  const defaultTitle = `Task from ${comment.author}`;
  const defaultDescription = comment.text;

  const [projectId, setProjectId] = useState<string>(defaultProjectId || '');
  const [stageId, setStageId] = useState<string>('');
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [assignee, setAssignee] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  // Get current stage for selected project
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setProjectId(defaultProjectId || '');
      setStageId('');
      setTitle(defaultTitle);
      setDescription(defaultDescription);
      // Suggest first mentioned user as assignee
      if (comment.mentions && comment.mentions.length > 0) {
        setAssignee(comment.mentions[0]);
      } else {
        setAssignee('');
      }
      setDueDate(undefined);
    }
  }, [open, comment, defaultProjectId, defaultTitle, defaultDescription]);

  // Auto-select current stage when project changes
  useEffect(() => {
    if (selectedProject) {
      setStageId(selectedProject.currentStageId);
    } else {
      setStageId('');
    }
  }, [selectedProject]);

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }
    if (!projectId) {
      toast.error('Please select a project');
      return;
    }
    if (!stageId) {
      toast.error('Please select a stage');
      return;
    }

    const newTaskId = addTask(projectId, stageId, {
      title: title.trim(),
      description: description.trim(),
      assignee: assignee || '',
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      status: 'not_started',
      comments: [],
      attachments: [],
    });

    if (newTaskId) {
      onTaskCreated?.(newTaskId, projectId, stageId);
      toast.success('Task created from comment');
      onOpenChange(false);
    }
  };

  // Get suggested assignees (mentioned users first)
  const suggestedUserIds = comment.mentions || [];
  const suggestedUsers = users.filter((u) => suggestedUserIds.includes(u.id));
  const otherUsers = users.filter((u) => !suggestedUserIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Create Task from Comment
          </DialogTitle>
          <DialogDescription>
            Convert this comment into a trackable task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage Selection */}
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stageId} onValueChange={setStageId} disabled={!projectId}>
              <SelectTrigger>
                <SelectValue placeholder={projectId ? "Select stage" : "Select project first"} />
              </SelectTrigger>
              <SelectContent>
                {workflow.stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                    {selectedProject?.currentStageId === stage.id && ' (Current)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              className="min-h-[100px]"
            />
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {suggestedUsers.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Mentioned in comment
                    </div>
                    {suggestedUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                    <div className="my-1 border-t" />
                  </>
                )}
                {otherUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Pick a due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!projectId || !stageId}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
