import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useUserStore } from '@/stores/userStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PriorityBadge } from '@/components/projects/PriorityBadge';
import { StageStepper } from '@/components/projects/StageStepper';
import { StageTaskSection } from '@/components/projects/StageTaskSection';
import { UserSelectField } from '@/components/users/UserSelectField';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { DocumentList } from '@/components/documents/DocumentList';
import { DesignList } from '@/components/designs/DesignList';
import { SiteList } from '@/components/sites/SiteList';
import { MilestoneSection } from '@/components/projects/milestones/MilestoneSection';
import { NtpChecklistSection } from '@/components/ntp-checklist';
import { Upload } from 'lucide-react';
import NotFound from './NotFound';
import type { Priority } from '@/lib/types';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const projects = useProjectStore((state) => state.projects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const moveProjectToStage = useProjectStore((state) => state.moveProjectToStage);
  const workflow = useWorkflowStore((state) => state.workflow);
  const currentUser = useUserStore((state) => state.currentUser);
  const roles = useUserStore((state) => state.roles);
  const permissionOverrides = useUserStore((state) => state.permissionOverrides);
  const documents = useDocumentStore((state) => state.documents);

  const project = projects.find((p) => p.id === projectId);

  const [selectedStageId, setSelectedStageId] = useState(project?.currentStageId || '');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [moveBackStageId, setMoveBackStageId] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const activeSection = searchParams.get('tab') || 'properties';

  // Form state for Properties tab
  const [formValues, setFormValues] = useState({
    name: project?.name || '',
    location: project?.location || '',
    priority: (project?.priority || 3) as Priority,
    owner: project?.owner || '',
  });

  // Track if form has unsaved changes
  const isDirty = project ? (
    formValues.name !== project.name ||
    formValues.location !== project.location ||
    formValues.priority !== project.priority ||
    formValues.owner !== project.owner
  ) : false;

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
        projectId,
        permissionOverrides,
        roles
      )
    : { create: false, read: false, update: false, delete: false };

  // Get project documents
  const projectDocuments = documents.filter((doc) => doc.projectId === projectId);

  // Update selected stage when project changes
  useEffect(() => {
    if (project) {
      setSelectedStageId(project.currentStageId);
    }
  }, [project?.id, project?.currentStageId]);

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      setFormValues({
        name: project.name,
        location: project.location,
        priority: project.priority as Priority,
        owner: project.owner,
      });
    }
  }, [project?.id]);

  // Keyboard shortcuts for save/cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if Properties section is active and form is dirty
      if (activeSection !== 'properties' || !isDirty) return;

      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSaveChanges();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelChanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, isDirty, formValues]);

  if (!project) {
    return <NotFound message="Project not found" />;
  }

  const currentStage = workflow.stages.find((s) => s.id === project.currentStageId);

  // Form change handler for Properties tab
  const handleFormChange = (field: string, value: string | Priority) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  // Save changes handler
  const handleSaveChanges = () => {
    updateProject(project.id, {
      name: formValues.name,
      location: formValues.location,
      priority: formValues.priority,
      owner: formValues.owner,
    });

    toast.success('Project updated successfully', {
      description: `Changes to ${formValues.name} have been saved.`,
    });
  };

  // Cancel changes handler
  const handleCancelChanges = () => {
    setFormValues({
      name: project.name,
      location: project.location,
      priority: project.priority as Priority,
      owner: project.owner,
    });
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

  // Section title mapping
  const sectionTitles: Record<string, string> = {
    properties: 'Properties',
    status: 'Status',
    tasks: 'Tasks',
    milestones: 'Milestones',
    'ntp-checklist': 'NTP Checklist',
    sites: 'Sites',
    designs: 'Designs',
    documents: 'Documents',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section Header */}
      <div className="flex h-14 items-center border-b px-6">
        <h1 className="text-lg font-semibold">{sectionTitles[activeSection] || 'Project'}</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Properties Section */}
          {activeSection === 'properties' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  value={formValues.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={formValues.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-medium block mb-2">Priority</label>
                <PriorityBadge
                  priority={formValues.priority}
                  onChange={(p) => handleFormChange('priority', p)}
                />
              </div>

              {/* Owner */}
              <div>
                <label className="text-sm font-medium block mb-1">Owner</label>
                <UserSelectField
                  value={formValues.owner}
                  onValueChange={(v) => handleFormChange('owner', v)}
                  placeholder="Select owner"
                />
              </div>

              {/* Save/Cancel Buttons (only show when dirty) */}
              {isDirty && (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelChanges}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveChanges}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Status Section */}
          {activeSection === 'status' && (
            <div className="space-y-6">
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
                  selectedStageId={project.currentStageId}
                  onStageSelect={() => { }}
                />
              </div>
            </div>
          )}

          {/* Tasks Section */}
          {activeSection === 'tasks' && (
            <div className="space-y-4">
              {/* Stage Selector */}
              <div>
                <label className="text-sm font-medium block mb-2">Select Stage</label>
                <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflow.stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Stage Tasks */}
              <div>
                <StageTaskSection
                  project={project}
                  stageId={selectedStageId}
                  stageName={workflow.stages.find((s) => s.id === selectedStageId)?.name || 'Stage'}
                />
              </div>
            </div>
          )}

          {/* Milestones Section */}
          {activeSection === 'milestones' && (
            <MilestoneSection
              projectId={projectId || ''}
              milestones={project.milestones || []}
              canUpdate={projectPermissions.update}
            />
          )}

          {/* NTP Checklist Section */}
          {activeSection === 'ntp-checklist' && (
            <NtpChecklistSection projectId={projectId || ''} />
          )}

          {/* Sites Section */}
          {activeSection === 'sites' && (
            <SiteList projectId={projectId || ''} />
          )}

          {/* Designs Section */}
          {activeSection === 'designs' && (
            <DesignList projectId={projectId || ''} />
          )}

          {/* Documents Section */}
          {activeSection === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
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
              <DocumentList
                documents={projectDocuments}
                onDocumentClick={(documentId) => navigate(`/documents/${documentId}`)}
                variant="compact"
                showSearch
              />
            </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={projectId}
      />

      <ConfirmDialog
        open={!!moveBackStageId}
        onOpenChange={(open) => !open && setMoveBackStageId(null)}
        onConfirm={confirmMoveBack}
        title="Move Project Back"
        description="Are you sure you want to move this project back to a previous stage?"
        confirmText="Move Back"
      />
    </div>
  );
}
