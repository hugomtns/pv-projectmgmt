import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ClipboardList,
  Sparkles,
  Upload,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import { useBOQStore } from '@/stores/boqStore';
import { useComponentStore } from '@/stores/componentStore';
import { useUserStore } from '@/stores/userStore';
import { useDesignStore } from '@/stores/designStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import type { BOQGenerationOptions, BOQItem } from '@/lib/types/boq';

import { BOQEmptyState } from './BOQEmptyState';
import { BOQSummaryCard } from './BOQSummaryCard';
import { BOQItemsTable } from './BOQItemsTable';
import { BOQAddItemDialog } from './BOQAddItemDialog';
import { BOQGenerateDialog } from './BOQGenerateDialog';
import { BOQExportDialog } from './BOQExportDialog';

interface BOQModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designId: string;
}

export function BOQModal({
  open,
  onOpenChange,
  designId,
}: BOQModalProps) {
  const navigate = useNavigate();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogCategory, setAddDialogCategory] = useState('PV Equipment');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const boqStore = useBOQStore();
  const componentStore = useComponentStore();
  const userStore = useUserStore();
  const designStore = useDesignStore();

  const design = designStore.designs.find((d) => d.id === designId);

  const boq = boqStore.getBOQByDesign(designId);
  const currentUser = userStore.currentUser;

  const permissions = currentUser
    ? resolvePermissions(
        currentUser,
        'boqs',
        boq?.id,
        userStore.permissionOverrides,
        userStore.roles
      )
    : { create: false, read: false, update: false, delete: false };

  const canCreate = permissions.create;
  const canUpdate = permissions.update;

  // Check if any components are linked to this design
  const linkedComponents = componentStore.components.filter(
    (c) => c.linkedDesigns?.some((d) => d.designId === designId)
  );
  const hasLinkedComponents = linkedComponents.length > 0;

  const handleCreateBOQ = () => {
    boqStore.createBOQ(designId);
  };

  const handleAddItem = (item: Omit<BOQItem, 'id' | 'totalPrice'>) => {
    if (boq) {
      boqStore.addItem(boq.id, item);
    }
  };

  const handleUpdateItem = (
    itemId: string,
    updates: Partial<Omit<BOQItem, 'id' | 'totalPrice'>>
  ) => {
    if (boq) {
      boqStore.updateItem(boq.id, itemId, updates);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (boq) {
      boqStore.deleteItem(boq.id, itemId);
    }
  };

  const handleOpenAddDialog = (category: string) => {
    setAddDialogCategory(category);
    setAddDialogOpen(true);
  };

  const handleGenerate = async (options: BOQGenerationOptions): Promise<boolean> => {
    if (!boq) return false;
    return boqStore.generateFromDesign(boq.id, options);
  };

  const handleRefreshPrices = () => {
    if (boq) {
      boqStore.refreshPricesFromComponents(boq.id);
    }
  };

  const handleExport = () => {
    if (boq) {
      boqStore.exportToCapex(boq.id);
    }
  };

  const exportPreview = boq ? boqStore.previewExportToCapex(boq.id) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Bill of Quantities
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {!boq ? (
                <BOQEmptyState onCreateBOQ={handleCreateBOQ} canCreate={canCreate} />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <BOQSummaryCard boq={boq} />

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGenerateDialogOpen(true)}
                        disabled={!canUpdate}
                        className="gap-2 justify-start"
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate from DXF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExportDialogOpen(true)}
                        disabled={!canUpdate || boq.items.length === 0}
                        className="gap-2 justify-start"
                      >
                        <Upload className="h-4 w-4" />
                        Export to CAPEX
                      </Button>
                      {hasLinkedComponents && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefreshPrices}
                          disabled={!canUpdate}
                          className="gap-2 justify-start"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Refresh Prices
                        </Button>
                      )}
                      {design?.projectId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onOpenChange(false);
                            navigate(`/financials/${design.projectId}`);
                          }}
                          className="gap-2 justify-start text-muted-foreground hover:text-foreground"
                        >
                          <DollarSign className="h-4 w-4" />
                          View Financial Model
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <BOQItemsTable
                    items={boq.items}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onAddItem={handleOpenAddDialog}
                    readOnly={!canUpdate}
                  />
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <BOQAddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddItem}
        defaultCategory={addDialogCategory}
      />
      <BOQGenerateDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onGenerate={handleGenerate}
        hasExistingItems={boq ? boq.items.some((i) => i.source !== 'manual') : false}
        hasLinkedComponents={hasLinkedComponents}
      />
      <BOQExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        preview={exportPreview}
        onExport={handleExport}
      />
    </>
  );
}
