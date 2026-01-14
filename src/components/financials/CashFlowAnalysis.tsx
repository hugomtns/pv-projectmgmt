import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevenueChart } from './RevenueChart';
import { CumulativeFCFChart } from './CumulativeFCFChart';
import { YearlyDataTable } from './YearlyDataTable';
import { MonthlyDataTable } from './MonthlyDataTable';
import type { YearlyData, MonthlyDataPoint } from '@/lib/types/financial';
import { TrendingUp, Calendar, CalendarDays } from 'lucide-react';

interface CashFlowAnalysisProps {
  yearlyData: YearlyData;
  monthlyData: MonthlyDataPoint[];
  equityPaybackYears: number | null;
}

export function CashFlowAnalysis({
  yearlyData,
  monthlyData,
  equityPaybackYears,
}: CashFlowAnalysisProps) {
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Cash Flow Analysis
          </CardTitle>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'yearly' | 'monthly')}>
            <TabsList>
              <TabsTrigger value="yearly" className="gap-2">
                <Calendar className="h-4 w-4" />
                Yearly
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Monthly
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Charts Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {viewMode === 'yearly' ? 'Annual' : 'Monthly'} Revenue & Costs
          </h3>
          <RevenueChart yearlyData={yearlyData} viewMode={viewMode} monthlyData={monthlyData} />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Cumulative Free Cash Flow
          </h3>
          <CumulativeFCFChart
            yearlyData={yearlyData}
            equityPaybackYears={equityPaybackYears}
            viewMode={viewMode}
            monthlyData={monthlyData}
          />
        </div>

        {/* Tables Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {viewMode === 'yearly' ? 'Yearly' : 'Monthly'} Projections
          </h3>
          {viewMode === 'yearly' ? (
            <YearlyDataTable yearlyData={yearlyData} />
          ) : (
            <MonthlyDataTable monthlyData={monthlyData} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
