import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PriorityBadge } from './PriorityBadge';
import { StageStepper } from './StageStepper';
import { StageTaskSection } from './StageTaskSection';
import type { Priority } from '@/lib/types';

export function ProjectDetail() {
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const projects = useProjectStore((state) => state.projects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const moveProjectToStage = useProjectStore((state) => state.moveProjectToStage);
  const selectProject = useProjectStore((state) => state.selectProject);
  const workflow = useWorkflowStore((state) => state.workflow);

  const project = projects.find((p) => p.id === selectedProjectId);
  const [selectedStageId, setSelectedStageId] = useState(project?.currentStageId || '');

  // Update selected stage when project changes
  useEffect(() => {
    if (project) {
      setSelectedStageId(project.currentStageId);
    }
  }, [project?.id, project?.currentStageId]);

  if (!project) return null;

  const currentStage = workflow.stages.find((s) => s.id === project.currentStageId);

  const handleNameChange = (name: string) => {
    updateProject(project.id, { name });
  };

  const handleLocationChange = (location: string) => {
    updateProject(project.id, { location });
  };

  const handleOwnerChange = (owner: string) => {
    updateProject(project.id, { owner });
  };

  const handlePriorityChange = (priority: Priority) => {
    updateProject(project.id, { priority });
  };

  const currentStageIndex = workflow.stages.findIndex((s) => s.id === project.currentStageId);
  const nextStage = workflow.stages[currentStageIndex + 1];
  const previousStages = workflow.stages.slice(0, currentStageIndex);

  // Check if all current stage tasks are complete
  const currentStageTasks = project.stages[project.currentStageId]?.tasks || [];
  const allTasksComplete = currentStageTasks.length > 0 && currentStageTasks.every((t) => t.status === 'complete');

  const handleAdvanceStage = () => {
    if (!nextStage) return;
    const success = moveProjectToStage(project.id, nextStage.id);
    if (!success) {
      alert('Cannot advance: Please complete all tasks in the current stage first.');
    }
  };

  const handleMoveBack = (stageId: string) => {
    if (confirm('Are you sure you want to move this project back to a previous stage?')) {
      updateProject(project.id, { currentStageId: stageId });
    }
  };

  return (
    <Sheet open={!!selectedProjectId} onOpenChange={(open) => !open && selectProject(null)}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Project Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Name */}
          <div>
            <label className="text-sm font-medium">Project Name</label>
            <Input
              value={project.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-sm font-medium">Location</label>
            <Input
              value={project.location}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium block mb-2">Priority</label>
            <PriorityBadge priority={project.priority} onChange={handlePriorityChange} />
          </div>

          {/* Owner */}
          <div>
            <label className="text-sm font-medium">Owner</label>
            <Input
              value={project.owner}
              onChange={(e) => handleOwnerChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Current Stage */}
          <div>
            <label className="text-sm font-medium">Current Stage</label>
            <div className="mt-1 text-sm text-muted-foreground">{currentStage?.name || 'Unknown'}</div>
          </div>

          {/* Stage Controls */}
          <div className="flex gap-2">
            {nextStage && (
              <Button
                onClick={handleAdvanceStage}
                disabled={!allTasksComplete}
                className="flex-1"
              >
                Advance to {nextStage.name}
              </Button>
            )}
            {previousStages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Move Back</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {previousStages.map((stage) => (
                    <DropdownMenuItem key={stage.id} onClick={() => handleMoveBack(stage.id)}>
                      {stage.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Stage Progress */}
          <div>
            <label className="text-sm font-medium block mb-3">Stage Progress</label>
            <StageStepper
              project={project}
              selectedStageId={selectedStageId}
              onStageSelect={setSelectedStageId}
            />
          </div>

          {/* Selected Stage Tasks */}
          <div>
            <label className="text-sm font-medium block mb-3">
              {workflow.stages.find((s) => s.id === selectedStageId)?.name || 'Stage'} Tasks
            </label>
            <StageTaskSection
              project={project}
              stageId={selectedStageId}
              stageName={workflow.stages.find((s) => s.id === selectedStageId)?.name || 'Stage'}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
