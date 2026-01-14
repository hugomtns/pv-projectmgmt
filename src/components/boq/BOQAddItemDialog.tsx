import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { BOQ_CATEGORIES, getDefaultBOQUnit, ALL_BOQ_FIELDS } from '@/data/boqCategories';
import type { BOQItem } from '@/lib/types/boq';

interface BOQAddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: Omit<BOQItem, 'id' | 'totalPrice'>) => void;
  defaultCategory?: string;
}

export function BOQAddItemDialog({
  open,
  onOpenChange,
  onAdd,
  defaultCategory = 'PV Equipment',
}: BOQAddItemDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [unit, setUnit] = useState('units');

  const resetForm = () => {
    setName('');
    setCategory(defaultCategory);
    setQuantity(1);
    setUnitPrice(0);
    setUnit('units');
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    // Auto-set unit based on name if it's a known field
    if (ALL_BOQ_FIELDS.includes(newName)) {
      setUnit(getDefaultBOQUnit(newName));
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || quantity <= 0) return;

    onAdd({
      name: name.trim(),
      category,
      quantity,
      unitPrice,
      unit,
      source: 'manual',
    });

    handleClose(false);
  };

  const isValid = name.trim().length > 0 && quantity > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add BOQ Item</DialogTitle>
          <DialogDescription>
            Add a new item to the Bill of Quantities.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="item-name">Item Name</Label>
            <Input
              id="item-name"
              placeholder="e.g., PV modules, Inverters"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              list="item-suggestions"
            />
            <datalist id="item-suggestions">
              {ALL_BOQ_FIELDS.map((field) => (
                <option key={field} value={field} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOQ_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.title} value={cat.title}>
                    {cat.title}
                  </SelectItem>
                ))}
                <SelectItem value="Uncategorized">Uncategorized</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="e.g., panels, units"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="unit-price">Unit Price (EUR)</Label>
            <Input
              id="unit-price"
              type="number"
              min="0"
              step="1"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Total:</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(quantity * unitPrice)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
