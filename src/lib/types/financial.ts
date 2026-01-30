import type { YieldEstimate } from '@/lib/yield/types';

// Cost line item types (adapted from pvfinance)
export interface CostLineItem {
  id: string; // Added for editing in UI
  name: string;
  amount: number; // For OpEx: total amount. For CapEx: calculated from unit_price × quantity
  is_capex: boolean;
  category: string; // Category grouping for UI organization
  // CapEx-specific fields
  unit_price?: number; // Price per item (CapEx only)
  quantity?: number; // Number of items (CapEx only)
  unit?: string; // Display unit (e.g., "MW", "panels", "meters")
  margin_percent?: number; // CapEx-only: margin override (uses global if undefined)
  // Source tracking (for BOQ migration and component library integration)
  source?: 'manual' | 'dxf_extraction' | 'component_library';
  sourceId?: string; // Component ID if from component_library, or BOQ ID for migrated items
}

// Financial model inputs
export interface FinancialInputs {
  // Required inputs
  capacity: number;
  p50_year_0_yield: number; // MWh - Year 0/Year 1 energy production
  capex_per_mw?: number; // Optional if using cost_items
  ppa_price: number;
  om_cost_per_mw_year?: number; // Optional if using cost_items

  // Cost line items (detailed mode)
  capex_items: CostLineItem[];
  opex_items: CostLineItem[];
  global_margin: number; // CapEx margin percentage

  // Technical parameters
  degradation_rate: number;

  // Economic parameters
  ppa_escalation: number;
  om_escalation: number;

  // Financing parameters
  gearing_ratio: number;
  interest_rate: number;
  debt_tenor: number;
  target_dscr: number;

  // Project timeline
  project_lifetime: number;

  // Tax and discount
  tax_rate: number;
  discount_rate: number;

  // Yield estimation (optional - calculated from location)
  yieldEstimate?: YieldEstimate;

  // Links to design/site for location data (optional)
  designId?: string;
  siteId?: string;
}

// Project results types
export interface ProjectSummary {
  capacity_mw: number;
  capacity_factor: number;
  p50_year_0_yield_mwh: number;
  project_lifetime: number;
  total_capex: number;
  capex_per_mw: number;
}

export interface FinancingStructure {
  max_debt_by_dscr: number;
  max_debt_by_gearing: number;
  final_debt: number;
  equity: number;
  actual_gearing: number;
  binding_constraint: string;
  interest_rate: number;
  debt_tenor: number;
  annual_debt_service: number;
}

export interface KeyMetrics {
  project_irr: number;
  equity_irr: number;
  lcoe: number;
  min_dscr: number;
  avg_dscr: number;
  project_npv: number;
  ppa_price: number;
  equity_payback_years: number | null;
  project_payback_years: number | null;
}

export interface FirstYearOperations {
  energy_production_mwh: number;
  revenue: number;
  om_costs: number;
  ebitda: number;
  cfads: number;
}

export interface Assessment {
  project_irr: string;
  equity_irr: string;
  dscr: string;
  overall: string;
}

export interface CostItemsBreakdown {
  items: CostLineItem[];
  total_capex: number;
  total_opex_year_1: number;
}

export interface YearlyData {
  years: number[];
  energy_production_mwh: number[];
  revenue: number[];
  om_costs: number[];
  ebitda: number[];
  cfads: number[];
  fcf_to_equity: number[];
  debt_service: number[];
  dscr: (number | null)[];
  cumulative_fcf_to_equity: number[];
}

export interface MonthlyDataPoint {
  year: number;
  month: number;
  month_name: string;
  energy_production_mwh: number;
  revenue: number;
  om_costs: number;
  ebitda: number;
  cfads: number;
  debt_service: number;
  dscr: number | null;  // DSCR for this month (null if no debt service)
  fcf_to_equity: number;
  cumulative_fcf_to_equity: number;
}

export interface ProjectResults {
  project_summary: ProjectSummary;
  financing_structure: FinancingStructure;
  key_metrics: KeyMetrics;
  first_year_operations: FirstYearOperations;
  assessment: Assessment;
  cost_items_breakdown?: CostItemsBreakdown;
  yearly_data?: YearlyData;
  monthly_data?: MonthlyDataPoint[];
}

