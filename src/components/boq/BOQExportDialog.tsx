import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { BOQExportPreview } from '@/lib/types/boq';

interface BOQExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: BOQExportPreview | null;
  onExport: () => void;
}

export function BOQExportDialog({
  open,
  onOpenChange,
  preview,
  onExport,
}: BOQExportDialogProps) {
  if (!preview) return null;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const newItems = preview.items.filter((i) => i.isNew);
  const updateItems = preview.items.filter((i) => !i.isNew);
  const totalValue = preview.totalNewValue + preview.totalUpdateValue;

  const handleExport = () => {
    onExport();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Export BOQ to Financial Model</DialogTitle>
          <DialogDescription>
            The following items will be added or updated in the CAPEX section of the financial model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Financial Model Status */}
          {!preview.hasFinancialModel && (
            <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-600">New financial model will be created</p>
                <p className="text-muted-foreground mt-1">
                  This project doesn't have a financial model yet. One will be created automatically.
                </p>
              </div>
            </div>
          )}

          {/* Items Preview Table */}
          <ScrollArea className="h-[250px] rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.items.map((item) => (
                  <TableRow key={item.boqItem.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.boqItem.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.capexCategory}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.isNew ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          New
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <ArrowRight className="h-3 w-3" />
                          Update
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.boqItem.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>New items ({newItems.length}):</span>
              <span className="font-medium">{formatCurrency(preview.totalNewValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Updated items ({updateItems.length}):</span>
              <span className="font-medium">{formatCurrency(preview.totalUpdateValue)}</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t">
              <span className="font-semibold">Total CAPEX Value:</span>
              <span className="font-bold text-green-600">{formatCurrency(totalValue)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Export to CAPEX
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
