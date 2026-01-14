import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeyMetricsCard } from './KeyMetricsCard';
import { FinancingStructureCard } from './FinancingStructureCard';
import { CashFlowCharts } from './CashFlowCharts';
import type { ProjectResults } from '@/lib/types/financial';
import { CheckCircle2, AlertTriangle, XCircle, Zap } from 'lucide-react';

interface FinancialResultsProps {
  results: ProjectResults;
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

function getAssessmentIcon(assessment: string) {
  if (assessment.includes('Strong') || assessment.includes('strong')) {
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  }
  if (assessment.includes('Acceptable') || assessment.includes('acceptable')) {
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  }
  return <XCircle className="h-5 w-5 text-red-500" />;
}

function getAssessmentVariant(assessment: string): 'default' | 'secondary' | 'destructive' {
  if (assessment.includes('Strong') || assessment.includes('strong') || assessment.includes('Recommended')) {
    return 'default';
  }
  if (assessment.includes('Acceptable') || assessment.includes('acceptable')) {
    return 'secondary';
  }
  return 'destructive';
}

export function FinancialResults({ results }: FinancialResultsProps) {
  const { project_summary, first_year_operations, assessment } = results;

  return (
    <div className="space-y-6">
      {/* Assessment Banner */}
      <Card className={`border-2 ${
        getAssessmentVariant(assessment.overall) === 'default' ? 'border-green-500/30 bg-green-500/5' :
        getAssessmentVariant(assessment.overall) === 'secondary' ? 'border-yellow-500/30 bg-yellow-500/5' :
        'border-red-500/30 bg-red-500/5'
      }`}>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            {getAssessmentIcon(assessment.overall)}
            <div className="flex-1">
              <p className="font-medium">{assessment.overall}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant={getAssessmentVariant(assessment.project_irr)}>
                  Project IRR: {assessment.project_irr.split(' at ')[0]}
                </Badge>
                <Badge variant={getAssessmentVariant(assessment.equity_irr)}>
                  Equity IRR: {assessment.equity_irr.split(' at ')[0]}
                </Badge>
                <Badge variant={getAssessmentVariant(assessment.dscr)}>
                  DSCR: {assessment.dscr.split(' at ')[0]}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Summary */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Project Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="font-semibold">{project_summary.capacity_mw} MW</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Capacity Factor</p>
              <p className="font-semibold">{(project_summary.capacity_factor * 100).toFixed(1)}%</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">P50 Yield</p>
              <p className="font-semibold">{project_summary.p50_year_0_yield_mwh.toLocaleString()} MWh</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Project Life</p>
              <p className="font-semibold">{project_summary.project_lifetime} years</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total CapEx</p>
              <p className="font-semibold">{formatCurrency(project_summary.total_capex)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">CapEx/MW</p>
              <p className="font-semibold">{formatCurrency(project_summary.capex_per_mw)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* First Year Operations */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">First Year Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Energy</p>
              <p className="font-semibold">{first_year_operations.energy_production_mwh.toLocaleString()} MWh</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="font-semibold text-green-600">{formatCurrency(first_year_operations.revenue)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">O&M Costs</p>
              <p className="font-semibold text-red-600">{formatCurrency(first_year_operations.om_costs)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">EBITDA</p>
              <p className="font-semibold">{formatCurrency(first_year_operations.ebitda)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">CFADS</p>
              <p className="font-semibold">{formatCurrency(first_year_operations.cfads)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <KeyMetricsCard metrics={results.key_metrics} />

      {/* Financing Structure */}
      <FinancingStructureCard
        structure={results.financing_structure}
        summary={results.project_summary}
      />

      {/* Cash Flow Charts */}
      {results.yearly_data && (
        <CashFlowCharts
          yearlyData={results.yearly_data}
          equityPaybackYears={results.key_metrics.equity_payback_years}
        />
      )}
    </div>
  );
}
