import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useFinancialStore } from '@/stores/financialStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUserStore } from '@/stores/userStore';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DollarSign, Calculator, MoreHorizontal, Pencil, Trash2, Eye, ExternalLink, Plus } from 'lucide-react';

export function Financials() {
  const navigate = useNavigate();
  const financialModels = useFinancialStore((state) => state.financialModels);
  const addFinancialModel = useFinancialStore((state) => state.addFinancialModel);
  const deleteFinancialModel = useFinancialStore((state) => state.deleteFinancialModel);
  const projects = useProjectStore((state) => state.projects);
  const currentUser = useUserStore((state) => state.currentUser);

  const canCreate = usePermission('financials', 'create');
  const canUpdate = usePermission('financials', 'update');
  const canDelete = usePermission('financials', 'delete');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Projects that don't have a financial model yet
  const projectsWithoutModels = projects.filter(
    (project) => !financialModels.some((model) => model.projectId === project.id)
  );

  // Get project name for each model
  const modelsWithProjects = financialModels.map((model) => {
    const project = projects.find((p) => p.id === model.projectId);
    return { model, project };
  });

  // Check if current user can modify a specific model
  const canModifyModel = (creatorId: string) => {
    if (!currentUser) return false;
    const isAdmin = currentUser.roleId === 'role-admin';
    const isCreator = creatorId === currentUser.id;
    return isAdmin || isCreator;
  };

  const handleDeleteClick = (modelId: string) => {
    setModelToDelete(modelId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (modelToDelete) {
      deleteFinancialModel(modelToDelete);
      setModelToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleCreateModel = () => {
    if (!selectedProjectId) return;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const modelId = addFinancialModel(selectedProjectId, `${project.name} - Financial Model`);
    if (modelId) {
      setCreateDialogOpen(false);
      setSelectedProjectId('');
      navigate(`/financials/${selectedProjectId}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Financial Models">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calculator className="h-4 w-4" />
            <span>Manage financial analysis for your projects</span>
          </div>
          {canCreate && projectsWithoutModels.length > 0 && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Financial Model
            </Button>
          )}
        </div>
      </Header>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {financialModels.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No financial models yet</h3>
              <p className="text-muted-foreground mb-4">
                Financial models are created from the project's financial analysis page.
              </p>
              {projects.length > 0 ? (
                <Button asChild>
                  <Link to={`/financials/${projects[0].id}`}>
                    Create First Model
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/projects">Go to Projects</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Model Name</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>PPA Price</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelsWithProjects.map(({ model, project }) => {
                    const showModifyActions = canModifyModel(model.creatorId);

                    return (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/10">
                              <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <span>{model.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {project ? (
                            <Link
                              to={`/projects/${project.id}`}
                              className="text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1"
                            >
                              {project.name}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Unknown Project</span>
                          )}
                        </TableCell>
                        <TableCell>{model.inputs.capacity} MW</TableCell>
                        <TableCell>${model.inputs.ppa_price}/MWh</TableCell>
                        <TableCell className="text-muted-foreground">
                          {model.createdBy}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(model.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/financials/${model.projectId}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              {canUpdate && showModifyActions && (
                                <DropdownMenuItem
                                  onClick={() => navigate(`/financials/${model.projectId}`)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && showModifyActions && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteClick(model.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Financial Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this financial model? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Financial Model</DialogTitle>
            <DialogDescription>
              Select a project to create a financial model for.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projectsWithoutModels.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateModel} disabled={!selectedProjectId}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
