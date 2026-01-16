/**
 * WeatherWidget - Current weather conditions display
 */

import { Sun, Cloud, CloudRain, Moon, Wind, Droplets, Thermometer } from 'lucide-react';
import type { WeatherData } from '@/lib/digitaltwin/types';

interface WeatherWidgetProps {
  weather: WeatherData | undefined;
}

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  if (!weather) {
    return (
      <div className="p-3 border-b text-center text-muted-foreground text-sm">
        Loading weather...
      </div>
    );
  }

  // Choose weather icon based on conditions
  const WeatherIcon = getWeatherIcon(weather);

  return (
    <div className="p-3 border-b bg-muted/30">
      <div className="flex items-center justify-between">
        {/* Left: Icon and temperature */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-background">
            <WeatherIcon className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {weather.temperature.toFixed(0)}°C
            </div>
            <div className="text-xs text-muted-foreground">
              {weather.isDay ? 'Daytime' : 'Nighttime'}
            </div>
          </div>
        </div>

        {/* Right: Irradiance and conditions */}
        <div className="text-right">
          <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
            {weather.irradiance.toFixed(0)} W/m²
          </div>
          <div className="text-xs text-muted-foreground">
            {weather.cloudCover}% clouds
          </div>
        </div>
      </div>

      {/* Secondary metrics row */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Wind className="h-3 w-3" />
          <span>{weather.windSpeed.toFixed(1)} m/s</span>
        </div>
        <div className="flex items-center gap-1">
          <Droplets className="h-3 w-3" />
          <span>{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Thermometer className="h-3 w-3" />
          <span>Cell ~{(weather.temperature + 25).toFixed(0)}°C</span>
        </div>
      </div>
    </div>
  );
}

function getWeatherIcon(weather: WeatherData) {
  if (!weather.isDay) {
    return Moon;
  }

  if (weather.cloudCover > 80) {
    return CloudRain;
  }

  if (weather.cloudCover > 40) {
    return Cloud;
  }

  return Sun;
}
