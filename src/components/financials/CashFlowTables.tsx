import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { YearlyDataTable } from './YearlyDataTable';
import { MonthlyDataTable } from './MonthlyDataTable';
import type { YearlyData, MonthlyDataPoint } from '@/lib/types/financial';
import { TableIcon, Calendar } from 'lucide-react';

interface CashFlowTablesProps {
  yearlyData: YearlyData;
  monthlyData: MonthlyDataPoint[];
}

export function CashFlowTables({ yearlyData, monthlyData }: CashFlowTablesProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <TableIcon className="h-5 w-5 text-primary" />
          Cash Flow Projections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="yearly" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="yearly" className="gap-2">
              <Calendar className="h-4 w-4" />
              Yearly
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <TableIcon className="h-4 w-4" />
              Monthly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="yearly" className="mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Annual cash flow projections over the project lifetime. Payback year highlighted in green.
              </p>
              <YearlyDataTable yearlyData={yearlyData} />
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Monthly breakdown with seasonal energy production. Click year rows to expand/collapse.
              </p>
              <MonthlyDataTable monthlyData={monthlyData} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
