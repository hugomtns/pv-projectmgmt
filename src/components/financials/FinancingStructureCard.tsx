import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FinancingStructure, ProjectSummary } from '@/lib/types/financial';
import { Building2, Percent, Calendar, AlertCircle } from 'lucide-react';

interface FinancingStructureCardProps {
  structure: FinancingStructure;
  summary: ProjectSummary;
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

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function FinancingStructureCard({ structure, summary }: FinancingStructureCardProps) {
  const debtPercent = structure.actual_gearing * 100;
  const equityPercent = (1 - structure.actual_gearing) * 100;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Financing Structure
          </CardTitle>
          <Badge variant={structure.binding_constraint === 'DSCR' ? 'default' : 'secondary'}>
            {structure.binding_constraint} Constrained
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Capital Structure Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total CapEx: {formatCurrency(summary.total_capex)}</span>
            <span className="text-muted-foreground">{formatCurrency(summary.capex_per_mw)}/MW</span>
          </div>
          <div className="h-8 rounded-lg overflow-hidden flex">
            <div
              className="bg-blue-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${debtPercent}%` }}
            >
              Debt {debtPercent.toFixed(0)}%
            </div>
            <div
              className="bg-green-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${equityPercent}%` }}
            >
              Equity {equityPercent.toFixed(0)}%
            </div>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Debt: {formatCurrency(structure.final_debt)}</span>
            <span>Equity: {formatCurrency(structure.equity)}</span>
          </div>
        </div>

        {/* Debt Sizing Comparison */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Debt Sizing Constraints
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className={`p-3 rounded-lg ${structure.binding_constraint === 'DSCR' ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
              <p className="text-muted-foreground">Max by DSCR</p>
              <p className="font-semibold">{formatCurrency(structure.max_debt_by_dscr)}</p>
              {structure.binding_constraint === 'DSCR' && (
                <Badge variant="outline" className="mt-1 text-xs">Binding</Badge>
              )}
            </div>
            <div className={`p-3 rounded-lg ${structure.binding_constraint === 'Gearing' ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
              <p className="text-muted-foreground">Max by Gearing</p>
              <p className="font-semibold">{formatCurrency(structure.max_debt_by_gearing)}</p>
              {structure.binding_constraint === 'Gearing' && (
                <Badge variant="outline" className="mt-1 text-xs">Binding</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Debt Terms */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Percent className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Interest Rate</p>
            <p className="font-semibold">{formatPercent(structure.interest_rate)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Debt Tenor</p>
            <p className="font-semibold">{structure.debt_tenor} years</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Building2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Annual DS</p>
            <p className="font-semibold">{formatCurrency(structure.annual_debt_service)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
