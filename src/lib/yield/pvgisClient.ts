/**
 * PVGIS API Client
 *
 * Fetches solar yield estimates from the European Commission's PVGIS service.
 * https://re.jrc.ec.europa.eu/pvg_tools/en/
 *
 * Features:
 * - Free API, no key required
 * - Coverage: Europe, Africa, parts of Asia and Americas
 * - Returns hourly/monthly/annual yield estimates
 * - Caching to IndexedDB to reduce API calls
 *
 * API Documentation:
 * https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/api-non-interactive-service_en
 */

import type { PVGISResponse, YieldCacheEntry } from './types';
import { CACHE_CONFIG } from './types';

/** PVGIS API base URL */
const PVGIS_API_BASE = 'https://re.jrc.ec.europa.eu/api/v5_2';

/** PVGIS API timeout in milliseconds */
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Parameters for PVGIS PVcalc endpoint
 */
export interface PVGISRequestParams {
  latitude: number;
  longitude: number;
  peakPower: number;           // kWp
  systemLoss: number;          // % (0-100)
  tiltAngle: number;           // degrees
  azimuth: number;             // degrees (-180 to 180, 0=south)
  database?: 'PVGIS-SARAH2' | 'PVGIS-ERA5' | 'PVGIS-SARAH' | 'PVGIS-COSMO' | 'PVGIS-CMSAF';
}

/**
 * Generate a cache key from request parameters.
 */
function generateCacheKey(params: PVGISRequestParams): string {
  // Round values to reduce cache misses from minor differences
  const lat = params.latitude.toFixed(2);
  const lon = params.longitude.toFixed(2);
  const power = params.peakPower.toFixed(0);
  const loss = params.systemLoss.toFixed(0);
  const tilt = params.tiltAngle.toFixed(0);
  const azimuth = params.azimuth.toFixed(0);

  return `pvgis_${lat}_${lon}_${power}_${loss}_${tilt}_${azimuth}`;
}

/**
 * Get cached response from localStorage.
 */
function getCachedResponse(key: string): PVGISResponse | null {
  try {
    const cacheJson = localStorage.getItem(CACHE_CONFIG.storageKey);
    if (!cacheJson) return null;

    const cache: Record<string, YieldCacheEntry> = JSON.parse(cacheJson);
    const entry = cache[key];

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      // Remove expired entry
      delete cache[key];
      localStorage.setItem(CACHE_CONFIG.storageKey, JSON.stringify(cache));
      return null;
    }

    return entry.response;
  } catch {
    return null;
  }
}

/**
 * Store response in localStorage cache.
 */
