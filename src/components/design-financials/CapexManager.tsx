import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Package,
} from 'lucide-react';
import { useDesignFinancialStore } from '@/stores/designFinancialStore';
import type { CostLineItem } from '@/lib/types/financial';
import { toast } from 'sonner';

interface CapexManagerProps {
  modelId: string;
  readOnly?: boolean;
}

const CAPEX_CATEGORIES = [
  'PV Equipment',
  'Electrical Equipment',
  'Civil Works',
  'Mechanical Equipment',
  'Installation',
  'Engineering',
  'Other',
];

const UNITS = ['units', 'panels', 'meters', 'MW', 'kW', 'kWp', 'km', 'lot'];

export function CapexManager({ modelId, readOnly = false }: CapexManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostLineItem | null>(null);

  const model = useDesignFinancialStore((state) => state.getModelById(modelId));
  const updateCapex = useDesignFinancialStore((state) => state.updateCapex);

  const capexItems = model?.capex || [];
  const globalMargin = model?.global_margin || 0;

  const totalCapex = capexItems.reduce((sum, item) => sum + item.amount, 0);
  const totalWithMargin = totalCapex * (1 + globalMargin);

  const handleAddItem = (item: Omit<CostLineItem, 'id' | 'amount'>) => {
    const amount = (item.unit_price || 0) * (item.quantity || 1);

    const newItem: CostLineItem = {
      id: crypto.randomUUID(),
      ...item,
      amount,
      is_capex: true,
      source: 'manual',
    };

    updateCapex(modelId, [...capexItems, newItem]);
    setAddDialogOpen(false);
    toast.success('CAPEX item added');
  };

  const handleUpdateItem = (updatedItem: CostLineItem) => {
    // Recalculate amount
    const amount = (updatedItem.unit_price || 0) * (updatedItem.quantity || 1);

    const updated: CostLineItem = {
      ...updatedItem,
      amount,
    };

    const newCapex = capexItems.map((item) =>
      item.id === updated.id ? updated : item
    );

    updateCapex(modelId, newCapex);
    setEditingItem(null);
    toast.success('CAPEX item updated');
  };

  const handleDeleteItem = (itemId: string) => {
    const newCapex = capexItems.filter((item) => item.id !== itemId);
    updateCapex(modelId, newCapex);
    toast.success('CAPEX item deleted');
  };

  const handleGenerateFromDXF = async () => {
    toast.info('DXF component extraction - Coming soon in Phase 4');
    // This will be implemented when we integrate with DXF parsing
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!model) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Model Not Found</h3>
          <p className="text-muted-foreground">
            The design financial model could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">CAPEX Summary</CardTitle>
            {!readOnly && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateFromDXF}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate from DXF
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="text-2xl font-bold">{capexItems.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Base CAPEX</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCapex)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                With Margin ({(globalMargin * 100).toFixed(1)}%)
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalWithMargin)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">CAPEX Items</CardTitle>
        </CardHeader>
        <CardContent>
          {capexItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No CAPEX Items</h3>
              <p className="text-muted-foreground mb-4">
                Add items manually or generate from DXF design
              </p>
              {!readOnly && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Source</TableHead>
                    {!readOnly && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capexItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity?.toLocaleString() || '-'} {item.unit || ''}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-600">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.source === 'manual' && 'Manual'}
                          {item.source === 'dxf_extraction' && 'DXF'}
                          {item.source === 'component_library' && 'Component Lib'}
                          {!item.source && 'Unknown'}
                        </Badge>
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingItem(item)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <ItemDialog
        open={addDialogOpen || editingItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditingItem(null);
          }
        }}
        item={editingItem || undefined}
        onSave={(item) => {
          if (editingItem) {
            handleUpdateItem({ ...editingItem, ...item } as CostLineItem);
          } else {
            handleAddItem(item);
          }
        }}
      />
    </div>
  );
}

// Item Dialog Component
interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CostLineItem;
  onSave: (item: Omit<CostLineItem, 'id' | 'amount'>) => void;
}

function ItemDialog({ open, onOpenChange, item, onSave }: ItemDialogProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    category: item?.category || 'PV Equipment',
    quantity: item?.quantity || 1,
    unit: item?.unit || 'units',
    unit_price: item?.unit_price || 0,
    margin_percent: item?.margin_percent,
  });

  const calculatedTotal = (formData.unit_price || 0) * (formData.quantity || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    onSave({
      name: formData.name,
      category: formData.category,
      quantity: formData.quantity,
      unit: formData.unit,
      unit_price: formData.unit_price,
      margin_percent: formData.margin_percent,
      is_capex: true,
    } as Omit<CostLineItem, 'id' | 'amount'>);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} CAPEX Item</DialogTitle>
          <DialogDescription>
            {item
              ? 'Update the CAPEX item details below.'
              : 'Add a new CAPEX item to the financial model.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., PV Modules, Inverters, etc."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPEX_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit_price">Unit Price (€)</Label>
                <Input
                  id="unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="margin_percent">
                Item-Specific Margin (%) <span className="text-muted-foreground text-sm">(optional)</span>
              </Label>
              <Input
                id="margin_percent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.margin_percent || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    margin_percent: e.target.value ? parseFloat(e.target.value) / 100 : undefined,
                  })
                }
                placeholder="Leave empty to use global margin"
              />
            </div>

            {/* Calculated Total */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Calculated Total:</span>
                <span className="text-lg font-bold text-green-600">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 0,
                  }).format(calculatedTotal)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.quantity} × €{formData.unit_price?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{item ? 'Update' : 'Add'} Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
