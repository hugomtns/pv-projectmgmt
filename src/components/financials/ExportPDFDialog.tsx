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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileDown, Loader2 } from 'lucide-react';
import type { ProjectResults } from '@/lib/types/financial';
import { downloadFinancialReport, type PDFExportOptions } from '@/lib/pdf/financialReport';

interface ExportPDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: ProjectResults;
  globalMargin: number;
  projectName?: string;
}

export function ExportPDFDialog({
  open,
  onOpenChange,
  results,
  globalMargin,
  projectName,
}: ExportPDFDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<PDFExportOptions>({
    includeYearlyChart: true,
    includeYearlyTable: true,
    includeMonthlyChart: false,
    includeCostBreakdown: true,
  });

  const handleOptionChange = (key: keyof PDFExportOptions, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const filename = projectName
        ? `PV_Finance_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
        : undefined;

      await downloadFinancialReport(results, options, globalMargin, filename);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const hasCostBreakdown = results.cost_items_breakdown && results.cost_items_breakdown.items.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export PDF Report</DialogTitle>
          <DialogDescription>
            Choose which sections to include in your financial report.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="yearly-table"
                checked={options.includeYearlyTable}
                onCheckedChange={(checked) =>
                  handleOptionChange('includeYearlyTable', checked === true)
                }
              />
              <Label htmlFor="yearly-table" className="cursor-pointer">
                Yearly Financial Projections Table
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="yearly-chart"
                checked={options.includeYearlyChart}
                onCheckedChange={(checked) =>
                  handleOptionChange('includeYearlyChart', checked === true)
                }
              />
              <Label htmlFor="yearly-chart" className="cursor-pointer">
                Yearly Cash Flow Chart
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="monthly-chart"
                checked={options.includeMonthlyChart}
                onCheckedChange={(checked) =>
                  handleOptionChange('includeMonthlyChart', checked === true)
                }
              />
              <Label htmlFor="monthly-chart" className="cursor-pointer">
                Monthly Cash Flow Chart
              </Label>
            </div>

            {hasCostBreakdown && (
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="cost-breakdown"
                  checked={options.includeCostBreakdown}
                  onCheckedChange={(checked) =>
                    handleOptionChange('includeCostBreakdown', checked === true)
                  }
                />
                <Label htmlFor="cost-breakdown" className="cursor-pointer">
                  CAPEX/OPEX Cost Breakdown
                </Label>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            The report will always include project summary, key metrics,
            financing structure, and first year operations.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
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
