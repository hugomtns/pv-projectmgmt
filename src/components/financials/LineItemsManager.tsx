import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Plus, Trash2, Sparkles, Package, FolderPlus, X } from 'lucide-react';
import type { CostLineItem } from '@/lib/types/financial';
import { AddLineItemDialog } from './AddLineItemDialog';
import { generateCapexItems, generateOpexItems } from '@/lib/calculator/designGenerator';
import { CAPEX_FIELDS } from '@/data/capexFields';
import { OPEX_FIELDS } from '@/data/opexFields';

interface LineItemsManagerProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  capexItems: CostLineItem[];
  opexItems: CostLineItem[];
  onCapexItemsChange: (items: CostLineItem[]) => void;
  onOpexItemsChange: (items: CostLineItem[]) => void;
  globalMargin: number;
  onGlobalMarginChange: (margin: number) => void;
  capacity: number;
}

export function LineItemsManager({
  enabled,
  onEnabledChange,
  capexItems,
  opexItems,
  onCapexItemsChange,
  onOpexItemsChange,
  globalMargin,
  onGlobalMarginChange,
  capacity,
}: LineItemsManagerProps) {
  const [activeTab, setActiveTab] = useState<'capex' | 'opex'>('capex');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCategory, setDialogCategory] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCapexCategories, setCustomCapexCategories] = useState<string[]>([]);
  const [customOpexCategories, setCustomOpexCategories] = useState<string[]>([]);

  const isCapexTab = activeTab === 'capex';
  const currentItems = isCapexTab ? capexItems : opexItems;
  const setCurrentItems = isCapexTab ? onCapexItemsChange : onOpexItemsChange;

  // Get predefined category order for sorting
  const predefinedCategoryOrder = isCapexTab
    ? CAPEX_FIELDS.map((c) => c.title)
    : OPEX_FIELDS.map((c) => c.title);
  const customCategories = isCapexTab ? customCapexCategories : customOpexCategories;

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = new Map<string, CostLineItem[]>();
    for (const item of currentItems) {
      const category = item.category || 'Uncategorized';
      const existing = groups.get(category) || [];
      existing.push(item);
      groups.set(category, existing);
    }
    return groups;
  }, [currentItems]);

  // Categories to display: only those with items OR custom (user-created) categories
  // Does NOT include empty predefined categories
  const allCategories = useMemo(() => {
    const catSet = new Set<string>([
      ...customCategories, // User-created categories (shown even if empty)
      ...Array.from(groupedItems.keys()), // Categories that have items
    ]);
    // Sort with predefined categories first in their original order, then custom, then others
    const predefinedOrder = new Map(predefinedCategoryOrder.map((c, i) => [c, i]));
    return Array.from(catSet).sort((a, b) => {
      const aOrder = predefinedOrder.get(a);
      const bOrder = predefinedOrder.get(b);
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return a.localeCompare(b);
    });
  }, [predefinedCategoryOrder, customCategories, groupedItems]);

  // Calculate item total with margin (CAPEX only)
  const calculateItemTotal = (item: CostLineItem): number => {
    const subtotal = item.amount;
    if (!item.is_capex) return subtotal;
    const marginPercent = item.margin_percent ?? globalMargin;
    return subtotal * (1 + marginPercent / 100);
  };

  // Calculate totals
  const capexTotals = useMemo(() => {
    const beforeMargin = capexItems.reduce((sum, item) => sum + item.amount, 0);
    const withMargin = capexItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const effectiveMargin = beforeMargin > 0 ? ((withMargin - beforeMargin) / beforeMargin) * 100 : 0;
    return { beforeMargin, withMargin, effectiveMargin };
  }, [capexItems, globalMargin]);

  const totalOpex = useMemo(() => {
    return opexItems.reduce((sum, item) => sum + item.amount, 0);
  }, [opexItems]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleOpenAddDialog = (category: string) => {
    setDialogCategory(category);
    setDialogOpen(true);
  };

  const handleAddItem = (item: CostLineItem) => {
    setCurrentItems([...currentItems, item]);
  };

  const handleDeleteItem = (itemId: string) => {
    setCurrentItems(currentItems.filter((item) => item.id !== itemId));
  };

  const handleUpdateItemQuantity = (itemId: string, newQuantity: number) => {
    setCurrentItems(
      currentItems.map((item) => {
        if (item.id === itemId && item.is_capex) {
          const newAmount = (item.unit_price || 0) * newQuantity;
          return { ...item, quantity: newQuantity, amount: newAmount };
        }
        return item;
      })
    );
  };

  const handleUpdateItemMargin = (itemId: string, newMargin: number | undefined) => {
    setCurrentItems(
      currentItems.map((item) => {
        if (item.id === itemId) {
          return { ...item, margin_percent: newMargin };
        }
        return item;
      })
    );
  };

  const handleFillExampleData = () => {
    if (capacity <= 0) return;

    // Check if there are existing items
    const hasItems = isCapexTab ? capexItems.length > 0 : opexItems.length > 0;

    if (hasItems) {
      setConfirmDialogOpen(true);
    } else {
      doFillExampleData();
    }
  };

  const doFillExampleData = () => {
    if (isCapexTab) {
      const generatedItems = generateCapexItems(capacity);
      onCapexItemsChange(generatedItems);
    } else {
      const generatedItems = generateOpexItems(capacity);
      onOpexItemsChange(generatedItems);
    }
    setCollapsedCategories(new Set());
    setConfirmDialogOpen(false);
  };

  const getCategoryTotal = (items: CostLineItem[]): number => {
    if (isCapexTab) {
      return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    }
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    // Check for duplicates (case-insensitive) - check predefined, custom, and existing item categories
    const allExisting = [...predefinedCategoryOrder, ...customCategories, ...Array.from(groupedItems.keys())];
    if (allExisting.some((c) => c.toLowerCase() === trimmedName.toLowerCase())) {
      return; // Already exists
    }

    if (isCapexTab) {
      setCustomCapexCategories([...customCapexCategories, trimmedName]);
    } else {
      setCustomOpexCategories([...customOpexCategories, trimmedName]);
    }

    setNewCategoryName('');
    setAddCategoryDialogOpen(false);
  };

  const handleDeleteCategory = (category: string) => {
    // Only allow deleting custom categories that are empty
    const items = groupedItems.get(category) || [];
    if (items.length > 0) return; // Can't delete non-empty category

    if (isCapexTab) {
      setCustomCapexCategories(customCapexCategories.filter((c) => c !== category));
    } else {
      setCustomOpexCategories(customOpexCategories.filter((c) => c !== category));
    }
  };

  const isCustomCategory = (category: string): boolean => {
    return customCategories.includes(category);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Cost Line Items
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="line-items-toggle" className="text-sm">
              Use Detailed Line Items
            </Label>
            <Switch
              id="line-items-toggle"
              checked={enabled}
              onCheckedChange={onEnabledChange}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {enabled
            ? 'Break down CapEx and OpEx into individual line items for detailed cost analysis.'
            : 'Enable to specify individual cost line items instead of using per-MW values.'}
        </p>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'capex' | 'opex')}>
            <TabsList>
              <TabsTrigger value="capex">
                CapEx Items ({capexItems.length})
              </TabsTrigger>
              <TabsTrigger value="opex">
                OpEx Items ({opexItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="capex" className="space-y-4">
              {/* Global Margin Control */}
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <Label htmlFor="global-margin" className="text-sm font-medium whitespace-nowrap">
                  Global Margin (%):
                </Label>
                <Input
                  id="global-margin"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={globalMargin}
                  onChange={(e) => onGlobalMarginChange(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">
                  Applied to all CAPEX items. Can be overridden per item.
                </span>
              </div>

              {/* Categories and Items */}
              {renderCategoryList()}

              {/* Totals */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total CAPEX (before margin):</span>
                  <span className="font-medium">{formatCurrency(capexTotals.beforeMargin)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-green-600">Total CAPEX (with margin):</span>
                  <span className="font-bold text-green-600">{formatCurrency(capexTotals.withMargin)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Effective Margin:</span>
                  <span>{capexTotals.effectiveMargin.toFixed(2)}%</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="opex" className="space-y-4">
              {/* Categories and Items */}
              {renderCategoryList()}

              {/* Totals */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total OpEx (Year 1):</span>
                  <span className="font-bold">{formatCurrency(totalOpex)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  OpEx escalation rate is set in Economic Parameters and applied to all OpEx items.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Add Example Data Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleFillExampleData}
              disabled={capacity <= 0}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Add Example Data
            </Button>
          </div>
        </CardContent>
      )}

      {/* Add Item Dialog */}
      <AddLineItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAddItem}
        category={dialogCategory}
        isCapex={isCapexTab}
      />

      {/* Confirm Replace Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current {isCapexTab ? 'CAPEX' : 'OPEX'} items with example data
              based on {capacity} MW capacity. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doFillExampleData}>
              Replace Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Category Dialog */}
      <Dialog open={addCategoryDialogOpen} onOpenChange={setAddCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Custom Category</DialogTitle>
            <DialogDescription>
              Create a new category for organizing {isCapexTab ? 'CAPEX' : 'OPEX'} items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Contingencies"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategory();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );

  function renderCategoryList() {
    return (
      <div className="space-y-2">
        {/* Add Category Button */}
        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddCategoryDialogOpen(true)}
            className="gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            Add Category
          </Button>
        </div>

        {allCategories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items yet.</p>
            <p className="text-sm">Click "Add Example Data" or add items manually.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => handleOpenAddDialog('Uncategorized')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </div>
        ) : (
          allCategories.map((category) => {
            const items = groupedItems.get(category) || [];
            const isCollapsed = collapsedCategories.has(category);
            const categoryTotal = getCategoryTotal(items);
            const canDelete = isCustomCategory(category) && items.length === 0;

            return (
              <Collapsible
                key={category}
                open={!isCollapsed}
                onOpenChange={() => toggleCategory(category)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="font-medium">{category}</span>
                      <span className="text-sm text-muted-foreground">
                        ({items.length} {items.length === 1 ? 'item' : 'items'})
                      </span>
                      {isCustomCategory(category) && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Custom</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {formatCurrency(categoryTotal)}
                      </span>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category);
                          }}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t">
                      {items.length > 0 ? (
                        <ScrollArea className="w-full">
                          <Table className="table-fixed w-full">
                            {isCapexTab ? (
                              <colgroup>
                                <col className="w-auto" /> {/* Item Name - flexible */}
                                <col className="w-[110px]" /> {/* Price/Item */}
                                <col className="w-[130px]" /> {/* Qty - wider for large numbers */}
                                <col className="w-[90px]" /> {/* Unit - wider for "panels", "meters" etc */}
                                <col className="w-[110px]" /> {/* Subtotal */}
                                <col className="w-[80px]" /> {/* Margin */}
                                <col className="w-[110px]" /> {/* Total */}
                                <col className="w-[50px]" /> {/* Delete */}
                              </colgroup>
                            ) : (
                              <colgroup>
                                <col className="w-auto" /> {/* Item Name - flexible */}
                                <col className="w-[120px]" /> {/* Unit - wider for longer unit names */}
                                <col className="w-[130px]" /> {/* Amount */}
                                <col className="w-[50px]" /> {/* Delete */}
                              </colgroup>
                            )}
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="text-left">Item Name</TableHead>
                                {isCapexTab ? (
                                  <>
                                    <TableHead className="text-right pr-3">Price</TableHead>
                                    <TableHead className="text-right pr-3">Qty</TableHead>
                                    <TableHead className="text-left">Unit</TableHead>
                                    <TableHead className="text-right pr-3">Subtotal</TableHead>
                                    <TableHead className="text-right pr-3">Margin</TableHead>
                                    <TableHead className="text-right pr-3">Total</TableHead>
                                  </>
                                ) : (
                                  <>
                                    <TableHead className="text-left">Unit</TableHead>
                                    <TableHead className="text-right pr-3">Amount/yr</TableHead>
                                  </>
                                )}
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-left font-medium truncate" title={item.name}>
                                    {item.name}
                                  </TableCell>
                                  {isCapexTab ? (
                                    <>
                                      <TableCell className="text-right font-mono text-sm pr-3">
                                        {formatCurrency(item.unit_price || 0)}
                                      </TableCell>
                                      <TableCell className="text-right pr-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={item.quantity || 0}
                                          onChange={(e) =>
                                            handleUpdateItemQuantity(
                                              item.id,
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                          className="w-full h-8 text-right px-3"
                                        />
                                      </TableCell>
                                      <TableCell className="text-left text-muted-foreground text-sm truncate" title={item.unit || '-'}>
                                        {item.unit || '-'}
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-sm pr-3">
                                        {formatCurrency(item.amount)}
                                      </TableCell>
                                      <TableCell className="text-right pr-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.1"
                                          value={item.margin_percent ?? globalMargin}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                            handleUpdateItemMargin(item.id, value);
                                          }}
                                          className="w-full h-8 text-right px-3"
                                          title={
                                            item.margin_percent !== undefined
                                              ? 'Custom margin (overrides global)'
                                              : 'Using global margin'
                                          }
                                        />
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-sm font-semibold pr-3">
                                        {formatCurrency(calculateItemTotal(item))}
                                      </TableCell>
                                    </>
                                  ) : (
                                    <>
                                      <TableCell className="text-left text-muted-foreground text-sm truncate" title={item.unit || '-'}>
                                        {item.unit || '-'}
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-sm pr-3">
                                        {formatCurrency(item.amount)}
                                      </TableCell>
                                    </>
                                  )}
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No items in this category yet.
                        </div>
                      )}

                      {/* Add Item to Category Button */}
                      <div className="p-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAddDialog(category)}
                          className="w-full justify-start text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item to {category}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        )}

        {/* General Add Item button when there are categories */}
        {allCategories.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenAddDialog('Uncategorized')}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>
    );
  }
}
