/**
 * Performance Ratio Calculator
 *
 * Calculates system Performance Ratio (PR) based on module specs,
 * inverter efficiency, and environmental factors.
 *
 * PR = (1 - temperature_loss) × (1 - soiling) × (1 - shading) × ... × inverter_eff
 *
 * Typical PR values:
 * - Excellent systems: 0.82-0.86
 * - Good systems: 0.78-0.82
 * - Average systems: 0.74-0.78
 * - Poor systems: < 0.74
 */

import type { YieldLossBreakdown } from './types';
import { DEFAULT_LOSSES, DEFAULT_SYSTEM_CONFIG } from './types';

export interface PRCalculationInput {
  // Module specifications (optional)
  tempCoeffPmax?: number;         // %/°C (e.g., -0.35, negative value)
  noct?: number;                  // Nominal Operating Cell Temperature (°C)

  // Inverter specifications (optional)
  inverterEfficiency?: number;    // % (e.g., 97)

  // Environmental conditions
  avgAmbientTemp?: number;        // Annual average ambient temperature (°C)
  avgIrradiance?: number;         // Average irradiance during operation (W/m²)

  // Loss assumptions (optional, defaults provided)
  soilingLoss?: number;           // % (default: 2)
  shadingLoss?: number;           // % (default: 3)
  wiringLoss?: number;            // % (default: 2)
  mismatchLoss?: number;          // % (default: 2)
  availabilityLoss?: number;      // % (default: 3)
  otherLoss?: number;             // % (default: 0)
}

export interface PRCalculationResult {
  performanceRatio: number;       // 0-1
  losses: YieldLossBreakdown;
  cellTemperature: number;        // Estimated cell temperature (°C)
  assumptions: {
    tempCoeffUsed: number;
    noctUsed: number;
    inverterEffUsed: number;
    ambientTempUsed: number;
    irradianceUsed: number;
  };
}

/**
 * Calculate cell temperature from ambient temperature and irradiance.
 *
 * Uses the NOCT model:
 * T_cell = T_ambient + (NOCT - 20) × (G / 800)
 *
 * Where:
 * - NOCT: Nominal Operating Cell Temperature (typically 45°C)
 * - G: Irradiance in W/m²
 *
 * @param ambientTemp - Ambient temperature in °C
 * @param irradiance - Irradiance in W/m²
 * @param noct - Nominal Operating Cell Temperature in °C
 * @returns Estimated cell temperature in °C
 */
export function calculateCellTemperature(
  ambientTemp: number,
  irradiance: number,
  noct: number = DEFAULT_SYSTEM_CONFIG.noct
): number {
  return ambientTemp + ((noct - 20) * irradiance) / 800;
}

/**
 * Calculate temperature-related power loss.
 *
 * Power loss = (T_cell - 25) × tempCoeff
 *
 * @param cellTemp - Cell temperature in °C
 * @param tempCoeffPmax - Temperature coefficient of Pmax in %/°C (negative)
 * @returns Temperature loss as a percentage (0-100)
 */
export function calculateTemperatureLoss(
  cellTemp: number,
  tempCoeffPmax: number = DEFAULT_SYSTEM_CONFIG.tempCoeffPmax
): number {
  // Temperature above STC (25°C) causes loss
  const tempDelta = cellTemp - 25;

  // tempCoeff is typically negative (e.g., -0.35%/°C)
  // Loss = tempDelta × |tempCoeff|
  // If temp < 25°C, we get a "gain", but we cap at 0 loss
  const loss = tempDelta * Math.abs(tempCoeffPmax);

  // Return loss as percentage, minimum 0 (no negative loss / gain)
  // Some systems do allow gain below 25°C, but we'll be conservative
  return Math.max(0, loss);
}

/**
 * Calculate the Performance Ratio for a PV system.
 *
 * @param input - Calculation inputs including module/inverter specs and losses
 * @returns PR result with breakdown of all losses
 */
