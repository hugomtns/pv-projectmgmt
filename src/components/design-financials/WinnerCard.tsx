import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, DollarSign, Zap, ArrowRight } from 'lucide-react';
import { useDesignFinancialStore } from '@/stores/designFinancialStore';
import { useDesignStore } from '@/stores/designStore';

interface WinnerCardProps {
  projectId: string;
  onViewDetails?: (designId: string) => void;
  onChangeWinner?: () => void;
}

export function WinnerCard({ projectId, onViewDetails, onChangeWinner }: WinnerCardProps) {
  const winnerModel = useDesignFinancialStore((state) =>
    state.getWinnerModelByProject(projectId)
  );
  const designs = useDesignStore((state) => state.designs);

  if (!winnerModel) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Winner Selected</h3>
          <p className="text-muted-foreground mb-4">
            Compare design financial models and select a winner
          </p>
          {onChangeWinner && (
            <Button onClick={onChangeWinner} variant="outline">
              Select Winner Design
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const design = designs.find((d) => d.id === winnerModel.designId);
  const results = winnerModel.results;

  return (
    <Card className="border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{design?.name || 'Winner Design'}</CardTitle>
              <p className="text-sm text-muted-foreground">{winnerModel.name}</p>
            </div>
          </div>
          <Badge className="bg-yellow-500 hover:bg-yellow-600">Winner</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        {results ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Equity IRR"
              value={`${(results.key_metrics.equity_irr * 100).toFixed(2)}%`}
              trend={results.key_metrics.equity_irr > 0.12 ? 'good' : 'neutral'}
            />
            <MetricCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Project NPV"
              value={formatCurrency(results.key_metrics.project_npv)}
              trend={results.key_metrics.project_npv > 0 ? 'good' : 'bad'}
            />
            <MetricCard
              icon={<Zap className="h-4 w-4" />}
              label="LCOE"
              value={`€${results.key_metrics.lcoe.toFixed(2)}/MWh`}
              trend={results.key_metrics.lcoe < 70 ? 'good' : 'neutral'}
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Min DSCR"
              value={results.key_metrics.min_dscr.toFixed(2)}
              trend={results.key_metrics.min_dscr >= 1.2 ? 'good' : 'bad'}
            />
          </div>
        ) : (
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No financial results calculated yet
            </p>
          </div>
        )}

        {/* Quick Summary */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-medium text-sm">Design Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Capacity:</p>
              <p className="font-semibold">{winnerModel.capacity} MW</p>
            </div>
            <div>
              <p className="text-muted-foreground">P50 Yield:</p>
              <p className="font-semibold">{winnerModel.p50_year_0_yield.toLocaleString()} MWh</p>
            </div>
            <div>
              <p className="text-muted-foreground">CAPEX Items:</p>
              <p className="font-semibold">{winnerModel.capex.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">OPEX Items:</p>
              <p className="font-semibold">{winnerModel.opex.length}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onViewDetails && (
            <Button
              onClick={() => onViewDetails(winnerModel.designId)}
              className="flex-1"
            >
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {onChangeWinner && (
            <Button onClick={onChangeWinner} variant="outline">
              Change Winner
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Metric Card Sub-component
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: 'good' | 'neutral' | 'bad';
}

function MetricCard({ icon, label, value, trend = 'neutral' }: MetricCardProps) {
  const trendColors = {
    good: 'text-green-600 dark:text-green-400',
    neutral: 'text-blue-600 dark:text-blue-400',
    bad: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="rounded-lg bg-background p-3 border">
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className={`text-xl font-bold ${trendColors[trend]}`}>{value}</p>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: value > 1000000 ? 'compact' : 'standard',
    compactDisplay: 'short',
  }).format(value);
}
