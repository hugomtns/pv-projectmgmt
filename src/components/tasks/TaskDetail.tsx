import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useUserStore } from '@/stores/userStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserSelectField } from '@/components/users/UserSelectField';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommentThread } from './CommentThread';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { DocumentList } from '@/components/documents/DocumentList';
import { Upload } from 'lucide-react';
import type { TaskStatus } from '@/lib/types';

interface TaskDetailProps {
  projectId: string;
  stageId: string;
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetail({ projectId, stageId, taskId, onClose }: TaskDetailProps) {
  const projects = useProjectStore((state) => state.projects);
  const updateTask = useProjectStore((state) => state.updateTask);
  const deleteTask = useProjectStore((state) => state.deleteTask);
  const addComment = useProjectStore((state) => state.addComment);
  const currentUser = useUserStore((state) => state.currentUser);
  const roles = useUserStore((state) => state.roles);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const documents = useDocumentStore((state) => state.documents);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const task = project?.stages[stageId]?.tasks.find((t) => t.id === taskId);

  // Get document permissions
  const documentPermissions = getDocumentPermissions(
    currentUser,
    undefined,
    permissionOverrides,
    roles
  );

  // Get task documents
  const taskDocuments = documents.filter((doc) => doc.taskId === taskId);

  if (!task || !taskId) return null;

  const handleTitleChange = (title: string) => {
    updateTask(projectId, stageId, taskId, { title });
  };

  const handleDescriptionChange = (description: string) => {
    updateTask(projectId, stageId, taskId, { description });
  };

  const handleAssigneeChange = (assignee: string) => {
    updateTask(projectId, stageId, taskId, { assignee });
  };

  const handleDueDateChange = (dueDate: string) => {
    updateTask(projectId, stageId, taskId, { dueDate: dueDate || null });
  };

  const handleStatusChange = (status: TaskStatus) => {
    updateTask(projectId, stageId, taskId, { status });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(projectId, stageId, taskId);
      onClose();
    }
  };

  const handleAddComment = (author: string, text: string) => {
    addComment(projectId, stageId, taskId, { author, text });
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'in_progress':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'not_started':
        return 'bg-gray-400';
    }
  };

  return (
    <Sheet open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Task Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Title */}
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={task.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={task.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="mt-1 w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
              placeholder="Add a description..."
            />
          </div>

          {/* Assignee */}
          <div>
            <Label className="text-sm font-medium">Assignee</Label>
            <div className="mt-1">
              <UserSelectField
                value={task.assignee}
                onValueChange={handleAssigneeChange}
                placeholder="Assign to..."
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm font-medium">Due Date</label>
            <Input
              type="date"
              value={task.dueDate || ''}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium block mb-2">Status</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(task.status)}`} />
                    {getStatusLabel(task.status)}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-full">
                <DropdownMenuItem onClick={() => handleStatusChange('not_started')}>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-400" />
                    Not Started
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    In Progress
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('complete')}>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    Complete
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Attachments */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Attachments</label>
              {documentPermissions.create && (
                <Button
                  size="sm"
                  onClick={() => setUploadDialogOpen(true)}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Attach
                </Button>
              )}
            </div>
            <DocumentList documents={taskDocuments} />
          </div>

          {/* Comments */}
          <div className="pt-4 border-t">
            <CommentThread
              comments={task.comments}
              onAddComment={handleAddComment}
            />
          </div>

          {/* Delete */}
          <div className="pt-4 border-t">
            <Button variant="destructive" onClick={handleDelete} className="w-full">
              Delete Task
            </Button>
          </div>
        </div>
      </SheetContent>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        taskId={taskId || undefined}
      />
    </Sheet>
  );
}
