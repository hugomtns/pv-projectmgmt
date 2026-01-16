/**
 * GHI Lookup Table
 *
 * Provides offline fallback for solar irradiance estimation when PVGIS API
 * is unavailable or location is outside coverage area.
 *
 * Data is based on typical values for different latitude bands.
 * Monthly factors represent the distribution of annual irradiance across months.
 *
 * Sources:
 * - NASA POWER database typical values
 * - PVGIS typical year data patterns
 * - Industry rule-of-thumb estimates
 */

import type { GHILookupEntry } from './types';

/**
 * GHI lookup table organized by latitude bands.
 * Each entry provides typical values for that climate zone.
 *
 * Monthly factors are for Northern Hemisphere.
 * For Southern Hemisphere, factors are shifted by 6 months.
 */
export const GHI_LOOKUP_TABLE: GHILookupEntry[] = [
  // Tropical zone (0-10°) - equatorial
  {
    latitudeMin: 0,
    latitudeMax: 10,
    annualGHI: 1900, // kWh/m²/year
    monthlyFactors: [
      0.083, 0.082, 0.086, 0.084, 0.082, 0.078,
      0.080, 0.082, 0.084, 0.086, 0.084, 0.079,
    ],
    avgTemp: 27,
    description: 'Tropical equatorial',
  },
  // Tropical zone (10-20°)
  {
    latitudeMin: 10,
    latitudeMax: 20,
    annualGHI: 2100, // kWh/m²/year - often includes desert regions
    monthlyFactors: [
      0.070, 0.075, 0.085, 0.090, 0.095, 0.095,
      0.092, 0.090, 0.088, 0.082, 0.072, 0.066,
    ],
    avgTemp: 26,
    description: 'Tropical / subtropical',
  },
  // Subtropical / desert zone (20-30°)
  {
    latitudeMin: 20,
    latitudeMax: 30,
    annualGHI: 2200, // kWh/m²/year - desert regions like Phoenix, Sahara
    monthlyFactors: [
      0.060, 0.068, 0.082, 0.092, 0.102, 0.105,
      0.102, 0.098, 0.090, 0.078, 0.065, 0.058,
    ],
    avgTemp: 24,
    description: 'Subtropical / desert',
  },
  // Warm temperate (30-35°)
  {
    latitudeMin: 30,
    latitudeMax: 35,
    annualGHI: 1950, // kWh/m²/year - Mediterranean, southern US
    monthlyFactors: [
      0.055, 0.062, 0.080, 0.092, 0.105, 0.110,
      0.108, 0.102, 0.090, 0.075, 0.060, 0.051,
    ],
    avgTemp: 18,
    description: 'Warm temperate / Mediterranean',
  },
  // Mid-temperate (35-40°)
  {
    latitudeMin: 35,
    latitudeMax: 40,
    annualGHI: 1750, // kWh/m²/year - central US, southern Europe
    monthlyFactors: [
      0.050, 0.058, 0.078, 0.092, 0.108, 0.115,
      0.112, 0.105, 0.088, 0.072, 0.055, 0.047,
    ],
    avgTemp: 15,
    description: 'Mid-temperate',
  },
  // Cool temperate (40-45°)
  {
    latitudeMin: 40,
    latitudeMax: 45,
    annualGHI: 1550, // kWh/m²/year - northern US, central Europe
    monthlyFactors: [
      0.042, 0.052, 0.076, 0.094, 0.112, 0.120,
      0.118, 0.108, 0.086, 0.066, 0.048, 0.038,
    ],
    avgTemp: 11,
    description: 'Cool temperate',
  },
  // Northern temperate (45-50°)
  {
    latitudeMin: 45,
    latitudeMax: 50,
    annualGHI: 1350, // kWh/m²/year - Pacific Northwest, UK, Germany
    monthlyFactors: [
      0.035, 0.048, 0.074, 0.096, 0.118, 0.128,
      0.124, 0.110, 0.082, 0.060, 0.042, 0.033,
    ],
    avgTemp: 9,
    description: 'Northern temperate',
  },
  // Subarctic (50-55°)
  {
    latitudeMin: 50,
    latitudeMax: 55,
    annualGHI: 1150, // kWh/m²/year - southern Canada, Scandinavia
    monthlyFactors: [
      0.028, 0.042, 0.072, 0.100, 0.124, 0.138,
      0.132, 0.112, 0.078, 0.052, 0.035, 0.027,
    ],
    avgTemp: 6,
    description: 'Subarctic / northern maritime',
  },
  // High latitude (55-65°)
  {
    latitudeMin: 55,
    latitudeMax: 65,
    annualGHI: 950, // kWh/m²/year - northern Canada, Norway, Alaska
    monthlyFactors: [
      0.018, 0.035, 0.070, 0.105, 0.135, 0.150,
      0.145, 0.115, 0.072, 0.042, 0.025, 0.018,
    ],
    avgTemp: 2,
    description: 'High latitude / subarctic',
  },
  // Arctic (65-90°)
  {
    latitudeMin: 65,
    latitudeMax: 90,
    annualGHI: 750, // kWh/m²/year - Arctic circle and above
    monthlyFactors: [
      0.005, 0.020, 0.060, 0.110, 0.155, 0.180,
      0.170, 0.125, 0.065, 0.025, 0.010, 0.005,
    ],
    avgTemp: -5,
    description: 'Arctic',
  },
];

