/**
 * Yield Calculation Types
 *
 * Types for location-based solar yield estimation using PVGIS API
 * with offline fallback via latitude-based GHI lookup tables.
 */

/** Source of the yield estimate */
export type YieldSource = 'manual' | 'pvgis' | 'lookup';

/** Yield estimate stored in financial model */
export interface YieldEstimate {
  // Source tracking
  source: YieldSource;
  calculatedAt: string;           // ISO date

  // Location used for calculation
  latitude: number;
  longitude: number;

  // System configuration used
  tiltAngle: number;              // degrees (0 = horizontal)
  azimuth: number;                // degrees (0 = south in NH, 180 = south in SH)
  systemLosses: number;           // % (typically 10-20%)

  // Results
  annualYield: number;            // kWh/year for the system
  annualGHI: number;              // kWh/m²/year (Global Horizontal Irradiance)
  annualPOA?: number;             // kWh/m²/year (Plane of Array irradiance)
  monthlyYield: number[];         // 12 values in kWh
  monthlyFactors: number[];       // 12 values summing to 1.0 (for financial calc)
  performanceRatio: number;       // 0-1 (typically 0.75-0.85)

  // Loss breakdown (for transparency)
  losses: YieldLossBreakdown;

  // Component used for calculation (if any)
  componentId?: string;
}

/** Breakdown of system losses */
export interface YieldLossBreakdown {
  temperatureLoss: number;        // % loss from cell temperature > 25°C
  soilingLoss: number;            // % loss from dust/dirt
  shadingLoss: number;            // % loss from shading
  wiringLoss: number;             // % loss from DC/AC wiring
  mismatchLoss: number;           // % loss from module mismatch
  inverterLoss: number;           // % loss from inverter efficiency
  availabilityLoss: number;       // % loss from downtime
  otherLoss: number;              // % other losses
  totalLoss: number;              // Combined loss %
}

/** Input parameters for yield calculation */
export interface YieldCalculationInput {
  // Location (required)
  latitude: number;
  longitude: number;

  // System specs (required)
  capacityKwp: number;            // System capacity in kWp

  // System configuration (optional, defaults provided)
  tiltAngle?: number;             // Default: latitude (optimal for fixed tilt)
  azimuth?: number;               // Default: 180 (south) for NH, 0 (north) for SH
  systemLosses?: number;          // Default: 14%

  // Component linking (optional, for detailed losses)
  moduleSpecs?: {
    tempCoeffPmax: number;        // %/°C (e.g., -0.35)
    noct?: number;                // Nominal Operating Cell Temperature (°C)
  };
  inverterEfficiency?: number;    // % (e.g., 97)

  // Environmental assumptions (optional)
  avgAmbientTemp?: number;        // °C (will be estimated if not provided)
  soilingLoss?: number;           // % (default: 2)
  shadingLoss?: number;           // % (default: 3)
}

/** Result from yield calculation */
export interface YieldCalculationResult {
  success: boolean;
  source: YieldSource;
  estimate?: YieldEstimate;
  error?: string;
}

/** PVGIS API response structure (simplified) */
export interface PVGISResponse {
  inputs: {
    location: {
      latitude: number;
      longitude: number;
      elevation: number;
    };
    mounting_system: {
      fixed: {
        slope: { value: number };
        azimuth: { value: number };
      };
    };
  };
  outputs: {
    totals: {
      fixed: {
        E_y: number;              // Annual yield (kWh)
        E_d: number;              // Average daily yield (kWh)
        H_i_y: number;            // Annual irradiance on tilted plane (kWh/m²)
        SD_y: number;             // Standard deviation of annual yield
      };
    };
    monthly: {
      fixed: Array<{
        month: number;
        E_m: number;              // Monthly yield (kWh)
        H_i_m: number;            // Monthly irradiance on tilted plane (kWh/m²)
        SD_m: number;             // Standard deviation
      }>;
    };
  };
}

/** GHI lookup table entry */
export interface GHILookupEntry {
  latitudeMin: number;
  latitudeMax: number;
  annualGHI: number;              // kWh/m²/year
  monthlyFactors: number[];       // 12 values summing to 1.0
  avgTemp: number;                // Average ambient temperature (°C)
  description: string;            // e.g., "Tropical", "Temperate", etc.
}

/** Cache entry for PVGIS responses */
export interface YieldCacheEntry {
  key: string;                    // lat_lon_tilt_azimuth_capacity
  response: PVGISResponse;
  timestamp: number;              // Unix timestamp
  expiresAt: number;              // Unix timestamp (cache for 30 days)
}

/** Default loss assumptions */
export const DEFAULT_LOSSES = {
  soiling: 2,                     // %
  shading: 3,                     // %
  wiring: 2,                      // %
  mismatch: 2,                    // %
  inverter: 3,                    // % (97% efficiency)
  availability: 3,                // %
  other: 0,                       // %
} as const;

/** Default system configuration */
export const DEFAULT_SYSTEM_CONFIG = {
  systemLosses: 14,               // % (PVGIS default)
  tempCoeffPmax: -0.35,           // %/°C (typical mono-Si)
  noct: 45,                       // °C (Nominal Operating Cell Temperature)
  inverterEfficiency: 97,         // %
} as const;

/** Cache configuration */
export const CACHE_CONFIG = {
  ttlDays: 30,                    // Cache PVGIS responses for 30 days
  maxEntries: 100,                // Maximum cache entries
  storageKey: 'yield-calculation-cache',
} as const;
