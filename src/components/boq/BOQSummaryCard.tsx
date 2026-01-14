import { Card, CardContent } from '@/components/ui/card';
import { Package, Calendar, Upload } from 'lucide-react';
import type { BOQ } from '@/lib/types/boq';
import { formatDistanceToNow } from 'date-fns';

interface BOQSummaryCardProps {
  boq: BOQ;
}

export function BOQSummaryCard({ boq }: BOQSummaryCardProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              Items
            </div>
            <p className="text-2xl font-bold">{boq.items.length}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Total Value
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(boq.totalValue)}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Updated {formatDistanceToNow(new Date(boq.updatedAt), { addSuffix: true })}
          </div>
          {boq.lastExportedAt && (
            <div className="flex items-center gap-2">
              <Upload className="h-3 w-3" />
              Last exported {formatDistanceToNow(new Date(boq.lastExportedAt), { addSuffix: true })}
              {boq.lastExportedBy && ` by ${boq.lastExportedBy}`}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