export function calculatePerformanceRatio(
  input: PRCalculationInput
): PRCalculationResult {
  // Use provided values or defaults
  const tempCoeff = input.tempCoeffPmax ?? DEFAULT_SYSTEM_CONFIG.tempCoeffPmax;
  const noct = input.noct ?? DEFAULT_SYSTEM_CONFIG.noct;
  const inverterEff = input.inverterEfficiency ?? DEFAULT_SYSTEM_CONFIG.inverterEfficiency;
  const ambientTemp = input.avgAmbientTemp ?? 20; // Default to mild climate
  const irradiance = input.avgIrradiance ?? 800; // Average operating irradiance

  // Loss percentages
  const soilingLoss = input.soilingLoss ?? DEFAULT_LOSSES.soiling;
  const shadingLoss = input.shadingLoss ?? DEFAULT_LOSSES.shading;
  const wiringLoss = input.wiringLoss ?? DEFAULT_LOSSES.wiring;
  const mismatchLoss = input.mismatchLoss ?? DEFAULT_LOSSES.mismatch;
  const availabilityLoss = input.availabilityLoss ?? DEFAULT_LOSSES.availability;
  const otherLoss = input.otherLoss ?? DEFAULT_LOSSES.other;

  // Calculate cell temperature
  const cellTemp = calculateCellTemperature(ambientTemp, irradiance, noct);

  // Calculate temperature loss
  const temperatureLoss = calculateTemperatureLoss(cellTemp, tempCoeff);

  // Inverter loss (100 - efficiency)
  const inverterLoss = 100 - inverterEff;

  // Calculate total loss using multiplicative model
  // PR = (1 - L1) × (1 - L2) × ... × (1 - Ln)
  const factors = [
    1 - temperatureLoss / 100,
    1 - soilingLoss / 100,
    1 - shadingLoss / 100,
    1 - wiringLoss / 100,
    1 - mismatchLoss / 100,
    1 - inverterLoss / 100,
    1 - availabilityLoss / 100,
    1 - otherLoss / 100,
  ];

  const performanceRatio = factors.reduce((acc, factor) => acc * factor, 1);

  // Calculate total loss percentage
  const totalLoss = (1 - performanceRatio) * 100;

  const losses: YieldLossBreakdown = {
    temperatureLoss,
    soilingLoss,
    shadingLoss,
    wiringLoss,
    mismatchLoss,
    inverterLoss,
    availabilityLoss,
    otherLoss,
    totalLoss,
  };

  return {
    performanceRatio,
    losses,
    cellTemperature: cellTemp,
    assumptions: {
      tempCoeffUsed: tempCoeff,
      noctUsed: noct,
      inverterEffUsed: inverterEff,
      ambientTempUsed: ambientTemp,
      irradianceUsed: irradiance,
    },
  };
}

/**
 * Calculate PR with component specs from the component library.
 *
 * This is a convenience function that extracts relevant specs from
 * the component types used elsewhere in the app.
 *
 * @param moduleSpecs - Module specifications from component library
 * @param inverterSpecs - Inverter specifications from component library
 * @param ambientTemp - Average ambient temperature for the location
 * @returns PR calculation result
 */
export function calculatePRFromComponents(
  moduleSpecs?: {
    tempCoeffPmax?: number;
    noct?: number;
  },
  inverterSpecs?: {
    maxEfficiency?: number;
    euroEfficiency?: number;
  },
  ambientTemp?: number
): PRCalculationResult {
  // Use euroEfficiency if available (weighted average), otherwise maxEfficiency
  const inverterEfficiency =
    inverterSpecs?.euroEfficiency ?? inverterSpecs?.maxEfficiency;

  return calculatePerformanceRatio({
    tempCoeffPmax: moduleSpecs?.tempCoeffPmax,
    noct: moduleSpecs?.noct,
    inverterEfficiency,
    avgAmbientTemp: ambientTemp,
  });
}

/**
 * Get a description of the PR quality.
 *
 * @param pr - Performance ratio (0-1)
 * @returns Description string
 */
export function getPRQualityDescription(pr: number): {
  rating: 'excellent' | 'good' | 'average' | 'poor';
  description: string;
} {
  if (pr >= 0.82) {
    return {
      rating: 'excellent',
      description: 'Excellent system performance',
    };
  } else if (pr >= 0.78) {
    return {
      rating: 'good',
      description: 'Good system performance',
    };
  } else if (pr >= 0.74) {
    return {
      rating: 'average',
      description: 'Average system performance',
    };
  } else {
    return {
      rating: 'poor',
      description: 'Below average - review losses',
    };
  }
}

/**
 * Format loss breakdown for display.
 *
 * @param losses - Loss breakdown object
 * @returns Array of formatted loss items for display
 */
export function formatLossBreakdown(losses: YieldLossBreakdown): Array<{
  name: string;
  value: number;
  formatted: string;
}> {
  return [
    { name: 'Temperature', value: losses.temperatureLoss, formatted: `${losses.temperatureLoss.toFixed(1)}%` },
    { name: 'Soiling', value: losses.soilingLoss, formatted: `${losses.soilingLoss.toFixed(1)}%` },
    { name: 'Shading', value: losses.shadingLoss, formatted: `${losses.shadingLoss.toFixed(1)}%` },
    { name: 'Wiring (DC/AC)', value: losses.wiringLoss, formatted: `${losses.wiringLoss.toFixed(1)}%` },
    { name: 'Module mismatch', value: losses.mismatchLoss, formatted: `${losses.mismatchLoss.toFixed(1)}%` },
    { name: 'Inverter', value: losses.inverterLoss, formatted: `${losses.inverterLoss.toFixed(1)}%` },
    { name: 'Availability', value: losses.availabilityLoss, formatted: `${losses.availabilityLoss.toFixed(1)}%` },
    { name: 'Other', value: losses.otherLoss, formatted: `${losses.otherLoss.toFixed(1)}%` },
  ].filter(item => item.value > 0); // Only show non-zero losses
}
