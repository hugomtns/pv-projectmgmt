/**
 * Solar Finance Calculator
 *
 * TypeScript implementation of financial model for utility-scale solar projects
 * Adapted from pvfinance calculator
 */

import { irr, pmt } from './financial';
import { NORTHERN_HEMISPHERE_MONTHLY_FACTORS, MONTH_NAMES } from './constants';
import type {
  FinancialInputs,
  ProjectResults,
  ProjectSummary,
  FinancingStructure,
  KeyMetrics,
  FirstYearOperations,
  Assessment,
  YearlyData,
  MonthlyDataPoint,
} from '@/lib/types/financial';

export class SolarFinanceCalculator {
  private inputs: FinancialInputs;

  constructor(inputs: FinancialInputs) {
    this.inputs = this.preprocessInputs(inputs);
  }

  /**
   * Preprocess inputs: handle cost_items mode
   */
  private preprocessInputs(inputs: FinancialInputs): FinancialInputs {
    // If using cost items, calculate totals with margin
    if (inputs.capex_items && inputs.capex_items.length > 0) {
      const globalMargin = inputs.global_margin || 0;

      // Calculate total CAPEX with margin applied to each item
      const totalCapex = inputs.capex_items.reduce((sum, item) => {
        // Use item-specific margin if set, otherwise use global margin
        const marginPercent = item.margin_percent ?? globalMargin;
        const itemTotal = item.amount * (1 + marginPercent / 100);
        return sum + itemTotal;
      }, 0);

      // OPEX items don't have margin
      const totalOpex = inputs.opex_items?.reduce((sum, item) => sum + item.amount, 0) || 0;

      return {
        ...inputs,
        capex_per_mw: totalCapex / inputs.capacity,
        om_cost_per_mw_year: totalOpex / inputs.capacity,
      };
    }

    // Validate required fields if not using cost_items
    if (!inputs.capex_per_mw || inputs.capex_per_mw <= 0) {
      throw new Error('capex_per_mw is required and must be greater than 0');
    }
    if (!inputs.om_cost_per_mw_year || inputs.om_cost_per_mw_year <= 0) {
      throw new Error('om_cost_per_mw_year is required and must be greater than 0');
    }

    return inputs;
  }

  // =================================================================
  // INTERMEDIATE CALCULATIONS
  // =================================================================

  calcCapacityFactor(): number {
    return this.inputs.p50_year_0_yield / (this.inputs.capacity * 8760);
  }

  calcTotalCapEx(): number {
    return this.inputs.capacity * this.inputs.capex_per_mw!;
  }

  calcEnergyYearT(year: number): number {
    return this.inputs.p50_year_0_yield * Math.pow(1 - this.inputs.degradation_rate, year - 1);
  }

  calcRevenueYearT(year: number): number {
    const energy = this.calcEnergyYearT(year);
    return energy * this.inputs.ppa_price * Math.pow(1 + this.inputs.ppa_escalation, year - 1);
  }

  calcOMYearT(year: number): number {
    return this.inputs.capacity * this.inputs.om_cost_per_mw_year! *
           Math.pow(1 + this.inputs.om_escalation, year - 1);
  }

  calcEBITDAYearT(year: number): number {
    const revenue = this.calcRevenueYearT(year);
    const om = this.calcOMYearT(year);
    return revenue - om;
  }

  calcCFADSYearT(year: number): number {
    const ebitda = this.calcEBITDAYearT(year);
    return ebitda * (1 - this.inputs.tax_rate);
  }

  calcPVofCFADS(): number {
    let pvTotal = 0;
    for (let year = 1; year <= this.inputs.debt_tenor; year++) {
      const cfads = this.calcCFADSYearT(year);
      const discountFactor = Math.pow(1 + this.inputs.interest_rate, year);
      pvTotal += cfads / discountFactor;
    }
    return pvTotal;
  }

  calcMaxDebtByDSCR(): number {
    const pvCfads = this.calcPVofCFADS();
    return pvCfads / this.inputs.target_dscr;
  }

  calcMaxDebtByGearing(): number {
    const totalCapex = this.calcTotalCapEx();
    return totalCapex * this.inputs.gearing_ratio;
  }

  calcFinalDebt(): number {
    const maxDebtDSCR = this.calcMaxDebtByDSCR();
    const maxDebtGearing = this.calcMaxDebtByGearing();
    return Math.min(maxDebtDSCR, maxDebtGearing);
  }

  calcEquity(): number {
    const totalCapex = this.calcTotalCapEx();
    const finalDebt = this.calcFinalDebt();
    return totalCapex - finalDebt;
  }

  calcAnnualDebtService(): number {
    const finalDebt = this.calcFinalDebt();
    return -pmt(
      this.inputs.interest_rate,
      this.inputs.debt_tenor,
      finalDebt,
      0
    );
  }

