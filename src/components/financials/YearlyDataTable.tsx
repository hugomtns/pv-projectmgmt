import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { YearlyData } from '@/lib/types/financial';

interface YearlyDataTableProps {
  yearlyData: YearlyData;
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

function formatDSCR(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(2) + 'x';
}

export function YearlyDataTable({ yearlyData }: YearlyDataTableProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
      <div className="w-max min-w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="sticky left-0 bg-muted/50 z-10 w-[60px]">Year</TableHead>
              <TableHead className="text-right">Energy (MWh)</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">O&M</TableHead>
              <TableHead className="text-right">EBITDA</TableHead>
              <TableHead className="text-right">CFADS</TableHead>
              <TableHead className="text-right">Debt Service</TableHead>
              <TableHead className="text-right">FCF to Equity</TableHead>
              <TableHead className="text-right">DSCR</TableHead>
              <TableHead className="text-right">Cumulative FCF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearlyData.years.map((year, index) => {
              const cumFCF = yearlyData.cumulative_fcf_to_equity[index];
              const isPaybackYear = index > 0 &&
                yearlyData.cumulative_fcf_to_equity[index - 1] < 0 &&
                cumFCF >= 0;

              return (
                <TableRow
                  key={year}
                  className={isPaybackYear ? 'bg-green-500/10' : undefined}
                >
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    {year}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatEnergy(yearlyData.energy_production_mwh[index])}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-green-600">
                    {formatCurrency(yearlyData.revenue[index])}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-600">
                    {formatCurrency(yearlyData.om_costs[index])}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(yearlyData.ebitda[index])}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(yearlyData.cfads[index])}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-orange-600">
                    {yearlyData.debt_service[index] > 0
                      ? formatCurrency(yearlyData.debt_service[index])
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(yearlyData.fcf_to_equity[index])}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatDSCR(yearlyData.dscr[index])}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm ${
                      cumFCF >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(cumFCF)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
