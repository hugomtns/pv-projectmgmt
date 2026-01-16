/**
 * Yield Calculator
 *
 * Main orchestration module that combines PVGIS API, offline lookup tables,
 * and performance ratio calculations to produce yield estimates.
 *
 * Usage:
 * ```typescript
 * const result = await calculateYield({
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 *   capacityKwp: 1000,
 * });
 *
 * if (result.success) {
 *   console.log(`Annual yield: ${result.estimate.annualYield} kWh`);
 * }
 * ```
 */

import type {
  YieldCalculationInput,
  YieldCalculationResult,
  YieldEstimate,
  YieldSource,
} from './types';
import { DEFAULT_SYSTEM_CONFIG } from './types';
import { fetchPVGIS, extractYieldData, isPVGISCoverageArea } from './pvgisClient';
import { estimateYieldFromLookup, getOptimalTilt, getOptimalAzimuth, isValidCoordinates } from './ghiLookup';
import { calculatePerformanceRatio } from './performanceRatio';

/**
 * Calculate solar yield for a PV system.
 *
 * This is the main entry point for yield estimation. It:
 * 1. Validates inputs
 * 2. Tries PVGIS API first (if location is likely covered)
 * 3. Falls back to lookup table if PVGIS fails
 * 4. Calculates performance ratio from component specs
 * 5. Returns a complete YieldEstimate
 *
 * @param input - Calculation inputs
 * @returns Calculation result with estimate or error
 */
export async function calculateYield(
  input: YieldCalculationInput
): Promise<YieldCalculationResult> {
  console.log('[YieldCalc] calculateYield called', input);

  // Validate coordinates
  if (!isValidCoordinates(input.latitude, input.longitude)) {
    console.log('[YieldCalc] Invalid coordinates');
    return {
      success: false,
      source: 'manual',
      error: 'Invalid coordinates provided',
    };
  }

  // Validate capacity
  if (!input.capacityKwp || input.capacityKwp <= 0) {
    console.log('[YieldCalc] Invalid capacity');
    return {
      success: false,
      source: 'manual',
      error: 'System capacity must be greater than 0',
    };
  }

  // Determine system configuration
  const tiltAngle = input.tiltAngle ?? getOptimalTilt(input.latitude);
  const azimuth = input.azimuth ?? getOptimalAzimuth(input.latitude);
  const systemLosses = input.systemLosses ?? DEFAULT_SYSTEM_CONFIG.systemLosses;
  console.log('[YieldCalc] Config:', { tiltAngle, azimuth, systemLosses });

  // Calculate performance ratio from component specs
  const prResult = calculatePerformanceRatio({
    tempCoeffPmax: input.moduleSpecs?.tempCoeffPmax,
    noct: input.moduleSpecs?.noct,
    inverterEfficiency: input.inverterEfficiency,
    avgAmbientTemp: input.avgAmbientTemp,
    soilingLoss: input.soilingLoss,
    shadingLoss: input.shadingLoss,
  });
  console.log('[YieldCalc] PR result:', prResult);

  // Try PVGIS API first
  console.log('[YieldCalc] Trying PVGIS...');
  const pvgisResult = await tryPVGIS(input, tiltAngle, azimuth, systemLosses);
  console.log('[YieldCalc] PVGIS result:', pvgisResult);

  if (pvgisResult.success && pvgisResult.estimate) {
    // Enhance PVGIS result with our PR calculation details
    return {
      success: true,
      source: 'pvgis',
      estimate: {
        ...pvgisResult.estimate,
        performanceRatio: prResult.performanceRatio,
        losses: prResult.losses,
      },
    };
  }

  // Fall back to lookup table
  console.log('[YieldCalc] Trying lookup table...');
  const lookupResult = tryLookupTable(
    input,
    tiltAngle,
    azimuth,
    systemLosses,
    prResult.performanceRatio,
    prResult.losses
  );
  console.log('[YieldCalc] Lookup result:', lookupResult);

  if (lookupResult.success) {
    return lookupResult;
  }

  // Both methods failed
  return {
    success: false,
    source: 'manual',
    error: pvgisResult.error || lookupResult.error || 'Failed to calculate yield',
  };
}

