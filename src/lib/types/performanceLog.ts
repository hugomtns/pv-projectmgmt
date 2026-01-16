/**
 * Performance Log Types
 *
 * Tracks production data and performance metrics for solar installations.
 */

export type PerformancePeriod =
  | 'daily'
  | 'weekly'
  | 'monthly';

export interface PerformanceLog {
  id: string;
  projectId: string;
  siteId?: string;        // Optional link to specific site

  period: PerformancePeriod;
  startDate: string;      // ISO date (start of period)
  endDate: string;        // ISO date (end of period)

  // Production data
  actualProduction: number;     // kWh
  expectedProduction?: number;  // kWh (from model/forecast)
  performanceRatio?: number;    // Actual/Expected (0-1+)

  // Irradiance data
  irradiance?: number;          // kWh/m2 (POA or GHI)
  irradianceType?: 'poa' | 'ghi';

  // Availability
  availabilityPercent?: number; // 0-100

  // Grid export (if applicable)
  gridExport?: number;          // kWh
  curtailment?: number;         // kWh (lost production due to grid limits)

  // Weather conditions
  avgTemperature?: number;      // Celsius
  snowDays?: number;            // Days with snow coverage
  soilingLoss?: number;         // Estimated % loss from soiling

  // Notes
  notes?: string;
  anomalies?: string;           // Description of any issues

  // Metadata
  createdBy: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

// Labels for UI display
export const PERFORMANCE_PERIOD_LABELS: Record<PerformancePeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

// KPI calculations
export interface PerformanceKPIs {
  totalProduction: number;          // Sum of actual production
  avgPerformanceRatio: number;      // Weighted average PR
  avgAvailability: number;          // Average availability %
  totalCurtailment: number;         // Sum of curtailment
  periodCount: number;              // Number of periods
  monthsWithData: number;           // Unique months with data
}

export function calculatePerformanceKPIs(logs: PerformanceLog[]): PerformanceKPIs {
  if (logs.length === 0) {
    return {
      totalProduction: 0,
      avgPerformanceRatio: 0,
      avgAvailability: 0,
      totalCurtailment: 0,
      periodCount: 0,
      monthsWithData: 0,
    };
  }

  const totalProduction = logs.reduce((sum, log) => sum + log.actualProduction, 0);

  // Weighted average PR (weighted by expected production)
  const prLogs = logs.filter((log) => log.performanceRatio !== undefined && log.expectedProduction);
  let avgPerformanceRatio = 0;
  if (prLogs.length > 0) {
    const totalExpected = prLogs.reduce((sum, log) => sum + (log.expectedProduction || 0), 0);
    const weightedPR = prLogs.reduce(
      (sum, log) => sum + (log.performanceRatio || 0) * (log.expectedProduction || 0),
      0
    );
    avgPerformanceRatio = totalExpected > 0 ? weightedPR / totalExpected : 0;
  }

  // Average availability
  const availLogs = logs.filter((log) => log.availabilityPercent !== undefined);
  const avgAvailability =
    availLogs.length > 0
      ? availLogs.reduce((sum, log) => sum + (log.availabilityPercent || 0), 0) / availLogs.length
      : 0;

  // Total curtailment
  const totalCurtailment = logs.reduce((sum, log) => sum + (log.curtailment || 0), 0);

  // Count unique months
  const uniqueMonths = new Set(
    logs.map((log) => log.startDate.substring(0, 7)) // YYYY-MM
  );

  return {
    totalProduction,
    avgPerformanceRatio,
    avgAvailability,
    totalCurtailment,
    periodCount: logs.length,
    monthsWithData: uniqueMonths.size,
  };
}
