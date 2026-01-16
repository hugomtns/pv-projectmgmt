/**
 * Yield Calculation Module
 *
 * Provides location-based solar yield estimation for PV systems.
 *
 * Features:
 * - PVGIS API integration for accurate yield estimates
 * - Offline fallback using latitude-based GHI lookup tables
 * - Performance Ratio calculation from component specs
 * - Caching for API responses
 *
 * Usage:
 * ```typescript
 * import { calculateYield, estimateYieldFromLookup } from '@/lib/yield';
 *
 * // Full calculation (uses PVGIS API with fallback)
 * const result = await calculateYield({
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 *   capacityKwp: 1000,
 * });
 *
 * // Offline-only calculation
 * const estimate = estimateYieldFromLookup(37.7749, 1000, 0.80);
 * ```
 */

// Types
export type {
  YieldSource,
  YieldEstimate,
  YieldLossBreakdown,
  YieldCalculationInput,
  YieldCalculationResult,
  PVGISResponse,
  GHILookupEntry,
  YieldCacheEntry,
} from './types';

export {
  DEFAULT_LOSSES,
  DEFAULT_SYSTEM_CONFIG,
  CACHE_CONFIG,
} from './types';

// GHI Lookup (offline fallback)
export {
  GHI_LOOKUP_TABLE,
  lookupGHI,
  estimateYieldFromLookup,
  getOptimalTilt,
  getOptimalAzimuth,
  isValidCoordinates,
} from './ghiLookup';

// Performance Ratio calculation
export {
  calculateCellTemperature,
  calculateTemperatureLoss,
  calculatePerformanceRatio,
  calculatePRFromComponents,
  getPRQualityDescription,
  formatLossBreakdown,
} from './performanceRatio';
export type { PRCalculationInput, PRCalculationResult } from './performanceRatio';

// PVGIS API client
export {
  fetchPVGIS,
  extractYieldData,
  isPVGISCoverageArea,
  clearPVGISCache,
  getPVGISCacheStats,
} from './pvgisClient';
export type { PVGISRequestParams } from './pvgisClient';

// Main yield calculator
export {
  calculateYield,
  calculateYieldOffline,
  getQuickYieldEstimate,
  yieldToCapacityFactor,
  capacityFactorToYield,
  formatYield,
  getSourceDescription,
} from './yieldCalculator';
