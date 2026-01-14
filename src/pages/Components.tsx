import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useComponentStore } from '@/stores/componentStore';
import { useUserStore } from '@/stores/userStore';
import { usePermission } from '@/hooks/usePermission';
import type { Component, ComponentType } from '@/lib/types/component';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Box, Cpu, MoreHorizontal, Pencil, Trash2, Plus, Zap, Upload, FileBox } from 'lucide-react';
import { ComponentDialog } from '@/components/components/ComponentDialog';
import { ImportFromDesignDialog } from '@/components/components/ImportFromDesignDialog';
import { FileImportDialog } from '@/components/components/FileImportDialog';
import { DEFAULT_MODULE_SPECS, DEFAULT_INVERTER_SPECS } from '@/lib/types/component';

type FilterType = 'all' | ComponentType;

export function Components() {
  const components = useComponentStore((state) => state.components);
  const deleteComponent = useComponentStore((state) => state.deleteComponent);
  const currentUser = useUserStore((state) => state.currentUser);

  const canCreate = usePermission('components', 'create');
  const canUpdate = usePermission('components', 'update');
  const canDelete = usePermission('components', 'delete');

  const [filter, setFilter] = useState<FilterType>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editComponent, setEditComponent] = useState<Component | null>(null);
  const [importFromDesignOpen, setImportFromDesignOpen] = useState(false);
  const [fileImportOpen, setFileImportOpen] = useState(false);

  const addComponent = useComponentStore((state) => state.addComponent);

  // Filter components based on selected tab
  const filteredComponents = filter === 'all'
    ? components
    : components.filter((c) => c.type === filter);

  // Counts for tabs
  const moduleCount = components.filter((c) => c.type === 'module').length;
  const inverterCount = components.filter((c) => c.type === 'inverter').length;

  // Check if current user can modify a specific component
  const canModifyComponent = (creatorId: string) => {
    if (!currentUser) return false;
    const isAdmin = currentUser.roleId === 'role-admin';
    const isCreator = creatorId === currentUser.id;
    return isAdmin || isCreator;
  };

  const handleDeleteClick = (componentId: string) => {
    setComponentToDelete(componentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (componentToDelete) {
      deleteComponent(componentToDelete);
      setComponentToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleEditClick = (component: Component) => {
    setEditComponent(component);
  };

  const handleImportFromDesign = (data: { type: 'module' | 'inverter'; manufacturer: string; model: string }) => {
    // Create component with pre-filled data and default specs
    const specs = data.type === 'module' ? DEFAULT_MODULE_SPECS : DEFAULT_INVERTER_SPECS;
    addComponent(data.type, {
      manufacturer: data.manufacturer,
      model: data.model,
      unitPrice: 0,
      currency: 'USD',
      specs,
    });
    // Don't close the dialog - allow multiple imports
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getKeySpec = (component: Component) => {
    if (component.type === 'module') {
      return `${component.specs.powerRating} Wp`;
    } else {
      return `${component.specs.acPowerRating} kW`;
    }
  };

  const getComponentIcon = (type: ComponentType) => {
    if (type === 'module') {
      return <Box className="h-4 w-4 text-blue-500" />;
    }
    return <Zap className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Components">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Cpu className="h-4 w-4" />
            <span>PV module and inverter specifications library</span>
          </div>
          {canCreate && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportFromDesignOpen(true)}>
                <FileBox className="h-4 w-4 mr-2" />
                Import from Design
              </Button>
              <Button variant="outline" onClick={() => setFileImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                PAN/OND
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                New Component
              </Button>
            </div>
          )}
        </div>
      </Header>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {/* Tabs for filtering */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="mb-6">
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                All
                <Badge variant="secondary" className="ml-1">{components.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="module" className="gap-2">
                <Box className="h-4 w-4" />
                Modules
                <Badge variant="secondary" className="ml-1">{moduleCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="inverter" className="gap-2">
                <Zap className="h-4 w-4" />
                Inverters
                <Badge variant="secondary" className="ml-1">{inverterCount}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredComponents.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <Cpu className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {filter === 'all'
                  ? 'No components yet'
                  : filter === 'module'
                  ? 'No modules yet'
                  : 'No inverters yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all'
                  ? 'Add PV modules and inverters to your component library.'
                  : filter === 'module'
                  ? 'Add PV modules to track specifications and pricing.'
                  : 'Add inverters to track specifications and pricing.'}
              </p>
              {canCreate && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {filter === 'all' ? 'Component' : filter === 'module' ? 'Module' : 'Inverter'}
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Type</TableHead>
                    <TableHead className="w-[180px]">Manufacturer</TableHead>
                    <TableHead className="w-[220px]">Model</TableHead>
                    <TableHead>Key Spec</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead className="text-muted-foreground">Created</TableHead>
                    <TableHead className="w-[70px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComponents.map((component) => {
                    const showModifyActions = canModifyComponent(component.creatorId);
                    const dimensions = component.type === 'module'
                      ? `${component.specs.length} x ${component.specs.width} mm`
                      : component.specs.length && component.specs.width && component.specs.height
                      ? `${component.specs.length} x ${component.specs.width} x ${component.specs.height} mm`
                      : '-';

                    return (
                      <TableRow key={component.id}>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {getComponentIcon(component.type)}
                            {component.type === 'module' ? 'Module' : 'Inverter'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {component.manufacturer}
                        </TableCell>
                        <TableCell>
                          {component.model}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getKeySpec(component)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {dimensions}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(component.unitPrice, component.currency)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(component.createdAt)}
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
                              {canUpdate && showModifyActions && (
                                <DropdownMenuItem onClick={() => handleEditClick(component)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDelete && showModifyActions && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteClick(component.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                              {(!showModifyActions || (!canUpdate && !canDelete)) && (
                                <DropdownMenuItem disabled>
                                  No actions available
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Component</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this component? This action cannot be undone.
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

      {/* Create/Edit Dialog */}
      <ComponentDialog
        open={createDialogOpen || !!editComponent}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditComponent(null);
          }
        }}
        component={editComponent}
      />

      {/* Import from Design Dialog */}
      <ImportFromDesignDialog
        open={importFromDesignOpen}
        onOpenChange={setImportFromDesignOpen}
        onImport={handleImportFromDesign}
      />

      {/* PAN/OND File Import Dialog */}
      <FileImportDialog
        open={fileImportOpen}
        onOpenChange={setFileImportOpen}
      />
    </div>
  );
}