/**
 * Look up GHI data for a given latitude.
 *
 * @param latitude - Latitude in degrees (-90 to 90)
 * @returns GHI lookup entry with values adjusted for hemisphere
 */
export function lookupGHI(latitude: number): GHILookupEntry {
  const absLat = Math.abs(latitude);
  const isSouthernHemisphere = latitude < 0;

  // Find the matching entry
  let entry = GHI_LOOKUP_TABLE.find(
    (e) => absLat >= e.latitudeMin && absLat < e.latitudeMax
  );

  // Fallback to closest entry if not found
  if (!entry) {
    if (absLat >= 90) {
      entry = GHI_LOOKUP_TABLE[GHI_LOOKUP_TABLE.length - 1];
    } else {
      entry = GHI_LOOKUP_TABLE[0];
    }
  }

  // For Southern Hemisphere, shift monthly factors by 6 months
  if (isSouthernHemisphere) {
    const shiftedFactors = [
      ...entry.monthlyFactors.slice(6),
      ...entry.monthlyFactors.slice(0, 6),
    ];
    return {
      ...entry,
      monthlyFactors: shiftedFactors,
      description: `${entry.description} (Southern Hemisphere)`,
    };
  }

  return entry;
}

/**
 * Estimate annual yield using lookup table (offline fallback).
 *
 * This provides a rough estimate when PVGIS API is unavailable.
 * Accuracy is typically within ±15% of actual values.
 *
 * @param latitude - Latitude in degrees
 * @param capacityKwp - System capacity in kWp
 * @param performanceRatio - System performance ratio (default 0.80)
 * @returns Estimated annual yield in kWh
 */
export function estimateYieldFromLookup(
  latitude: number,
  capacityKwp: number,
  performanceRatio: number = 0.80
): {
  annualYield: number;
  monthlyYield: number[];
  annualGHI: number;
  monthlyFactors: number[];
  avgTemp: number;
  description: string;
} {
  const ghiData = lookupGHI(latitude);

  // Basic yield calculation: Yield = GHI × Capacity × PR
  // This assumes a fixed-tilt system at optimal angle
  const annualYield = ghiData.annualGHI * capacityKwp * performanceRatio;

  // Distribute across months
  const monthlyYield = ghiData.monthlyFactors.map(
    (factor) => annualYield * factor
  );

  return {
    annualYield,
    monthlyYield,
    annualGHI: ghiData.annualGHI,
    monthlyFactors: ghiData.monthlyFactors,
    avgTemp: ghiData.avgTemp,
    description: ghiData.description,
  };
}

/**
 * Get optimal tilt angle for a location (rule of thumb).
 *
 * For fixed-tilt systems, optimal angle is typically close to latitude
 * with adjustments for seasonal optimization.
 *
 * @param latitude - Latitude in degrees
 * @param optimization - 'annual' | 'summer' | 'winter'
 * @returns Recommended tilt angle in degrees
 */
export function getOptimalTilt(
  latitude: number,
  optimization: 'annual' | 'summer' | 'winter' = 'annual'
): number {
  const absLat = Math.abs(latitude);

  switch (optimization) {
    case 'summer':
      // Flatter angle for summer optimization
      return Math.max(0, absLat - 15);
    case 'winter':
      // Steeper angle for winter optimization
      return Math.min(90, absLat + 15);
    case 'annual':
    default:
      // Optimal annual angle is typically latitude ± a few degrees
      // Slightly less than latitude often performs better
      return Math.max(0, absLat - 5);
  }
}

/**
 * Get optimal azimuth for a location.
 *
 * @param latitude - Latitude in degrees
 * @returns Azimuth in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function getOptimalAzimuth(latitude: number): number {
  // In Northern Hemisphere, face south (180°)
  // In Southern Hemisphere, face north (0°)
  return latitude >= 0 ? 180 : 0;
}

/**
 * Validate coordinates are within reasonable bounds.
 *
 * @param latitude - Latitude in degrees
 * @param longitude - Longitude in degrees
 * @returns True if coordinates are valid
 */
export function isValidCoordinates(
  latitude: number,
  longitude: number
): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
