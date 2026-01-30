import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Info } from 'lucide-react';
import { useDesignFinancialStore } from '@/stores/designFinancialStore';
import type { FinancingParameters } from '@/lib/types/financial';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FinancingParametersFormProps {
  modelId: string;
  readOnly?: boolean;
}

export function FinancingParametersForm({ modelId, readOnly = false }: FinancingParametersFormProps) {
  const model = useDesignFinancialStore((state) => state.getModelById(modelId));
  const updateFinancing = useDesignFinancialStore((state) => state.updateFinancing);

  const financing = model?.financing || {
    gearing_ratio: 0.75,
    interest_rate: 0.045,
    debt_tenor: 15,
    target_dscr: 1.30,
  };

  const handleUpdate = (updates: Partial<FinancingParameters>) => {
    updateFinancing(modelId, updates);
  };

  if (!model) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Model Not Found</h3>
          <p className="text-muted-foreground">
            The design financial model could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financing Parameters
        </CardTitle>
        <CardDescription>
          Configure debt financing assumptions for this design
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gearing Ratio */}
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="gearing_ratio">Gearing Ratio (Debt / Total Capital)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Target percentage of total project cost financed by debt. Typical range: 70-80%
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="gearing_ratio"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={financing.gearing_ratio}
              onChange={(e) =>
                handleUpdate({ gearing_ratio: parseFloat(e.target.value) || 0 })
              }
              disabled={readOnly}
              className="max-w-xs"
            />
            <Badge variant="secondary">{(financing.gearing_ratio * 100).toFixed(1)}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {(financing.gearing_ratio * 100).toFixed(1)}% debt, {((1 - financing.gearing_ratio) * 100).toFixed(1)}% equity
          </p>
        </div>

        {/* Interest Rate */}
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="interest_rate">Interest Rate (Annual)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Annual interest rate on project debt. Typical range: 3.5-6.0% for utility-scale solar
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="interest_rate"
              type="number"
              min="0"
              max="1"
              step="0.001"
              value={financing.interest_rate}
              onChange={(e) =>
                handleUpdate({ interest_rate: parseFloat(e.target.value) || 0 })
              }
              disabled={readOnly}
              className="max-w-xs"
            />
            <Badge variant="secondary">{(financing.interest_rate * 100).toFixed(2)}%</Badge>
          </div>
        </div>

        {/* Debt Tenor */}
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="debt_tenor">Debt Tenor (Years)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Loan repayment period in years. Typical range: 15-20 years for project finance
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="debt_tenor"
              type="number"
              min="1"
              max="30"
              step="1"
              value={financing.debt_tenor}
              onChange={(e) =>
                handleUpdate({ debt_tenor: parseInt(e.target.value) || 1 })
              }
              disabled={readOnly}
              className="max-w-xs"
            />
            <Badge variant="secondary">{financing.debt_tenor} years</Badge>
          </div>
        </div>

        {/* Target DSCR */}
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="target_dscr">Target DSCR (Debt Service Coverage Ratio)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Minimum cash flow / debt service ratio required by lenders. Typical range: 1.20-1.35
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="target_dscr"
              type="number"
              min="1"
              max="3"
              step="0.01"
              value={financing.target_dscr}
              onChange={(e) =>
                handleUpdate({ target_dscr: parseFloat(e.target.value) || 1 })
              }
              disabled={readOnly}
              className="max-w-xs"
            />
            <Badge variant="secondary">{financing.target_dscr.toFixed(2)}x</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Lower DSCR = higher leverage, higher risk
          </p>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-medium text-sm">Financing Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Debt Financing:</p>
              <p className="font-semibold">{(financing.gearing_ratio * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Equity Financing:</p>
              <p className="font-semibold">{((1 - financing.gearing_ratio) * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Interest Rate:</p>
              <p className="font-semibold">{(financing.interest_rate * 100).toFixed(2)}% p.a.</p>
            </div>
            <div>
              <p className="text-muted-foreground">Loan Term:</p>
              <p className="font-semibold">{financing.debt_tenor} years</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
