import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useUserStore } from '@/stores/userStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getDocumentPermissions } from '@/lib/permissions/documentPermissions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PriorityBadge } from '@/components/projects/PriorityBadge';
import { StageStepper } from '@/components/projects/StageStepper';
import { StageTaskSection } from '@/components/projects/StageTaskSection';
import { UserSelectField } from '@/components/users/UserSelectField';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { DocumentList } from '@/components/documents/DocumentList';
import { ArrowLeft, Upload } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('properties');

  // Get document permissions
  const documentPermissions = getDocumentPermissions(
    currentUser,
    undefined,
    permissionOverrides,
    roles
  );

  // Get project documents
  const projectDocuments = documents.filter((doc) => doc.projectId === projectId);

  // Update selected stage when project changes
  useEffect(() => {
    if (project) {
      setSelectedStageId(project.currentStageId);
    }
  }, [project?.id, project?.currentStageId]);

  if (!project) {
    return <NotFound message="Project not found" />;
  }

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
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/projects')}
            aria-label="Back to projects"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Project Details</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* Properties Tab */}
            <TabsContent value="properties" className="space-y-4">
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
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-6">
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
                  onStageSelect={() => {}}
                />
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4">
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
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={projectId}
      />
    </div>
  );
}
