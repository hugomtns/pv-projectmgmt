import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ClipboardList,
  Sparkles,
  Upload,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useBOQStore } from '@/stores/boqStore';
import { useComponentStore } from '@/stores/componentStore';
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import type { BOQGenerationOptions, BOQItem } from '@/lib/types/boq';

import { BOQEmptyState } from './BOQEmptyState';
import { BOQSummaryCard } from './BOQSummaryCard';
import { BOQItemsTable } from './BOQItemsTable';
import { BOQAddItemDialog } from './BOQAddItemDialog';
import { BOQGenerateDialog } from './BOQGenerateDialog';
import { BOQExportDialog } from './BOQExportDialog';

interface BOQPanelProps {
  designId: string;
  variant?: 'sidebar' | 'card';
  onNavigateToFinancials?: () => void;
}

export function BOQPanel({
  designId,
  variant = 'sidebar',
  onNavigateToFinancials,
}: BOQPanelProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogCategory, setAddDialogCategory] = useState('PV Equipment');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const boqStore = useBOQStore();
  const componentStore = useComponentStore();
  const userStore = useUserStore();

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

  // Sidebar variant content
  if (variant === 'sidebar') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Bill of Quantities
          </h3>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {!boq ? (
              <BOQEmptyState onCreateBOQ={handleCreateBOQ} canCreate={canCreate} />
            ) : (
              <>
                <BOQSummaryCard boq={boq} />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGenerateDialogOpen(true)}
                    disabled={!canUpdate}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExportDialogOpen(true)}
                    disabled={!canUpdate || boq.items.length === 0}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Export
                  </Button>
                  {hasLinkedComponents && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshPrices}
                      disabled={!canUpdate}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh Prices
                    </Button>
                  )}
                </div>

                {/* Items Table */}
                <BOQItemsTable
                  items={boq.items}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                  onAddItem={handleOpenAddDialog}
                  readOnly={!canUpdate}
                />

                {/* Link to Financials */}
                {onNavigateToFinancials && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={onNavigateToFinancials}
                    className="w-full gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View in Financial Model
                  </Button>
                )}
              </>
            )}
          </div>
        </ScrollArea>

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
      </div>
    );
  }

  // Card variant content (for financial model page)
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Bill of Quantities
          </CardTitle>
          {boq && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGenerateDialogOpen(true)}
                disabled={!canUpdate}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                disabled={!canUpdate || boq.items.length === 0}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Export to CAPEX
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!boq ? (
          <BOQEmptyState onCreateBOQ={handleCreateBOQ} canCreate={canCreate} />
        ) : (
          <div className="space-y-4">
            <BOQSummaryCard boq={boq} />
            <BOQItemsTable
              items={boq.items}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleOpenAddDialog}
              readOnly={!canUpdate}
            />
          </div>
        )}
      </CardContent>

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
    </Card>
  );
}
