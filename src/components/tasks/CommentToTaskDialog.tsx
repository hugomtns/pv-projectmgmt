/**
 * CommentToTaskDialog - Convert a comment into a task
 *
 * Pre-fills task fields from comment content and mentioned users.
 */

import { useState, useEffect } from 'react';
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
import type { Comment } from '@/lib/types';
import { toast } from 'sonner';

interface CommentToTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: Comment;
  projectId: string;
  stageId: string;
  taskId?: string;  // Source task ID (if comment is on a task)
}

export function CommentToTaskDialog({
  open,
  onOpenChange,
  comment,
  projectId,
  stageId,
  taskId: sourceTaskId,
}: CommentToTaskDialogProps) {
  const users = useUserStore((state) => state.users);
  const addTask = useProjectStore((state) => state.addTask);
  const updateComment = useProjectStore((state) => state.updateComment);

  // Extract first line as title, rest as description
  const lines = comment.text.split('\n');
  const defaultTitle = lines[0].slice(0, 100); // First line, max 100 chars
  const defaultDescription = comment.text;

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [assignee, setAssignee] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
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
  }, [open, comment, defaultTitle, defaultDescription]);

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Task title is required');
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

    // Link the comment to the created task
    if (newTaskId && sourceTaskId) {
      updateComment(projectId, stageId, sourceTaskId, comment.id, {
        linkedTaskId: newTaskId,
      });
    }

    toast.success('Task created from comment');
    onOpenChange(false);
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
          <Button onClick={handleCreate}>Create Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
