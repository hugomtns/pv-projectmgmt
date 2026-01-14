import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MonthlyDataPoint } from '@/lib/types/financial';

interface MonthlyDataTableProps {
  monthlyData: MonthlyDataPoint[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatEnergy(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Group monthly data by year
function groupByYear(monthlyData: MonthlyDataPoint[]): Map<number, MonthlyDataPoint[]> {
  const grouped = new Map<number, MonthlyDataPoint[]>();
  for (const point of monthlyData) {
    const existing = grouped.get(point.year) || [];
    existing.push(point);
    grouped.set(point.year, existing);
  }
  return grouped;
}

// Calculate yearly totals from monthly data
function calculateYearlyTotal(months: MonthlyDataPoint[]) {
  return {
    energy: months.reduce((sum, m) => sum + m.energy_production_mwh, 0),
    revenue: months.reduce((sum, m) => sum + m.revenue, 0),
    omCosts: months.reduce((sum, m) => sum + m.om_costs, 0),
    ebitda: months.reduce((sum, m) => sum + m.ebitda, 0),
    cfads: months.reduce((sum, m) => sum + m.cfads, 0),
    debtService: months.reduce((sum, m) => sum + m.debt_service, 0),
    fcf: months.reduce((sum, m) => sum + m.fcf_to_equity, 0),
  };
}

interface YearRowProps {
  year: number;
  months: MonthlyDataPoint[];
  isOpen: boolean;
  onToggle: () => void;
}

function YearRow({ year, months, isOpen, onToggle }: YearRowProps) {
  const totals = calculateYearlyTotal(months);
  const lastMonth = months[months.length - 1];
  const cumFCF = lastMonth.cumulative_fcf_to_equity;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <TableRow className="bg-muted/30 cursor-pointer hover:bg-muted/50">
          <TableCell className="sticky left-0 bg-muted/30 z-10">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mr-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <span className="font-semibold">Year {year}</span>
          </TableCell>
          <TableCell className="text-right font-mono text-sm font-semibold">
            {formatEnergy(totals.energy)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm font-semibold text-green-600">
            {formatCurrency(totals.revenue)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm font-semibold text-red-600">
            {formatCurrency(totals.omCosts)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm font-semibold">
            {formatCurrency(totals.ebitda)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm font-semibold">
            {formatCurrency(totals.cfads)}
          </TableCell>
          <TableCell className="text-right font-mono text-sm font-semibold text-orange-600">
            {totals.debtService > 0 ? formatCurrency(totals.debtService) : '—'}
          </TableCell>
          <TableCell className="text-right font-mono text-sm font-semibold">
            {formatCurrency(totals.fcf)}
          </TableCell>
          <TableCell
            className={`text-right font-mono text-sm font-semibold ${
              cumFCF >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(cumFCF)}
          </TableCell>
        </TableRow>
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        <>
          {months.map((month) => (
            <TableRow key={`${month.year}-${month.month}`} className="text-muted-foreground">
              <TableCell className="sticky left-0 bg-background z-10 pl-10">
                {month.month_name}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatEnergy(month.energy_production_mwh)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(month.revenue)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(month.om_costs)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(month.ebitda)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(month.cfads)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {month.debt_service > 0 ? formatCurrency(month.debt_service) : '—'}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(month.fcf_to_equity)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-sm ${
                  month.cumulative_fcf_to_equity >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(month.cumulative_fcf_to_equity)}
              </TableCell>
            </TableRow>
          ))}
        </>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MonthlyDataTable({ monthlyData }: MonthlyDataTableProps) {
  const groupedData = groupByYear(monthlyData);
  const years = Array.from(groupedData.keys()).sort((a, b) => a - b);

  // Only first 3 years expanded by default
  const [openYears, setOpenYears] = useState<Set<number>>(
    new Set(years.slice(0, 3))
  );

  const toggleYear = (year: number) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
      <div className="w-max min-w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="sticky left-0 bg-muted/50 z-10 w-[140px]">Period</TableHead>
              <TableHead className="text-right">Energy (MWh)</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">O&M</TableHead>
              <TableHead className="text-right">EBITDA</TableHead>
              <TableHead className="text-right">CFADS</TableHead>
              <TableHead className="text-right">Debt Service</TableHead>
              <TableHead className="text-right">FCF to Equity</TableHead>
              <TableHead className="text-right">Cumulative FCF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.map((year) => (
              <YearRow
                key={year}
                year={year}
                months={groupedData.get(year)!}
                isOpen={openYears.has(year)}
                onToggle={() => toggleYear(year)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
