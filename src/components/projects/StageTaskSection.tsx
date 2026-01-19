import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import type { Project, TaskStatus } from '@/lib/types';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TaskProgressBar } from '@/components/tasks/TaskProgressBar';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { cn } from '@/lib/utils';

interface StageTaskSectionProps {
  project: Project;
  stageId: string;
  stageName: string;
}

export function StageTaskSection({ project, stageId, stageName }: StageTaskSectionProps) {
  const addTask = useProjectStore((state) => state.addTask);
  const updateTask = useProjectStore((state) => state.updateTask);
  const workflow = useWorkflowStore((state) => state.workflow);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const stageData = project.stages[stageId];
  const workflowStage = workflow.stages.find((s) => s.id === stageId);

  // Determine if this stage has been entered yet
  const hasEnteredStage = !!stageData;

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    addTask(project.id, stageId, {
      title: newTaskTitle,
      description: '',
      assignee: '',
      dueDate: null,
      status: 'not_started',
      comments: [],
      attachments: [],
    });

    setNewTaskTitle('');
    setIsAdding(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTaskTitle('');
    }
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTask(project.id, stageId, taskId, { status: newStatus });
  };

  // If stage hasn't been entered yet, show task templates
  if (!hasEnteredStage && workflowStage && workflowStage.taskTemplates.length > 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Preview: These tasks will be created when the project enters this stage
          </p>
        </div>
        <div className="space-y-2">
          {workflowStage.taskTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30"
            >
              <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-gray-300 text-gray-600">
                ○
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{template.title}</div>
                {template.description && (
                  <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                )}
              </div>
              <div className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                Not Started
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no tasks and no templates, show empty state
  if ((!stageData || !stageData.tasks || stageData.tasks.length === 0) && (!workflowStage || workflowStage.taskTemplates.length === 0)) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No tasks for {stageName}
          </p>
          {hasEnteredStage && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              Add Task
            </Button>
          )}
        </div>

        {isAdding && hasEnteredStage && (
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <Button onClick={handleAddTask}>Add</Button>
            <Button variant="outline" onClick={() => { setIsAdding(false); setNewTaskTitle(''); }}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  }

  const tasks = stageData.tasks;
  const completedCount = tasks.filter((t) => t.status === 'complete').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const notStartedCount = tasks.filter((t) => t.status === 'not_started').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600 bg-green-50';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50';
      case 'not_started':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'in_progress':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Task Progress</span>
          <span className="text-sm font-semibold">
            {completedCount}/{tasks.length} Complete
          </span>
        </div>
        <TaskProgressBar
          completedCount={completedCount}
          inProgressCount={inProgressCount}
          totalCount={tasks.length}
        />
        <div className="flex gap-4 mt-3 text-xs">
          <span className="text-green-600">✓ {completedCount} Complete</span>
          <span className="text-blue-600">• {inProgressCount} In Progress</span>
          <span className="text-gray-600">○ {notStartedCount} Not Started</span>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => setSelectedTaskId(task.id)}
          >
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                task.status === 'complete'
                  ? 'bg-green-500 text-white'
                  : task.status === 'in_progress'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}
            >
              {task.status === 'complete' ? '✓' : task.status === 'in_progress' ? '•' : '○'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                  {task.title}
                </span>
                {task.dueDate && task.status !== 'complete' && (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-xs shrink-0',
                      isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
                        ? 'text-red-600'
                        : isToday(new Date(task.dueDate))
                          ? 'text-amber-600'
                          : 'text-muted-foreground'
                    )}
                  >
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(task.dueDate), 'MMM d')}
                  </span>
                )}
              </div>
              {task.description && (
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {task.description}
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`text-xs px-3 py-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(task.status)}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {getStatusLabel(task.status)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'not_started')}>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                      ○
                    </div>
                    <span>Not Started</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                      •
                    </div>
                    <span>In Progress</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'complete')}>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center text-xs text-white">
                      ✓
                    </div>
                    <span>Complete</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {/* Add task */}
      {!isAdding ? (
        <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="w-full">
          + Add Task
        </Button>
      ) : (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <Button onClick={handleAddTask}>Add</Button>
          <Button variant="outline" onClick={() => { setIsAdding(false); setNewTaskTitle(''); }}>
            Cancel
          </Button>
        </div>
      )}

      {/* Task Detail Sheet */}
      <TaskDetail
        projectId={project.id}
        stageId={stageId}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