/**
 * Try to get yield estimate from PVGIS API.
 */
async function tryPVGIS(
  input: YieldCalculationInput,
  tiltAngle: number,
  azimuth: number,
  systemLosses: number
): Promise<YieldCalculationResult> {
  // Check if location is likely covered
  if (!isPVGISCoverageArea(input.latitude, input.longitude)) {
    return {
      success: false,
      source: 'pvgis',
      error: 'Location is outside PVGIS coverage area',
    };
  }

  try {
    const response = await fetchPVGIS({
      latitude: input.latitude,
      longitude: input.longitude,
      peakPower: input.capacityKwp,
      systemLoss: systemLosses,
      tiltAngle,
      // PVGIS uses different azimuth convention: 0=south, positive=west
      // Our convention: 180=south (like compass), so convert
      azimuth: azimuth - 180,
    });

    const yieldData = extractYieldData(response);

    // Calculate monthly factors (normalize to sum to 1)
    const totalMonthly = yieldData.monthlyYield.reduce((a, b) => a + b, 0);
    const monthlyFactors = yieldData.monthlyYield.map(m => m / totalMonthly);

    // Estimate GHI from POA irradiance (rough approximation)
    // GHI ≈ POA for near-optimal tilt angles
    const annualGHI = yieldData.annualIrradiance;

    // Calculate PR from PVGIS data
    // PR = E_actual / (GHI × Capacity)
    const impliedPR = yieldData.annualYield / (annualGHI * input.capacityKwp);

    const estimate: YieldEstimate = {
      source: 'pvgis',
      calculatedAt: new Date().toISOString(),
      latitude: input.latitude,
      longitude: input.longitude,
      tiltAngle,
      azimuth,
      systemLosses,
      annualYield: yieldData.annualYield,
      annualGHI,
      annualPOA: yieldData.annualIrradiance,
      monthlyYield: yieldData.monthlyYield,
      monthlyFactors,
      performanceRatio: impliedPR,
      losses: {
        temperatureLoss: 0, // Will be filled in by caller
        soilingLoss: 0,
        shadingLoss: 0,
        wiringLoss: 0,
        mismatchLoss: 0,
        inverterLoss: 0,
        availabilityLoss: 0,
        otherLoss: 0,
        totalLoss: (1 - impliedPR) * 100,
      },
    };

    return {
      success: true,
      source: 'pvgis',
      estimate,
    };
  } catch (error) {
    return {
      success: false,
      source: 'pvgis',
      error: error instanceof Error ? error.message : 'PVGIS API request failed',
    };
  }
}

/**
 * Calculate yield using offline lookup table.
 */
function tryLookupTable(
  input: YieldCalculationInput,
  tiltAngle: number,
  azimuth: number,
  systemLosses: number,
  performanceRatio: number,
  losses: YieldEstimate['losses']
): YieldCalculationResult {
  try {
    const lookupData = estimateYieldFromLookup(
      input.latitude,
      input.capacityKwp,
      performanceRatio
    );

    const estimate: YieldEstimate = {
      source: 'lookup',
      calculatedAt: new Date().toISOString(),
      latitude: input.latitude,
      longitude: input.longitude,
      tiltAngle,
      azimuth,
      systemLosses,
      annualYield: lookupData.annualYield,
      annualGHI: lookupData.annualGHI,
      monthlyYield: lookupData.monthlyYield,
      monthlyFactors: lookupData.monthlyFactors,
      performanceRatio,
      losses,
    };

    return {
      success: true,
      source: 'lookup',
      estimate,
    };
  } catch (error) {
    return {
      success: false,
      source: 'lookup',
      error: error instanceof Error ? error.message : 'Lookup table calculation failed',
    };
  }
}

/**
 * Calculate yield using only the lookup table (no API call).
 *
 * Use this for instant offline estimates or when you want to avoid API calls.
 *
 * @param input - Calculation inputs
 * @returns Calculation result
 */
