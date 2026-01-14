import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevenueChart } from './RevenueChart';
import { CumulativeFCFChart } from './CumulativeFCFChart';
import type { YearlyData } from '@/lib/types/financial';
import { TrendingUp, Wallet } from 'lucide-react';

interface CashFlowChartsProps {
  yearlyData: YearlyData;
  equityPaybackYears: number | null;
}

export function CashFlowCharts({ yearlyData, equityPaybackYears }: CashFlowChartsProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Cash Flow Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="revenue" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue & Costs
            </TabsTrigger>
            <TabsTrigger value="fcf" className="gap-2">
              <Wallet className="h-4 w-4" />
              Cumulative FCF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Annual revenue, operating costs, and EBITDA over the project lifetime.
              </p>
              <RevenueChart yearlyData={yearlyData} />
            </div>
          </TabsContent>

          <TabsContent value="fcf" className="mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Annual and cumulative free cash flow to equity, showing the payback point.
              </p>
              <CumulativeFCFChart
                yearlyData={yearlyData}
                equityPaybackYears={equityPaybackYears}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
