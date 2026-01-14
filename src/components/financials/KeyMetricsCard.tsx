import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { KeyMetrics } from '@/lib/types/financial';
import { TrendingUp, TrendingDown, DollarSign, Clock, Activity } from 'lucide-react';

interface KeyMetricsCardProps {
  metrics: KeyMetrics;
}

interface MetricItemProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  status?: 'positive' | 'neutral' | 'negative';
}

function MetricItem({ label, value, subValue, icon, status = 'neutral' }: MetricItemProps) {
  const statusColors = {
    positive: 'text-green-600',
    neutral: 'text-foreground',
    negative: 'text-red-600',
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-2 rounded-md bg-background">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${statusColors[status]}`}>{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`;
  }
  return value.toFixed(0);
}

function formatYears(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)} years`;
}

function getIRRStatus(irr: number, target: number): 'positive' | 'neutral' | 'negative' {
  if (irr >= target) return 'positive';
  if (irr >= target * 0.75) return 'neutral';
  return 'negative';
}

function getDSCRStatus(dscr: number): 'positive' | 'neutral' | 'negative' {
  if (dscr >= 1.35) return 'positive';
  if (dscr >= 1.20) return 'neutral';
  return 'negative';
}

export function KeyMetricsCard({ metrics }: KeyMetricsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Key Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricItem
            label="Project IRR"
            value={formatPercent(metrics.project_irr)}
            subValue="Target: >8%"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            status={getIRRStatus(metrics.project_irr, 0.08)}
          />
          <MetricItem
            label="Equity IRR"
            value={formatPercent(metrics.equity_irr)}
            subValue="Target: >12%"
            icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
            status={getIRRStatus(metrics.equity_irr, 0.12)}
          />
          <MetricItem
            label="LCOE"
            value={`${metrics.lcoe.toFixed(2)} /MWh`}
            subValue={`PPA: ${metrics.ppa_price} /MWh`}
            icon={<DollarSign className="h-4 w-4 text-green-500" />}
            status={metrics.lcoe < metrics.ppa_price ? 'positive' : 'negative'}
          />
          <MetricItem
            label="Min DSCR"
            value={`${metrics.min_dscr.toFixed(2)}x`}
            subValue="Minimum: >1.30x"
            icon={<Activity className="h-4 w-4 text-orange-500" />}
            status={getDSCRStatus(metrics.min_dscr)}
          />
          <MetricItem
            label="Avg DSCR"
            value={`${metrics.avg_dscr.toFixed(2)}x`}
            icon={<Activity className="h-4 w-4 text-orange-500" />}
            status={getDSCRStatus(metrics.avg_dscr)}
          />
          <MetricItem
            label="Project NPV"
            value={formatCurrency(metrics.project_npv)}
            icon={metrics.project_npv >= 0 ?
              <TrendingUp className="h-4 w-4 text-green-500" /> :
              <TrendingDown className="h-4 w-4 text-red-500" />
            }
            status={metrics.project_npv >= 0 ? 'positive' : 'negative'}
          />
          <MetricItem
            label="Equity Payback"
            value={formatYears(metrics.equity_payback_years)}
            icon={<Clock className="h-4 w-4 text-purple-500" />}
          />
          <MetricItem
            label="Project Payback"
            value={formatYears(metrics.project_payback_years)}
            icon={<Clock className="h-4 w-4 text-purple-500" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}
