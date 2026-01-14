import { useState } from 'react';
import { useFinancialStore } from '@/stores/financialStore';
import type { FinancialInputs, CostLineItem } from '@/lib/types/financial';
import { DEFAULT_FINANCIAL_INPUTS } from '@/lib/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, RotateCcw } from 'lucide-react';
import { LineItemsManager } from './LineItemsManager';

interface FinancialInputFormProps {
  modelId: string;
  inputs: FinancialInputs;
  onCalculate?: () => void;
  isCalculating?: boolean;
}

interface FormFieldProps {
  label: string;
  hint: string;
  tooltip?: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
  min?: number;
  max?: number;
}

function FormField({ label, hint, tooltip, value, onChange, step = '1', min, max }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="relative">
        <Input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="pr-16"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {hint}
        </span>
      </div>
    </div>
  );
}

export function FinancialInputForm({ modelId, inputs, onCalculate, isCalculating }: FinancialInputFormProps) {
  const updateInputs = useFinancialStore((state) => state.updateInputs);

  // Determine if line items mode is enabled based on whether there are items
  const [lineItemsEnabled, setLineItemsEnabled] = useState(
    inputs.capex_items.length > 0 || inputs.opex_items.length > 0
  );

  const handleChange = (field: keyof FinancialInputs, value: number) => {
    updateInputs(modelId, { [field]: value });
  };

  const handleReset = () => {
    updateInputs(modelId, DEFAULT_FINANCIAL_INPUTS);
    setLineItemsEnabled(false);
  };

  const handleLineItemsEnabledChange = (enabled: boolean) => {
    setLineItemsEnabled(enabled);
    // If disabling, clear the line items
    if (!enabled) {
      updateInputs(modelId, {
        capex_items: [],
        opex_items: [],
        global_margin: 0,
      });
    }
  };

  const handleCapexItemsChange = (items: CostLineItem[]) => {
    updateInputs(modelId, { capex_items: items });
  };

  const handleOpexItemsChange = (items: CostLineItem[]) => {
    updateInputs(modelId, { opex_items: items });
  };

  const handleGlobalMarginChange = (margin: number) => {
    updateInputs(modelId, { global_margin: margin });
  };

  return (
    <div className="space-y-6">
      {/* Core Parameters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Core Parameters</CardTitle>
          <CardDescription>Basic project specifications</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Capacity"
            hint="MW"
            tooltip="The total installed capacity of the solar project in megawatts (MW)."
            value={inputs.capacity}
            onChange={(v) => handleChange('capacity', v)}
            step="0.01"
            min={0}
          />
          <FormField
            label="P50 Year 0 Yield"
            hint="MWh"
            tooltip="The expected first-year energy production in MWh before degradation. This is the median (P50) projection."
            value={inputs.p50_year_0_yield}
            onChange={(v) => handleChange('p50_year_0_yield', v)}
            step="1"
            min={0}
          />
          <FormField
            label="PPA Price"
            hint="/MWh"
            tooltip="Power Purchase Agreement price - the contracted price per MWh for electricity sold."
            value={inputs.ppa_price}
            onChange={(v) => handleChange('ppa_price', v)}
            step="1"
            min={0}
          />
          {/* Only show per-MW cost fields when line items are disabled */}
          {!lineItemsEnabled && (
            <>
              <FormField
                label="CapEx per MW"
                hint=""
                tooltip="Capital expenditure per MW - total upfront cost to develop and construct the project."
                value={inputs.capex_per_mw || 0}
                onChange={(v) => handleChange('capex_per_mw', v)}
                step="1000"
                min={0}
              />
              <FormField
                label="O&M Cost per MW"
                hint="/year"
                tooltip="Operating and maintenance costs per MW per year including cleaning, repairs, and monitoring."
                value={inputs.om_cost_per_mw_year || 0}
                onChange={(v) => handleChange('om_cost_per_mw_year', v)}
                step="100"
                min={0}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Cost Line Items */}
      <LineItemsManager
        enabled={lineItemsEnabled}
        onEnabledChange={handleLineItemsEnabledChange}
        capexItems={inputs.capex_items}
        opexItems={inputs.opex_items}
        onCapexItemsChange={handleCapexItemsChange}
        onOpexItemsChange={handleOpexItemsChange}
        globalMargin={inputs.global_margin}
        onGlobalMarginChange={handleGlobalMarginChange}
        capacity={inputs.capacity}
      />

      {/* Technical Parameters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Technical Parameters</CardTitle>
          <CardDescription>Performance assumptions</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Degradation Rate"
            hint="/year"
            tooltip="Annual rate of production decline due to panel aging. Typical value: 0.004 (0.4% per year)."
            value={inputs.degradation_rate}
            onChange={(v) => handleChange('degradation_rate', v)}
            step="0.001"
            min={0}
            max={0.1}
          />
        </CardContent>
      </Card>

      {/* Economic Parameters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Economic Parameters</CardTitle>
          <CardDescription>Revenue and cost escalation</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="PPA Escalation"
            hint="/year"
            tooltip="Annual percentage increase in PPA price. For example, 0.01 means 1% price increase per year."
            value={inputs.ppa_escalation}
            onChange={(v) => handleChange('ppa_escalation', v)}
            step="0.001"
            min={-0.1}
            max={0.1}
          />
          <FormField
            label="O&M Escalation"
            hint="/year"
            tooltip="Annual percentage increase in O&M costs due to inflation. Typical value: 0.01 (1% per year)."
            value={inputs.om_escalation}
            onChange={(v) => handleChange('om_escalation', v)}
            step="0.001"
            min={-0.1}
            max={0.1}
          />
        </CardContent>
      </Card>

      {/* Financing Parameters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Financing Parameters</CardTitle>
          <CardDescription>Debt and equity structure</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Gearing Ratio"
            hint=""
            tooltip="Proportion of debt financing. 0.75 means 75% debt and 25% equity. Higher gearing increases equity returns but also risk."
            value={inputs.gearing_ratio}
            onChange={(v) => handleChange('gearing_ratio', v)}
            step="0.01"
            min={0}
            max={1}
          />
          <FormField
            label="Interest Rate"
            hint=""
            tooltip="Annual interest rate on project debt. Typical range: 0.04 to 0.06 (4% to 6%)."
            value={inputs.interest_rate}
            onChange={(v) => handleChange('interest_rate', v)}
            step="0.001"
            min={0}
            max={0.2}
          />
          <FormField
            label="Debt Tenor"
            hint="years"
            tooltip="Number of years to repay the debt. Typical solar project debt tenors are 15-18 years."
            value={inputs.debt_tenor}
            onChange={(v) => handleChange('debt_tenor', v)}
            step="1"
            min={1}
            max={30}
          />
          <FormField
            label="Target DSCR"
            hint=""
            tooltip="Debt Service Coverage Ratio - minimum ratio of cash flow to debt payments required by lenders. Typical value: 1.30x."
            value={inputs.target_dscr}
            onChange={(v) => handleChange('target_dscr', v)}
            step="0.01"
            min={1}
          />
        </CardContent>
      </Card>

      {/* Other Parameters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Other Parameters</CardTitle>
          <CardDescription>Project timeline and tax assumptions</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Project Lifetime"
            hint="years"
            tooltip="Total operating lifetime of the project. Typical value: 25-30 years."
            value={inputs.project_lifetime}
            onChange={(v) => handleChange('project_lifetime', v)}
            step="1"
            min={1}
            max={50}
          />
          <FormField
            label="Tax Rate"
            hint=""
            tooltip="Corporate tax rate applied to project earnings. For example, 0.25 means 25% tax."
            value={inputs.tax_rate}
            onChange={(v) => handleChange('tax_rate', v)}
            step="0.01"
            min={0}
            max={1}
          />
          <FormField
            label="Discount Rate"
            hint=""
            tooltip="Rate used to calculate net present value (NPV). Represents the required rate of return. Typical value: 0.08 (8%)."
            value={inputs.discount_rate}
            onChange={(v) => handleChange('discount_rate', v)}
            step="0.01"
            min={0}
            max={0.3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {onCalculate && (
          <Button onClick={onCalculate} disabled={isCalculating}>
            {isCalculating ? 'Calculating...' : 'Calculate'}
          </Button>
        )}
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