function setCachedResponse(key: string, response: PVGISResponse): void {
  try {
    const cacheJson = localStorage.getItem(CACHE_CONFIG.storageKey);
    const cache: Record<string, YieldCacheEntry> = cacheJson ? JSON.parse(cacheJson) : {};

    // Enforce max entries by removing oldest
    const keys = Object.keys(cache);
    if (keys.length >= CACHE_CONFIG.maxEntries) {
      // Find and remove oldest entry
      let oldestKey = keys[0];
      let oldestTime = cache[oldestKey].timestamp;

      for (const k of keys) {
        if (cache[k].timestamp < oldestTime) {
          oldestKey = k;
          oldestTime = cache[k].timestamp;
        }
      }
      delete cache[oldestKey];
    }

    // Add new entry
    const ttlMs = CACHE_CONFIG.ttlDays * 24 * 60 * 60 * 1000;
    cache[key] = {
      key,
      response,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    localStorage.setItem(CACHE_CONFIG.storageKey, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to cache PVGIS response:', error);
  }
}

/**
 * Build the PVGIS API URL with query parameters.
 */
function buildPVGISUrl(params: PVGISRequestParams): string {
  const url = new URL(`${PVGIS_API_BASE}/PVcalc`);

  // Required parameters
  url.searchParams.set('lat', params.latitude.toString());
  url.searchParams.set('lon', params.longitude.toString());
  url.searchParams.set('peakpower', params.peakPower.toString());
  url.searchParams.set('loss', params.systemLoss.toString());

  // Mounting configuration (fixed tilt)
  url.searchParams.set('mountingplace', 'free'); // Ground-mounted
  url.searchParams.set('angle', params.tiltAngle.toString());
  url.searchParams.set('aspect', params.azimuth.toString()); // PVGIS: 0=south, 90=west, -90=east

  // Output format
  url.searchParams.set('outputformat', 'json');

  // Database (optional, let PVGIS choose best available)
  if (params.database) {
    url.searchParams.set('raddatabase', params.database);
  }

  return url.toString();
}

/**
 * Parse PVGIS API response and validate structure.
 */
function parsePVGISResponse(data: unknown): PVGISResponse {
  const response = data as PVGISResponse;

  // Validate required fields exist
  if (!response.inputs?.location) {
    throw new Error('Invalid PVGIS response: missing location data');
  }
  if (!response.outputs?.totals?.fixed) {
    throw new Error('Invalid PVGIS response: missing totals data');
  }
  if (!response.outputs?.monthly?.fixed || !Array.isArray(response.outputs.monthly.fixed)) {
    throw new Error('Invalid PVGIS response: missing monthly data');
  }
  if (response.outputs.monthly.fixed.length !== 12) {
    throw new Error('Invalid PVGIS response: expected 12 months of data');
  }

  return response;
}

/**
 * Fetch yield estimate from PVGIS API.
 *
 * @param params - Request parameters
 * @param useCache - Whether to use cached response (default: true)
 * @returns PVGIS API response
 * @throws Error if API call fails or location not covered
 */
export async function fetchPVGIS(
  params: PVGISRequestParams,
  useCache: boolean = true
): Promise<PVGISResponse> {
  const cacheKey = generateCacheKey(params);

  // Check cache first
  if (useCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Build URL and fetch
  const url = buildPVGISUrl(params);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // PVGIS returns specific error messages for out-of-coverage locations
      if (response.status === 400) {
        const errorText = await response.text();
        if (errorText.includes('location') || errorText.includes('coverage')) {
          throw new Error('Location is outside PVGIS coverage area');
        }
        throw new Error(`PVGIS API error: ${errorText}`);
      }
      throw new Error(`PVGIS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const pvgisResponse = parsePVGISResponse(data);

    // Cache the response
    if (useCache) {
      setCachedResponse(cacheKey, pvgisResponse);
    }

    return pvgisResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('PVGIS API request timed out');
      }
      throw error;
    }
    throw new Error('Failed to fetch from PVGIS API');
  }
}

/**
 * Check if a location is likely covered by PVGIS.
 *
 * PVGIS coverage includes:
 * - Europe (full)
 * - Africa (full)
 * - Parts of Asia (Middle East, Central Asia)
 * - Parts of Americas (limited)
 *
 * This is a rough check - the API may still fail for edge cases.
 */
export function isPVGISCoverageArea(latitude: number, longitude: number): boolean {
  // PVGIS-SARAH2 coverage (primary database)
  // Roughly: latitude -60 to 60, most of Eastern Hemisphere

  // Europe (full coverage)
  if (latitude >= 35 && latitude <= 72 && longitude >= -25 && longitude <= 45) {
    return true;
  }

  // Africa (full coverage)
  if (latitude >= -35 && latitude <= 37 && longitude >= -20 && longitude <= 55) {
    return true;
  }

  // Middle East
  if (latitude >= 12 && latitude <= 42 && longitude >= 25 && longitude <= 75) {
    return true;
  }

  // South Asia (India, etc.)
  if (latitude >= 5 && latitude <= 37 && longitude >= 65 && longitude <= 100) {
    return true;
  }

  // Australia (PVGIS has some coverage)
  if (latitude >= -45 && latitude <= -10 && longitude >= 110 && longitude <= 155) {
    return true;
  }

  // For other locations, we'll try the API anyway (it might work with ERA5 database)
  // but return false to indicate uncertainty
  return false;
}

/**
 * Extract yield data from PVGIS response.
 *
 * @param response - PVGIS API response
 * @returns Simplified yield data
 */
export function extractYieldData(response: PVGISResponse): {
  annualYield: number;
  monthlyYield: number[];
  annualIrradiance: number;
  monthlyIrradiance: number[];
  location: { latitude: number; longitude: number; elevation: number };
} {
  const totals = response.outputs.totals.fixed;
  const monthly = response.outputs.monthly.fixed;

  return {
    annualYield: totals.E_y,
    monthlyYield: monthly.map(m => m.E_m),
    annualIrradiance: totals.H_i_y,
    monthlyIrradiance: monthly.map(m => m.H_i_m),
    location: {
      latitude: response.inputs.location.latitude,
      longitude: response.inputs.location.longitude,
      elevation: response.inputs.location.elevation,
    },
  };
}

/**
 * Clear the PVGIS cache.
 */
export function clearPVGISCache(): void {
  localStorage.removeItem(CACHE_CONFIG.storageKey);
}

/**
 * Get cache statistics.
 */
export function getPVGISCacheStats(): {
  entries: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
} {
  try {
    const cacheJson = localStorage.getItem(CACHE_CONFIG.storageKey);
    if (!cacheJson) {
      return { entries: 0, oldestEntry: null, newestEntry: null };
    }

    const cache: Record<string, YieldCacheEntry> = JSON.parse(cacheJson);
    const entries = Object.values(cache);

    if (entries.length === 0) {
      return { entries: 0, oldestEntry: null, newestEntry: null };
    }

    const timestamps = entries.map(e => e.timestamp);
    return {
      entries: entries.length,
      oldestEntry: new Date(Math.min(...timestamps)),
      newestEntry: new Date(Math.max(...timestamps)),
    };
  } catch {
    return { entries: 0, oldestEntry: null, newestEntry: null };
  }
}
