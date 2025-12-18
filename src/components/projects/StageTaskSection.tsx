import { useState } from 'react';
import type { Project } from '@/lib/types';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StageTaskSectionProps {
  project: Project;
  stageId: string;
  stageName: string;
}

export function StageTaskSection({ project, stageId, stageName }: StageTaskSectionProps) {
  const addTask = useProjectStore((state) => state.addTask);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const stageData = project.stages[stageId];

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    addTask(project.id, stageId, {
      title: newTaskTitle,
      description: '',
      assignee: '',
      dueDate: null,
      status: 'not_started',
      comments: [],
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

  if (!stageData || !stageData.tasks || stageData.tasks.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No tasks for {stageName}
          </p>
          <Button size="sm" onClick={() => setIsAdding(true)}>
            Add Task
          </Button>
        </div>

        {isAdding && (
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
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>
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
            className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
          >
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                task.status === 'complete'
                  ? 'bg-green-500 text-white'
                  : task.status === 'in_progress'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
              }`}
            >
              {task.status === 'complete' ? '✓' : task.status === 'in_progress' ? '•' : '○'}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                {task.title}
              </div>
            </div>
            <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
              {getStatusLabel(task.status)}
            </div>
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
    </div>
  );
}
