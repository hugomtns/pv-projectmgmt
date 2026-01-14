import { useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus, Trash2, Package, Sun, Zap } from 'lucide-react';
import type { BOQItem, BOQItemSource } from '@/lib/types/boq';
import { BOQ_CATEGORIES } from '@/data/boqCategories';

type ComponentType = 'module' | 'inverter' | null;

function getComponentType(item: BOQItem): ComponentType {
  const name = item.name.toLowerCase();
  if (name.includes('module') || name.includes('panel') || name.includes('pv')) {
    return 'module';
  }
  if (name.includes('inverter')) {
    return 'inverter';
  }
  return null;
}

interface BOQItemsTableProps {
  items: BOQItem[];
  onUpdateItem: (itemId: string, updates: Partial<Omit<BOQItem, 'id' | 'totalPrice'>>) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (category: string) => void;
  readOnly?: boolean;
}

export function BOQItemsTable({
  items,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  readOnly = false,
}: BOQItemsTableProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Get predefined category order
  const predefinedCategoryOrder = BOQ_CATEGORIES.map((c) => c.title);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = new Map<string, BOQItem[]>();
    for (const item of items) {
      const category = item.category || 'Uncategorized';
      const existing = groups.get(category) || [];
      existing.push(item);
      groups.set(category, existing);
    }
    return groups;
  }, [items]);

  // Sort categories
  const categories = useMemo(() => {
    const catSet = new Set(Array.from(groupedItems.keys()));
    const predefinedOrder = new Map(predefinedCategoryOrder.map((c, i) => [c, i]));
    return Array.from(catSet).sort((a, b) => {
      const aOrder = predefinedOrder.get(a);
      const bOrder = predefinedOrder.get(b);
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return a.localeCompare(b);
    });
  }, [predefinedCategoryOrder, groupedItems]);

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

  const getCategoryTotal = (categoryItems: BOQItem[]): number => {
    return categoryItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getSourceBadge = (source: BOQItemSource) => {
    switch (source) {
      case 'dxf_extraction':
        return <Badge variant="secondary" className="text-xs">DXF</Badge>;
      case 'component_library':
        return <Badge variant="outline" className="text-xs">Library</Badge>;
      case 'manual':
        return <Badge variant="outline" className="text-xs">Manual</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: ComponentType) => {
    switch (type) {
      case 'module':
        return (
          <Badge variant="default" className="text-xs gap-1 bg-amber-500/90 hover:bg-amber-500/80">
            <Sun className="h-3 w-3" />
            Module
          </Badge>
        );
      case 'inverter':
        return (
          <Badge variant="default" className="text-xs gap-1 bg-blue-500/90 hover:bg-blue-500/80">
            <Zap className="h-3 w-3" />
            Inverter
          </Badge>
        );
      default:
        return <span className="text-xs text-muted-foreground">—</span>;
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No items in this BOQ.</p>
        <p className="text-sm">Generate from design or add items manually.</p>
        {!readOnly && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => onAddItem('PV Equipment')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Item
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {categories.map((category) => {
        const categoryItems = groupedItems.get(category) || [];
        const isCollapsed = collapsedCategories.has(category);
        const categoryTotal = getCategoryTotal(categoryItems);

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
                    ({categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'})
                  </span>
                </div>
                <span className="font-semibold text-sm">
                  {formatCurrency(categoryTotal)}
                </span>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t">
                  <ScrollArea className="w-full">
                    <Table className="table-fixed w-full">
                      <colgroup><col className="w-auto" /><col className="w-[90px]" /><col className="w-[70px]" /><col className="w-[110px]" /><col className="w-[120px]" /><col className="w-[80px]" /><col className="w-[100px]" />{!readOnly && <col className="w-[50px]" />}</colgroup>
                      <TableHeader>
                        <TableRow className="bg-muted/50 border-b-2">
                          <TableHead className="text-left font-semibold text-foreground">Item</TableHead>
                          <TableHead className="text-center font-semibold text-foreground">Type</TableHead>
                          <TableHead className="text-center font-semibold text-foreground">Source</TableHead>
                          <TableHead className="text-right pr-3 font-semibold text-foreground">Qty</TableHead>
                          <TableHead className="text-right pr-3 font-semibold text-foreground">Unit Price</TableHead>
                          <TableHead className="text-left font-semibold text-foreground">Unit</TableHead>
                          <TableHead className="text-right pr-3 font-semibold text-foreground">Total</TableHead>
                          {!readOnly && <TableHead></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium truncate" title={item.name}>
                              {item.name}
                            </TableCell>
                            <TableCell className="text-center">
                              {getTypeBadge(getComponentType(item))}
                            </TableCell>
                            <TableCell className="text-center">
                              {getSourceBadge(item.source)}
                            </TableCell>
                            <TableCell className="text-right pr-1">
                              {readOnly ? (
                                <span className="font-mono text-sm">{item.quantity.toLocaleString()}</span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    onUpdateItem(item.id, {
                                      quantity: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full h-8 text-right pl-2 pr-1 number-input-spaced"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-1">
                              {readOnly ? (
                                <span className="font-mono text-sm">{formatCurrency(item.unitPrice)}</span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    onUpdateItem(item.id, {
                                      unitPrice: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full h-8 text-right pl-2 pr-1 number-input-spaced"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm truncate" title={item.unit}>
                              {item.unit}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold pr-3">
                              {formatCurrency(item.totalPrice)}
                            </TableCell>
                            {!readOnly && (
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDeleteItem(item.id)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>

                  {!readOnly && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddItem(category)}
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item to {category}
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {!readOnly && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddItem('Uncategorized')}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      )}
    </div>
  );
}
