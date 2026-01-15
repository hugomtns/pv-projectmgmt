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
import { Loader2, FileDown, AlertCircle } from 'lucide-react';
import { useAdminLogStore } from '@/stores/adminLogStore';
import { downloadAdminLogReport } from '@/lib/pdf/adminLogReport';
import { toast } from 'sonner';

interface ExportAdminLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportAdminLogDialog({
  open,
  onOpenChange,
}: ExportAdminLogDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const filters = useAdminLogStore((state) => state.filters);
  const getFilteredEntries = useAdminLogStore(
    (state) => state.getFilteredEntries
  );
  const totalCount = useAdminLogStore((state) => state.totalCount);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const entries = await getFilteredEntries(1000);

      if (entries.length === 0) {
        toast.error('No entries to export');
        return;
      }

      await downloadAdminLogReport(entries, filters);
      toast.success(`Exported ${entries.length} log entries`);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to export admin log:', error);
      toast.error('Failed to export admin log');
    } finally {
      setIsExporting(false);
    }
  };

  const exportCount = Math.min(totalCount, 1000);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Admin Log</DialogTitle>
          <DialogDescription>
            Export log entries to a PDF document. Current filters will be
            applied.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Export Summary</p>
              <p className="text-muted-foreground mt-1">
                {totalCount > 1000 ? (
                  <>
                    <strong>{exportCount}</strong> of {totalCount} entries will
                    be exported (limited to 1000)
                  </>
                ) : (
                  <>
                    <strong>{exportCount}</strong> entries will be exported
                  </>
                )}
              </p>
            </div>
          </div>

          {Object.keys(filters).length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Active Filters:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {filters.userId && <li>Filtered by user</li>}
                {filters.action && <li>Action: {filters.action}</li>}
                {filters.entityType && (
                  <li>Entity type: {filters.entityType}</li>
                )}
                {filters.dateFrom && <li>From: {filters.dateFrom}</li>}
                {filters.dateTo && <li>To: {filters.dateTo}</li>}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || totalCount === 0}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