  calcFCFtoEquityYearT(year: number): number {
    const cfads = this.calcCFADSYearT(year);

    if (year <= this.inputs.debt_tenor) {
      const annualDS = this.calcAnnualDebtService();
      return cfads - annualDS;
    } else {
      return cfads;
    }
  }

  calcNPVofCosts(): number {
    const totalCapex = this.calcTotalCapEx();
    let pvOM = 0;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const om = this.calcOMYearT(year);
      const discountFactor = Math.pow(1 + this.inputs.discount_rate, year);
      pvOM += om / discountFactor;
    }

    return totalCapex + pvOM;
  }

  calcNPVofEnergy(): number {
    let pvEnergy = 0;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const energy = this.calcEnergyYearT(year);
      const discountFactor = Math.pow(1 + this.inputs.discount_rate, year);
      pvEnergy += energy / discountFactor;
    }

    return pvEnergy;
  }

  calcDSCRYearT(year: number): number | null {
    if (year > this.inputs.debt_tenor) {
      return null;
    }

    const cfads = this.calcCFADSYearT(year);
    const annualDS = this.calcAnnualDebtService();

    if (annualDS === 0) {
      return null;
    }

    return cfads / annualDS;
  }

  // =================================================================
  // KEY OUTPUTS
  // =================================================================

  calcProjectIRR(): number {
    const cashFlows: number[] = [];
    const totalCapex = this.calcTotalCapEx();
    cashFlows.push(-totalCapex);

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const cfads = this.calcCFADSYearT(year);
      cashFlows.push(cfads);
    }

    return irr(cashFlows);
  }

  calcEquityIRR(): number {
    const cashFlows: number[] = [];
    const equity = this.calcEquity();
    cashFlows.push(-equity);

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const fcf = this.calcFCFtoEquityYearT(year);
      cashFlows.push(fcf);
    }

    return irr(cashFlows);
  }

  calcLCOE(): number {
    const npvCosts = this.calcNPVofCosts();
    const npvEnergy = this.calcNPVofEnergy();
    return npvCosts / npvEnergy;
  }

  calcMinimumDSCR(): number | null {
    const dscrValues: number[] = [];
    for (let year = 1; year <= this.inputs.debt_tenor; year++) {
      const dscr = this.calcDSCRYearT(year);
      if (dscr !== null) {
        dscrValues.push(dscr);
      }
    }

    return dscrValues.length > 0 ? Math.min(...dscrValues) : null;
  }

  calcAverageDSCR(): number | null {
    const dscrValues: number[] = [];
    for (let year = 1; year <= this.inputs.debt_tenor; year++) {
      const dscr = this.calcDSCRYearT(year);
      if (dscr !== null) {
        dscrValues.push(dscr);
      }
    }

    if (dscrValues.length === 0) {
      return null;
    }

    const sum = dscrValues.reduce((a, b) => a + b, 0);
    return sum / dscrValues.length;
  }

  calcProjectNPV(): number {
    const totalCapex = this.calcTotalCapEx();
    let pvCfads = 0;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const cfads = this.calcCFADSYearT(year);
      const discountFactor = Math.pow(1 + this.inputs.discount_rate, year);
      pvCfads += cfads / discountFactor;
    }

    return -totalCapex + pvCfads;
  }

  calcEquityPaybackPeriod(): number | null {
    const equity = this.calcEquity();
    let cumulativeFCF = -equity;
    let prevCumulative = cumulativeFCF;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const fcf = this.calcFCFtoEquityYearT(year);
      prevCumulative = cumulativeFCF;
      cumulativeFCF += fcf;

      if (prevCumulative < 0 && cumulativeFCF >= 0) {
        const fraction = -prevCumulative / fcf;
        return year - 1 + fraction;
      }
    }

    return cumulativeFCF >= 0 ? this.inputs.project_lifetime : null;
  }

  calcProjectPaybackPeriod(): number | null {
    const totalCapex = this.calcTotalCapEx();
    let cumulativeCFADS = 0;
    let prevCumulative = 0;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const cfads = this.calcCFADSYearT(year);
      prevCumulative = cumulativeCFADS;
      cumulativeCFADS += cfads;

      if (prevCumulative < totalCapex && cumulativeCFADS >= totalCapex) {
        const fraction = (totalCapex - prevCumulative) / cfads;
        return year - 1 + fraction;
      }
    }

    return cumulativeCFADS >= totalCapex ? this.inputs.project_lifetime : null;
  }

  // =================================================================
  // MONTHLY CALCULATIONS
  // =================================================================

  calcEnergyMonthT(year: number, month: number): number {
    const annualEnergy = this.calcEnergyYearT(year);
    const seasonalFactor = NORTHERN_HEMISPHERE_MONTHLY_FACTORS[month - 1];
    return annualEnergy * seasonalFactor;
  }

  calcRevenueMonthT(year: number, month: number): number {
    const monthlyEnergy = this.calcEnergyMonthT(year, month);
    const ppaPriceYear = this.inputs.ppa_price * Math.pow(1 + this.inputs.ppa_escalation, year - 1);
    return monthlyEnergy * ppaPriceYear;
  }

  calcOMMonthT(year: number): number {
    const annualOM = this.calcOMYearT(year);
    return annualOM / 12;
  }

  calcEBITDAMonthT(year: number, month: number): number {
    const monthlyRevenue = this.calcRevenueMonthT(year, month);
    const monthlyOM = this.calcOMMonthT(year);
    return monthlyRevenue - monthlyOM;
  }

  calcCFADSMonthT(year: number, month: number): number {
    const monthlyEBITDA = this.calcEBITDAMonthT(year, month);
    return monthlyEBITDA * (1 - this.inputs.tax_rate);
  }

  calcDebtServiceMonthT(year: number): number {
    if (year > this.inputs.debt_tenor) {
      return 0;
    }
    const annualDS = this.calcAnnualDebtService();
    return annualDS / 12;
  }

  calcFCFtoEquityMonthT(year: number, month: number): number {
    const monthlyCFADS = this.calcCFADSMonthT(year, month);
    const monthlyDS = this.calcDebtServiceMonthT(year);
    return monthlyCFADS - monthlyDS;
  }

  // =================================================================
  // REPORT GENERATION
  // =================================================================

  generateYearlyData(): YearlyData {
    const years = Array.from({ length: this.inputs.project_lifetime }, (_, i) => i + 1);
    const annualDebtService = this.calcAnnualDebtService();

    const energyProductionMwh: number[] = [];
    const revenue: number[] = [];
    const omCosts: number[] = [];
    const ebitda: number[] = [];
    const cfads: number[] = [];
    const fcfToEquity: number[] = [];
    const debtService: number[] = [];
    const dscr: (number | null)[] = [];
    const cumulativeFCFToEquity: number[] = [];

    const equity = this.calcEquity();
    let cumulativeFCF = -equity;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      energyProductionMwh.push(this.calcEnergyYearT(year));
      revenue.push(this.calcRevenueYearT(year));
      omCosts.push(this.calcOMYearT(year));
      ebitda.push(this.calcEBITDAYearT(year));
      cfads.push(this.calcCFADSYearT(year));

      const fcf = this.calcFCFtoEquityYearT(year);
      fcfToEquity.push(fcf);
      cumulativeFCF += fcf;
      cumulativeFCFToEquity.push(cumulativeFCF);

      if (year <= this.inputs.debt_tenor) {
        debtService.push(annualDebtService);
        dscr.push(this.calcDSCRYearT(year));
      } else {
        debtService.push(0);
        dscr.push(null);
      }
    }

    return {
      years,
      energy_production_mwh: energyProductionMwh,
      revenue,
      om_costs: omCosts,
      ebitda,
      cfads,
      fcf_to_equity: fcfToEquity,
      debt_service: debtService,
      dscr,
      cumulative_fcf_to_equity: cumulativeFCFToEquity,
    };
  }

  generateMonthlyData(): MonthlyDataPoint[] {
    const monthlyData: MonthlyDataPoint[] = [];
    const equity = this.calcEquity();
    let cumulativeFCF = -equity;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      for (let month = 1; month <= 12; month++) {
        const fcf = this.calcFCFtoEquityMonthT(year, month);
        cumulativeFCF += fcf;

        monthlyData.push({
          year,
          month,
          month_name: MONTH_NAMES[month - 1],
          energy_production_mwh: this.calcEnergyMonthT(year, month),
          revenue: this.calcRevenueMonthT(year, month),
          om_costs: this.calcOMMonthT(year),
          ebitda: this.calcEBITDAMonthT(year, month),
          cfads: this.calcCFADSMonthT(year, month),
          debt_service: this.calcDebtServiceMonthT(year),
          fcf_to_equity: fcf,
          cumulative_fcf_to_equity: cumulativeFCF,
        });
      }
    }

    return monthlyData;
  }

  private assessProject(projectIRR: number, equityIRR: number, minDSCR: number | null): Assessment {
    const projectIRRPct = projectIRR * 100;
    const equityIRRPct = equityIRR * 100;

    let projectIRRStatus: string;
    if (projectIRRPct >= 8) {
      projectIRRStatus = `Strong at ${projectIRRPct.toFixed(2)}% (target: >8%)`;
    } else if (projectIRRPct >= 6) {
      projectIRRStatus = `Acceptable at ${projectIRRPct.toFixed(2)}% (target: >8%)`;
    } else {
      projectIRRStatus = `Weak at ${projectIRRPct.toFixed(2)}% (target: >8%)`;
    }

    let equityIRRStatus: string;
    if (equityIRRPct >= 12) {
      equityIRRStatus = `Strong at ${equityIRRPct.toFixed(2)}% (target: >12%)`;
    } else if (equityIRRPct >= 10) {
      equityIRRStatus = `Acceptable at ${equityIRRPct.toFixed(2)}% (target: >12%)`;
    } else {
      equityIRRStatus = `Weak at ${equityIRRPct.toFixed(2)}% (target: >12%)`;
    }

    let dscrStatus: string;
    if (minDSCR === null) {
      dscrStatus = 'No debt';
    } else if (minDSCR >= 1.35) {
      dscrStatus = `Strong at ${minDSCR.toFixed(2)}x (minimum: >1.30x)`;
    } else if (minDSCR >= 1.20) {
      dscrStatus = `Acceptable at ${minDSCR.toFixed(2)}x (minimum: >1.30x)`;
    } else {
      dscrStatus = `Weak at ${minDSCR.toFixed(2)}x (minimum: >1.30x)`;
    }

    const strongCount = (projectIRRPct >= 8 ? 1 : 0) +
                       (equityIRRPct >= 12 ? 1 : 0) +
                       (minDSCR !== null && minDSCR >= 1.35 ? 1 : 0);

    let overall: string;
    if (strongCount === 3) {
      overall = 'Project shows strong financials across all key metrics. Recommended for investment.';
    } else if (strongCount >= 2) {
      overall = 'Project shows acceptable financials with room for improvement. Consider optimization.';
    } else {
      overall = 'Project financials are below targets. Review assumptions and consider restructuring.';
    }

    return {
      project_irr: projectIRRStatus,
      equity_irr: equityIRRStatus,
      dscr: dscrStatus,
      overall,
    };
  }

  /**
   * Calculate all results and return ProjectResults
   */
  calculate(): ProjectResults {
    const totalCapex = this.calcTotalCapEx();
    const finalDebt = this.calcFinalDebt();
    const equity = this.calcEquity();
    const maxDebtDSCR = this.calcMaxDebtByDSCR();
    const maxDebtGearing = this.calcMaxDebtByGearing();

    const bindingConstraint = maxDebtDSCR < maxDebtGearing ? 'DSCR' : 'Gearing';

    const projectIRR = this.calcProjectIRR();
    const equityIRR = this.calcEquityIRR();
    const lcoe = this.calcLCOE();
    const minDSCR = this.calcMinimumDSCR();
    const avgDSCR = this.calcAverageDSCR();
    const projectNPV = this.calcProjectNPV();

    const year1Energy = this.calcEnergyYearT(1);
    const year1Revenue = this.calcRevenueYearT(1);
    const year1OM = this.calcOMYearT(1);
    const year1EBITDA = this.calcEBITDAYearT(1);
    const year1CFADS = this.calcCFADSYearT(1);

    const projectSummary: ProjectSummary = {
      capacity_mw: this.inputs.capacity,
      capacity_factor: this.calcCapacityFactor(),
      p50_year_0_yield_mwh: this.inputs.p50_year_0_yield,
      project_lifetime: this.inputs.project_lifetime,
      total_capex: totalCapex,
      capex_per_mw: this.inputs.capex_per_mw!,
    };

    const financingStructure: FinancingStructure = {
      max_debt_by_dscr: maxDebtDSCR,
      max_debt_by_gearing: maxDebtGearing,
      final_debt: finalDebt,
      equity: equity,
      actual_gearing: finalDebt / totalCapex,
      binding_constraint: bindingConstraint,
      interest_rate: this.inputs.interest_rate,
      debt_tenor: this.inputs.debt_tenor,
      annual_debt_service: this.calcAnnualDebtService(),
    };

    const keyMetrics: KeyMetrics = {
      project_irr: projectIRR,
      equity_irr: equityIRR,
      lcoe: lcoe,
      min_dscr: minDSCR!,
      avg_dscr: avgDSCR!,
      project_npv: projectNPV,
      ppa_price: this.inputs.ppa_price,
      equity_payback_years: this.calcEquityPaybackPeriod(),
      project_payback_years: this.calcProjectPaybackPeriod(),
    };

    const firstYearOperations: FirstYearOperations = {
      energy_production_mwh: year1Energy,
      revenue: year1Revenue,
      om_costs: year1OM,
      ebitda: year1EBITDA,
      cfads: year1CFADS,
    };

    const assessment = this.assessProject(projectIRR, equityIRR, minDSCR);
    const yearlyData = this.generateYearlyData();
    const monthlyData = this.generateMonthlyData();

    return {
      project_summary: projectSummary,
      financing_structure: financingStructure,
      key_metrics: keyMetrics,
      first_year_operations: firstYearOperations,
      assessment: assessment,
      yearly_data: yearlyData,
      monthly_data: monthlyData,
    };
  }
}