// ============================================================================
// NEW ARCHITECTURE: Design-Level Financial Models
// ============================================================================

// Financing parameters (extracted from FinancialInputs for design-level control)
export interface FinancingParameters {
  gearing_ratio: number;
  interest_rate: number;
  debt_tenor: number;
  target_dscr: number;
}

// Project-level default financial assumptions
export interface DefaultFinancialAssumptions {
  ppa_escalation: number;
  om_escalation: number;
  degradation_rate: number;
  tax_rate: number;
  discount_rate: number;
  project_lifetime: number;
}

// Project Financial Settings - parent container for project-level defaults
export interface ProjectFinancialSettings {
  id: string;
  projectId: string; // Foreign key to Project (1:1)

  // Default assumptions applied to new design financial models
  defaultAssumptions: DefaultFinancialAssumptions;

  // Winner design selection
  winnerDesignId?: string; // FK to Design - marks the financially optimal design

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Design Financial Model - design-scoped financial analysis (NEW)
export interface DesignFinancialModel {
  id: string;
  designId: string;     // Foreign key to Design (1:1) - PRIMARY RELATIONSHIP
  projectId: string;    // Denormalized for efficient project-level queries
  name: string;

  // Core capacity and yield inputs
  capacity: number;           // MW
  p50_year_0_yield: number;   // MWh - Year 0/Year 1 energy production
  ppa_price: number;          // $/MWh

  // CAPEX line items (replaces/merges BOQ functionality)
  capex: CostLineItem[];
  global_margin: number;      // CAPEX margin percentage

  // OPEX line items (design-specific operating costs)
  opex: CostLineItem[];

  // Technical/Economic parameters (can inherit from project defaults or override)
  degradation_rate: number;
  ppa_escalation: number;
  om_escalation: number;
  tax_rate: number;
  discount_rate: number;
  project_lifetime: number;

  // Financing parameters (design-specific)
  financing: FinancingParameters;

  // Yield estimation (optional - calculated from location)
  yieldEstimate?: YieldEstimate;

  // Cached calculation results
  results?: ProjectResults;

  // Winner flag (denormalized for fast filtering)
  isWinner: boolean;

  // Metadata
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// LEGACY ARCHITECTURE: Project-Level Financial Models (Deprecated)
// ============================================================================
// These types are kept for backward compatibility during migration.
// They will be removed in a future version after all data is migrated.

// Financial Model entity (linked to a Project) - DEPRECATED
export interface FinancialModel {
  id: string;
  projectId: string; // Foreign key to Project
  name: string;
  inputs: FinancialInputs;
  results?: ProjectResults; // Cached calculation results
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

// Default financing parameters
export const DEFAULT_FINANCING_PARAMETERS: FinancingParameters = {
  gearing_ratio: 0.75,
  interest_rate: 0.045,
  debt_tenor: 15,
  target_dscr: 1.30,
};

// Default financial assumptions for projects
export const DEFAULT_FINANCIAL_ASSUMPTIONS: DefaultFinancialAssumptions = {
  ppa_escalation: 0.0,
  om_escalation: 0.01,
  degradation_rate: 0.004,
  tax_rate: 0.25,
  discount_rate: 0.08,
  project_lifetime: 25,
};

// Default values for 300 MW utility-scale ground mount project
// P50 Year 0 Yield calculated as: 300 MW × 0.22 CF × 8760 hours = 577,920 MWh
export const DEFAULT_FINANCIAL_INPUTS: FinancialInputs = {
  capacity: 300,
  p50_year_0_yield: 577_920, // MWh
  capex_per_mw: 850_000,
  ppa_price: 65,
  om_cost_per_mw_year: 12_000,
  capex_items: [],
  opex_items: [],
  global_margin: 0,
  degradation_rate: 0.004,
  ppa_escalation: 0.0,
  om_escalation: 0.01,
  gearing_ratio: 0.75,
  interest_rate: 0.045,
  debt_tenor: 15,
  target_dscr: 1.30,
  project_lifetime: 25,
  tax_rate: 0.25,
  discount_rate: 0.08,
};
