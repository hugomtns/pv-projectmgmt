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
  Wrench,
} from 'lucide-react';
import { useDesignFinancialStore } from '@/stores/designFinancialStore';
import type { CostLineItem } from '@/lib/types/financial';
import { toast } from 'sonner';

interface OpexManagerProps {
  modelId: string;
  readOnly?: boolean;
}

const OPEX_CATEGORIES = [
  'Operations',
  'Maintenance',
  'Insurance',
  'Land Lease',
  'Management',
  'Administration',
  'Other',
];

export function OpexManager({ modelId, readOnly = false }: OpexManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostLineItem | null>(null);

  const model = useDesignFinancialStore((state) => state.getModelById(modelId));
  const updateOpex = useDesignFinancialStore((state) => state.updateOpex);

  const opexItems = model?.opex || [];
  const totalOpex = opexItems.reduce((sum, item) => sum + item.amount, 0);

  const handleAddItem = (item: Omit<CostLineItem, 'id'>) => {
    const newItem: CostLineItem = {
      id: crypto.randomUUID(),
      ...item,
      is_capex: false,
      source: 'manual',
    };

    updateOpex(modelId, [...opexItems, newItem]);
    setAddDialogOpen(false);
    toast.success('OPEX item added');
  };

  const handleUpdateItem = (updatedItem: CostLineItem) => {
    const newOpex = opexItems.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );

    updateOpex(modelId, newOpex);
    setEditingItem(null);
    toast.success('OPEX item updated');
  };

  const handleDeleteItem = (itemId: string) => {
    const newOpex = opexItems.filter((item) => item.id !== itemId);
    updateOpex(modelId, newOpex);
    toast.success('OPEX item deleted');
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
          <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
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
            <CardTitle className="text-base">OPEX Summary (Annual)</CardTitle>
            {!readOnly && (
              <Button
                size="sm"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="text-2xl font-bold">{opexItems.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Annual OPEX</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalOpex)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">OPEX Items</CardTitle>
        </CardHeader>
        <CardContent>
          {opexItems.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No OPEX Items</h3>
              <p className="text-muted-foreground mb-4">
                Add annual operating expense items
              </p>
              {!readOnly && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Annual Cost</TableHead>
                    {!readOnly && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opexItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-orange-600">
                        {formatCurrency(item.amount)}
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
      <OpexItemDialog
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

// OPEX Item Dialog Component
interface OpexItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CostLineItem;
  onSave: (item: Omit<CostLineItem, 'id'>) => void;
}

function OpexItemDialog({ open, onOpenChange, item, onSave }: OpexItemDialogProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    category: item?.category || 'Operations',
    amount: item?.amount || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    if (formData.amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    onSave({
      name: formData.name,
      category: formData.category,
      amount: formData.amount,
      is_capex: false,
    } as Omit<CostLineItem, 'id'>);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} OPEX Item</DialogTitle>
          <DialogDescription>
            {item
              ? 'Update the annual operating expense item.'
              : 'Add a new annual operating expense item.'}
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
                placeholder="e.g., O&M Services, Insurance, etc."
                required
              />
            </div>

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
                  {OPEX_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Annual Cost (€) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the total annual cost for this item
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
