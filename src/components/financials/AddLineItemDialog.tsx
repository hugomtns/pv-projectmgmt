import { useState, useEffect, useMemo } from 'react';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CostLineItem } from '@/lib/types/financial';
import { ALL_CAPEX_FIELDS, getCapexItemCategory } from '@/data/capexFields';
import { ALL_OPEX_FIELDS, getOpexItemCategory } from '@/data/opexFields';
import { DEFAULT_CAPEX_UNITS, DEFAULT_OPEX_UNITS } from '@/data/defaultUnits';

interface AddLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: CostLineItem) => void;
  category: string;
  isCapex: boolean;
}

export function AddLineItemDialog({
  open,
  onOpenChange,
  onAdd,
  category,
  isCapex,
}: AddLineItemDialogProps) {
  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const fields = isCapex ? ALL_CAPEX_FIELDS : ALL_OPEX_FIELDS;
  const defaultUnits = isCapex ? DEFAULT_CAPEX_UNITS : DEFAULT_OPEX_UNITS;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setItemName('');
      setItemUnit('');
      setUnitPrice('');
      setQuantity('');
      setAmount('');
      setComboboxOpen(false);
    }
  }, [open]);

  // Auto-fill unit when item name changes
  const handleItemNameChange = (name: string) => {
    setItemName(name);
    const defaultUnit = defaultUnits[name];
    if (defaultUnit) {
      setItemUnit(defaultUnit);
    }
  };

  // Calculate total for CAPEX items
  const calculatedTotal = useMemo(() => {
    if (!isCapex) return 0;
    const price = parseFloat(unitPrice) || 0;
    const qty = parseFloat(quantity) || 0;
    return price * qty;
  }, [isCapex, unitPrice, quantity]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = () => {
    if (!itemName.trim()) return;

    let newItem: CostLineItem;

    if (isCapex) {
      const price = parseFloat(unitPrice);
      const qty = parseFloat(quantity);

      if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) {
        return;
      }

      // Detect category from item name or use provided category
      const detectedCategory = getCapexItemCategory(itemName);
      const finalCategory = detectedCategory !== 'Uncategorized' ? detectedCategory : category;

      newItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: itemName.trim(),
        amount: price * qty,
        is_capex: true,
        category: finalCategory,
        unit: itemUnit.trim() || undefined,
        unit_price: price,
        quantity: qty,
      };
    } else {
      const amt = parseFloat(amount);

      if (isNaN(amt) || amt <= 0) {
        return;
      }

      // Detect category from item name or use provided category
      const detectedCategory = getOpexItemCategory(itemName);
      const finalCategory = detectedCategory !== 'Uncategorized' ? detectedCategory : category;

      newItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: itemName.trim(),
        amount: amt,
        is_capex: false,
        category: finalCategory,
        unit: itemUnit.trim() || undefined,
      };
    }

    onAdd(newItem);
    onOpenChange(false);
  };

  const isValid = isCapex
    ? itemName.trim() && unitPrice && quantity && parseFloat(unitPrice) > 0 && parseFloat(quantity) > 0
    : itemName.trim() && amount && parseFloat(amount) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Item to {category}</DialogTitle>
          <DialogDescription>
            Add a new {isCapex ? 'CAPEX' : 'OPEX'} line item to this category.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Item Name with Combobox */}
          <div className="grid gap-2">
            <Label htmlFor="item-name">Item Name</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between font-normal"
                >
                  {itemName || "Select or type item name..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[375px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search items..."
                    value={itemName}
                    onValueChange={handleItemNameChange}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setComboboxOpen(false);
                        }}
                      >
                        Use "{itemName}" as custom item
                      </Button>
                    </CommandEmpty>
                    <CommandGroup>
                      {fields
                        .filter((field) =>
                          field.toLowerCase().includes(itemName.toLowerCase())
                        )
                        .slice(0, 10)
                        .map((field) => (
                          <CommandItem
                            key={field}
                            value={field}
                            onSelect={(value) => {
                              handleItemNameChange(value);
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                itemName === field ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {field}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Unit (optional) */}
          <div className="grid gap-2">
            <Label htmlFor="unit">Unit (optional)</Label>
            <Input
              id="unit"
              placeholder="e.g., MW, panels, meters"
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
            />
          </div>

          {isCapex ? (
            <>
              {/* Price per Item */}
              <div className="grid gap-2">
                <Label htmlFor="unit-price">Price per Item (€)</Label>
                <Input
                  id="unit-price"
                  type="number"
                  placeholder="Enter price per item"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  min="0"
                  step="100"
                />
              </div>

              {/* Quantity */}
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0"
                  step="1"
                />
              </div>

              {/* Calculated Total */}
              <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">Total:</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(calculatedTotal)}
                </span>
              </div>
            </>
          ) : (
            /* OPEX: Just amount */
            <div className="grid gap-2">
              <Label htmlFor="amount">Annual Amount (€)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter annual amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="1000"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
