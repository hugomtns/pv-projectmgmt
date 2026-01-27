import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useUserStore } from '@/stores/userStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { getProjectGroupOverrides } from '@/lib/permissions/projectPermissions';
import { setProjectGroupPermissions, removeProjectGroupPermissions } from '@/lib/permissions/projectPermissions';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PriorityBadge } from './PriorityBadge';
import { StageStepper } from './StageStepper';
import { StageTaskSection } from './StageTaskSection';
import { UserSelectField } from '@/components/users/UserSelectField';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { DocumentList } from '@/components/documents/DocumentList';
import { DesignList } from '@/components/designs/DesignList';
import { MilestoneSection } from './milestones/MilestoneSection';
import { Upload } from 'lucide-react';
import { ProjectPermissionsSection, loadProjectPermissionEntries, type GroupPermissionEntry } from './ProjectPermissionsSection';
import type { Priority } from '@/lib/types';

export function ProjectDetail() {
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const projects = useProjectStore((state) => state.projects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const moveProjectToStage = useProjectStore((state) => state.moveProjectToStage);
  const selectProject = useProjectStore((state) => state.selectProject);
  const workflow = useWorkflowStore((state) => state.workflow);
  const currentUser = useUserStore((state) => state.currentUser);
  const roles = useUserStore((state) => state.roles);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const documents = useDocumentStore((state) => state.documents);

  const project = projects.find((p) => p.id === selectedProjectId);
  const [selectedStageId, setSelectedStageId] = useState(project?.currentStageId || '');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [moveBackStageId, setMoveBackStageId] = useState<string | null>(null);

  // Get document permissions
  const documentPermissions = getDocumentPermissions(
    currentUser,
    undefined,
    permissionOverrides,
    roles
  );

  // Get project permissions
  const projectPermissions = currentUser
    ? resolvePermissions(
        currentUser,
        'projects',
        selectedProjectId || undefined,
        permissionOverrides,
        roles
      )
    : { create: false, read: false, update: false, delete: false };

  // Get project documents
  const projectDocuments = documents.filter((doc) => doc.projectId === selectedProjectId);

  // Project permissions management state
  const canManagePermissions =
    currentUser?.roleId === 'role-admin' ||
    (project && currentUser?.id === project.owner);

  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [permissionEntries, setPermissionEntries] = useState<GroupPermissionEntry[]>([]);

  // Load existing project permission overrides when project changes
  useEffect(() => {
    if (project) {
      const loaded = loadProjectPermissionEntries(project.id);
      setUseCustomPermissions(loaded.useCustom);
      setPermissionEntries(loaded.entries);
    }
  }, [project?.id, permissionOverrides]);

  // Save permission changes immediately
  const handlePermissionEntriesChange = (entries: GroupPermissionEntry[]) => {
    setPermissionEntries(entries);
    if (!project) return;

    // Get current overrides for this project to detect removals
    const currentOverrides = getProjectGroupOverrides(project.id, permissionOverrides);
    const newGroupIds = new Set(entries.map((e) => e.groupId));

    // Remove overrides for groups no longer in the list
    for (const override of currentOverrides) {
      if (!newGroupIds.has(override.groupId)) {
        removeProjectGroupPermissions(project.id, override.groupId);
      }
    }

    // Add/update overrides for current entries
    for (const entry of entries) {
      setProjectGroupPermissions(project.id, entry.groupId, entry.permissions);
    }
  };

  const handleToggleCustom = (custom: boolean) => {
    setUseCustomPermissions(custom);
    if (!custom && project) {
      // Switching back to defaults — remove all project-specific overrides
      const currentOverrides = getProjectGroupOverrides(project.id, permissionOverrides);
      for (const override of currentOverrides) {
        removeProjectGroupPermissions(project.id, override.groupId);
      }
      setPermissionEntries([]);
    }
  };

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
      toast.error('Cannot advance', {
        description: 'Please complete all tasks in the current stage first.',
      });
    }
  };

  const handleMoveBack = (stageId: string) => {
    setMoveBackStageId(stageId);
  };

  const confirmMoveBack = () => {
    if (moveBackStageId) {
      updateProject(project.id, { currentStageId: moveBackStageId });
      setMoveBackStageId(null);
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
            <label className="text-sm font-medium block mb-1">Owner</label>
            <UserSelectField
              value={project.owner}
              onValueChange={handleOwnerChange}
              placeholder="Select owner"
            />
          </div>

          {/* Project Permissions */}
          {canManagePermissions && (
            <ProjectPermissionsSection
              projectId={project.id}
              entries={permissionEntries}
              useCustomPermissions={useCustomPermissions}
              onToggleCustom={handleToggleCustom}
              onEntriesChange={handlePermissionEntriesChange}
            />
          )}

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

          {/* Designs Section */}
          <div>
            <DesignList projectId={project.id} />
          </div>

          {/* Milestones Section */}
          <div>
            <MilestoneSection
              projectId={project.id}
              milestones={project.milestones || []}
              canUpdate={projectPermissions.update}
            />
          </div>

          {/* Documents Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Documents</label>
              {documentPermissions.create && (
                <Button
                  size="sm"
                  onClick={() => setUploadDialogOpen(true)}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              )}
            </div>
            <DocumentList documents={projectDocuments} showSearch />
          </div>
        </div>
      </SheetContent>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={selectedProjectId || undefined}
      />

      <ConfirmDialog
        open={!!moveBackStageId}
        onOpenChange={(open) => !open && setMoveBackStageId(null)}
        onConfirm={confirmMoveBack}
        title="Move Project Back"
        description="Are you sure you want to move this project back to a previous stage?"
        confirmText="Move Back"
      />
    </Sheet>
  );
}
