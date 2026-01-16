import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PerformanceLog, PerformanceKPIs } from '@/lib/types/performanceLog';
import { Zap, TrendingUp, Activity, AlertTriangle, Calendar, BarChart3 } from 'lucide-react';

interface PerformanceKPIPanelProps {
  projectId: string;
  kpis: PerformanceKPIs;
  logs: PerformanceLog[];
}

export function PerformanceKPIPanel({ kpis, logs }: PerformanceKPIPanelProps) {
  // Format production values
  const formatProduction = (kwh: number) => {
    if (kwh >= 1000000) {
      return `${(kwh / 1000000).toFixed(2)} GWh`;
    }
    if (kwh >= 1000) {
      return `${(kwh / 1000).toFixed(1)} MWh`;
    }
    return `${kwh.toFixed(0)} kWh`;
  };

  // Get recent monthly trend (last 6 months if available)
  const monthlyTrend = useMemo(() => {
    const monthlyLogs = logs.filter((l) => l.period === 'monthly');
    return monthlyLogs.slice(0, 6).reverse();
  }, [logs]);

  const hasData = logs.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No performance data</h3>
        <p className="text-sm text-muted-foreground">
          Add performance logs to see summary statistics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Total Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatProduction(kpis.totalProduction)}</p>
            <p className="text-xs text-muted-foreground">{kpis.periodCount} periods logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg. PR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {kpis.avgPerformanceRatio > 0 ? `${(kpis.avgPerformanceRatio * 100).toFixed(1)}%` : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Performance Ratio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Avg. Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {kpis.avgAvailability > 0 ? `${kpis.avgAvailability.toFixed(1)}%` : '-'}
            </p>
            <p className="text-xs text-muted-foreground">System uptime</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Curtailment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatProduction(kpis.totalCurtailment)}</p>
            <p className="text-xs text-muted-foreground">Lost production</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend (simple bar representation) */}
      {monthlyTrend.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Recent Monthly Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {monthlyTrend.map((log) => {
                const maxProduction = Math.max(...monthlyTrend.map((l) => l.actualProduction));
                const height = (log.actualProduction / maxProduction) * 100;
                const month = new Date(log.startDate).toLocaleDateString('en-US', { month: 'short' });

                return (
                  <div key={log.id} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className="w-full bg-primary rounded-t transition-all"
                        style={{ height: `${height}%` }}
                        title={formatProduction(log.actualProduction)}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{month}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Logs</span>
              <p className="font-medium">{kpis.periodCount}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Months with Data</span>
              <p className="font-medium">{kpis.monthsWithData}</p>
            </div>
            <div>
              <span className="text-muted-foreground">First Log</span>
              <p className="font-medium">
                {logs.length > 0
                  ? new Date(logs[logs.length - 1].startDate).toLocaleDateString()
                  : '-'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Latest Log</span>
              <p className="font-medium">
                {logs.length > 0 ? new Date(logs[0].startDate).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