export function calculateYieldOffline(
  input: YieldCalculationInput
): YieldCalculationResult {
  // Validate coordinates
  if (!isValidCoordinates(input.latitude, input.longitude)) {
    return {
      success: false,
      source: 'lookup',
      error: 'Invalid coordinates provided',
    };
  }

  // Validate capacity
  if (!input.capacityKwp || input.capacityKwp <= 0) {
    return {
      success: false,
      source: 'lookup',
      error: 'System capacity must be greater than 0',
    };
  }

  // Determine system configuration
  const tiltAngle = input.tiltAngle ?? getOptimalTilt(input.latitude);
  const azimuth = input.azimuth ?? getOptimalAzimuth(input.latitude);
  const systemLosses = input.systemLosses ?? DEFAULT_SYSTEM_CONFIG.systemLosses;

  // Calculate performance ratio
  const prResult = calculatePerformanceRatio({
    tempCoeffPmax: input.moduleSpecs?.tempCoeffPmax,
    noct: input.moduleSpecs?.noct,
    inverterEfficiency: input.inverterEfficiency,
    avgAmbientTemp: input.avgAmbientTemp,
    soilingLoss: input.soilingLoss,
    shadingLoss: input.shadingLoss,
  });

  return tryLookupTable(
    input,
    tiltAngle,
    azimuth,
    systemLosses,
    prResult.performanceRatio,
    prResult.losses
  );
}

/**
 * Get a quick yield estimate for display purposes.
 *
 * This uses the lookup table only and returns a simplified result.
 *
 * @param latitude - Latitude in degrees
 * @param longitude - Longitude in degrees
 * @param capacityKwp - System capacity in kWp
 * @returns Simple yield estimate or null if calculation fails
 */
export function getQuickYieldEstimate(
  latitude: number,
  longitude: number,
  capacityKwp: number
): { annualYield: number; capacityFactor: number } | null {
  if (!isValidCoordinates(latitude, longitude) || capacityKwp <= 0) {
    return null;
  }

  try {
    const result = estimateYieldFromLookup(latitude, capacityKwp, 0.80);
    const hoursPerYear = 8760;
    const capacityFactor = result.annualYield / (capacityKwp * hoursPerYear);

    return {
      annualYield: result.annualYield,
      capacityFactor,
    };
  } catch {
    return null;
  }
}

/**
 * Convert annual yield to capacity factor.
 *
 * @param annualYield - Annual yield in kWh
 * @param capacityKwp - System capacity in kWp
 * @returns Capacity factor (0-1)
 */
export function yieldToCapacityFactor(
  annualYield: number,
  capacityKwp: number
): number {
  const hoursPerYear = 8760;
  return annualYield / (capacityKwp * hoursPerYear);
}

/**
 * Convert capacity factor to annual yield.
 *
 * @param capacityFactor - Capacity factor (0-1)
 * @param capacityKwp - System capacity in kWp
 * @returns Annual yield in kWh
 */
export function capacityFactorToYield(
  capacityFactor: number,
  capacityKwp: number
): number {
  const hoursPerYear = 8760;
  return capacityFactor * capacityKwp * hoursPerYear;
}

/**
 * Format yield for display with appropriate units.
 *
 * @param yieldKwh - Yield in kWh
 * @returns Formatted string with units
 */
export function formatYield(yieldKwh: number): string {
  if (yieldKwh >= 1_000_000) {
    return `${(yieldKwh / 1_000_000).toFixed(2)} GWh`;
  } else if (yieldKwh >= 1_000) {
    return `${(yieldKwh / 1_000).toFixed(1)} MWh`;
  } else {
    return `${yieldKwh.toFixed(0)} kWh`;
  }
}

/**
 * Get source description for display.
 */
export function getSourceDescription(source: YieldSource): string {
  switch (source) {
    case 'pvgis':
      return 'PVGIS (EU Joint Research Centre)';
    case 'lookup':
      return 'Estimated from latitude (offline)';
    case 'manual':
      return 'Manual entry';
    default:
      return 'Unknown';
  }
}
