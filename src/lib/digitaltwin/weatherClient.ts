/**
 * Weather Client - Open-Meteo API Integration
 *
 * Fetches real-time weather data for solar irradiance simulation.
 * Open-Meteo is free and requires no API key.
 *
 * API Docs: https://open-meteo.com/en/docs
 */

import type { WeatherData } from './types';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 15000;

// Cache weather data for 5 minutes to reduce API calls
const CACHE_TTL_MS = 5 * 60 * 1000;
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    cloud_cover: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
    is_day: number;
    direct_radiation: number;
    diffuse_radiation: number;
  };
  daily: {
    sunrise: string[];
    sunset: string[];
  };
}

function getCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

function getCachedWeather(latitude: number, longitude: number): WeatherData | null {
  const key = getCacheKey(latitude, longitude);
  const cached = weatherCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  return null;
}

function setCachedWeather(latitude: number, longitude: number, data: WeatherData): void {
  const key = getCacheKey(latitude, longitude);
  weatherCache.set(key, { data, timestamp: Date.now() });

  // Limit cache size
  if (weatherCache.size > 50) {
    const oldestKey = weatherCache.keys().next().value;
    if (oldestKey) weatherCache.delete(oldestKey);
  }
}

/**
 * Fetch current weather conditions from Open-Meteo API
 */
export async function fetchCurrentWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  // Check cache first
  const cached = getCachedWeather(latitude, longitude);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(OPEN_METEO_BASE);
    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set(
      'current',
      [
        'temperature_2m',
        'cloud_cover',
        'wind_speed_10m',
        'relative_humidity_2m',
        'is_day',
        'direct_radiation',
        'diffuse_radiation',
      ].join(',')
    );
    url.searchParams.set('daily', 'sunrise,sunset');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url.toString(), {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenMeteoResponse = await response.json();

    const weather: WeatherData = {
      temperature: data.current.temperature_2m,
      cloudCover: data.current.cloud_cover,
      irradiance: data.current.direct_radiation + data.current.diffuse_radiation,
      windSpeed: data.current.wind_speed_10m,
      humidity: data.current.relative_humidity_2m,
      isDay: data.current.is_day === 1,
      sunrise: data.daily.sunrise[0],
      sunset: data.daily.sunset[0],
    };

    setCachedWeather(latitude, longitude, weather);
    return weather;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[WeatherClient] Request timeout, using fallback');
      return getFallbackWeather(latitude);
    }
    console.error('[WeatherClient] API error:', error);
    return getFallbackWeather(latitude);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate fallback weather data when API is unavailable
 * Uses latitude and time of day for basic estimation
 */
function getFallbackWeather(latitude: number): WeatherData {
  const now = new Date();
  const hour = now.getHours();

  // Simple day/night check (6am - 6pm is day)
  const isDay = hour >= 6 && hour < 18;

  // Estimate temperature based on latitude and time
  const baseTemp = 25 - Math.abs(latitude) * 0.3;
  const tempVariation = isDay ? 5 : -5;
  const temperature = baseTemp + tempVariation;

  // Estimate irradiance (bell curve through day)
  let irradiance = 0;
  if (isDay) {
    const hoursSinceSunrise = hour - 6;
    const dayProgress = hoursSinceSunrise / 12;
    // Peak at noon
    irradiance = 800 * Math.sin(dayProgress * Math.PI);
  }

  // Sunrise/sunset estimates
  const sunrise = new Date(now);
  sunrise.setHours(6, 0, 0, 0);
  const sunset = new Date(now);
  sunset.setHours(18, 0, 0, 0);

  return {
    temperature,
    cloudCover: 20, // Assume partly cloudy
    irradiance,
    windSpeed: 3,
    humidity: 50,
    isDay,
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
  };
}

/**
 * Clear the weather cache (for testing)
 */
export function clearWeatherCache(): void {
  weatherCache.clear();
}
