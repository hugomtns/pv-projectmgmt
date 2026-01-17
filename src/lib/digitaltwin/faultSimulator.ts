/**
 * Fault Simulator
 *
 * Generates realistic fault scenarios for the Digital Twin simulation.
 * Faults are randomly triggered based on configurable probability.
 */

import type { AlertCategory, AlertSeverity, DigitalTwinAlert, FaultScenario, PanelZoneFault, PanelZoneFaultType } from './types';

/**
 * Predefined fault scenarios for different equipment types
 */
export const INVERTER_FAULTS: FaultScenario[] = [
  {
    code: 'INV_001',
    message: 'Grid overvoltage detected - AC output reduced',
    category: 'inverter',
    severity: 'warning',
    autoClearMs: 30000, // Auto-clears in 30s
  },
  {
    code: 'INV_002',
    message: 'MPPT tracking failure on channel 1',
    category: 'inverter',
    severity: 'critical',
    autoClearMs: 0, // Manual clear required
  },
  {
    code: 'INV_003',
    message: 'DC insulation resistance below threshold',
    category: 'inverter',
    severity: 'warning',
    autoClearMs: 60000,
  },
  {
    code: 'INV_004',
    message: 'Internal temperature high - output limited',
    category: 'inverter',
    severity: 'warning',
    autoClearMs: 120000,
  },
  {
    code: 'INV_005',
    message: 'Grid frequency out of range',
    category: 'inverter',
    severity: 'warning',
    autoClearMs: 15000,
  },
  {
    code: 'INV_006',
    message: 'Ground fault detected - inverter offline',
    category: 'inverter',
    severity: 'critical',
    autoClearMs: 0,
  },
];

export const TRANSFORMER_FAULTS: FaultScenario[] = [
  {
    code: 'XFR_001',
    message: 'Winding temperature high - approaching limit',
    category: 'transformer',
    severity: 'warning',
    autoClearMs: 120000,
  },
  {
    code: 'XFR_002',
    message: 'Oil temperature elevated',
    category: 'transformer',
    severity: 'warning',
    autoClearMs: 180000,
  },
  {
    code: 'XFR_003',
    message: 'Tap changer position error',
    category: 'transformer',
    severity: 'warning',
    autoClearMs: 60000,
  },
];

export const COMMUNICATION_FAULTS: FaultScenario[] = [
  {
    code: 'COMM_001',
    message: 'Communication timeout - data may be stale',
    category: 'communication',
    severity: 'warning',
    autoClearMs: 10000,
  },
  {
    code: 'COMM_002',
    message: 'Data logger connection lost',
    category: 'communication',
    severity: 'warning',
    autoClearMs: 30000,
  },
];

export const PERFORMANCE_FAULTS: FaultScenario[] = [
  {
    code: 'PERF_001',
    message: 'Performance ratio below threshold (PR < 70%)',
    category: 'performance',
    severity: 'warning',
    autoClearMs: 300000, // 5 minutes
  },
  {
    code: 'PERF_002',
    message: 'Significant underperformance detected',
    category: 'performance',
    severity: 'critical',
    autoClearMs: 0,
  },
];

/**
 * Panel zone fault definitions
 */
export interface PanelZoneFaultDefinition {
  type: PanelZoneFaultType;
  code: string;
  message: string;
  severity: AlertSeverity;
  /** Performance impact (0-1, lower = worse) */
  performanceImpact: number;
  /** Auto-clear duration in ms (0 = manual) */
  autoClearMs: number;
}

export const PANEL_ZONE_FAULTS: PanelZoneFaultDefinition[] = [
  {
    type: 'hot_spot',
    code: 'PNL_001',
    message: 'Hot spot detected - cell overheating',
    severity: 'warning',
    performanceImpact: 0.6,
    autoClearMs: 120000, // 2 minutes
  },
  {
    type: 'shading',
    code: 'PNL_002',
    message: 'Partial shading detected on panel zone',
    severity: 'warning',
    performanceImpact: 0.7,
    autoClearMs: 60000, // 1 minute
  },
  {
    type: 'soiling_heavy',
    code: 'PNL_003',
    message: 'Heavy soiling detected - cleaning required',
    severity: 'warning',
    performanceImpact: 0.75,
    autoClearMs: 300000, // 5 minutes
  },
  {
    type: 'module_degradation',
    code: 'PNL_004',
    message: 'Module degradation - reduced output',
    severity: 'critical',
    performanceImpact: 0.5,
    autoClearMs: 0, // Manual clear
  },
];

/**
 * Get a random panel zone fault definition
 */
export function getRandomPanelZoneFault(): PanelZoneFaultDefinition {
  return PANEL_ZONE_FAULTS[Math.floor(Math.random() * PANEL_ZONE_FAULTS.length)];
}

/**
 * Generate a panel zone fault with probability check
 */
export function maybeGeneratePanelZoneFault(
  zoneId: string,
  probability: number
): { fault: PanelZoneFault; alert: DigitalTwinAlert } | null {
  if (!shouldTriggerFault(probability)) return null;

  const faultDef = getRandomPanelZoneFault();

  const fault: PanelZoneFault = {
    zoneId,
    faultType: faultDef.type,
    startTime: new Date().toISOString(),
    performanceImpact: faultDef.performanceImpact,
  };

  const alert: DigitalTwinAlert = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    severity: faultDef.severity,
    category: 'panel',
    equipmentId: zoneId,
    title: faultDef.code,
    message: `${faultDef.message} (Zone ${zoneId.replace('zone-', '')})`,
    acknowledged: false,
    autoClearMs: faultDef.autoClearMs,
  };

  return { fault, alert };
}

/**
 * All fault scenarios combined
 */
export const ALL_FAULT_SCENARIOS: FaultScenario[] = [
  ...INVERTER_FAULTS,
  ...TRANSFORMER_FAULTS,
  ...COMMUNICATION_FAULTS,
  ...PERFORMANCE_FAULTS,
];

/**
 * Get fault scenarios by category
 */
export function getFaultsByCategory(category: AlertCategory): FaultScenario[] {
  return ALL_FAULT_SCENARIOS.filter((f) => f.category === category);
}

/**
 * Generate a random fault for a given category
 */
export function generateRandomFault(
  category: AlertCategory,
  equipmentId?: string
): DigitalTwinAlert | null {
  const categoryFaults = getFaultsByCategory(category);
  if (categoryFaults.length === 0) return null;

  const fault = categoryFaults[Math.floor(Math.random() * categoryFaults.length)];

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    severity: fault.severity,
    category: fault.category,
    equipmentId,
    title: fault.code,
    message: fault.message,
    acknowledged: false,
    autoClearMs: fault.autoClearMs,
  };
}

/**
 * Decide whether to trigger a fault based on probability
 */
export function shouldTriggerFault(probability: number): boolean {
  return Math.random() < probability;
}

/**
 * Generate a fault for an inverter with probability check
 */
export function maybeGenerateInverterFault(
  equipmentId: string,
  probability: number
): DigitalTwinAlert | null {
  if (!shouldTriggerFault(probability)) return null;
  return generateRandomFault('inverter', equipmentId);
}

/**
 * Generate a fault for a transformer with probability check
 */
export function maybeGenerateTransformerFault(
  equipmentId: string,
  probability: number
): DigitalTwinAlert | null {
  if (!shouldTriggerFault(probability)) return null;
  return generateRandomFault('transformer', equipmentId);
}

/**
 * Generate a performance fault based on PR threshold
 */
export function checkPerformanceThreshold(
  performanceRatio: number,
  threshold: number = 0.7
): DigitalTwinAlert | null {
  if (performanceRatio >= threshold) return null;

  const fault =
    performanceRatio < 0.5 ? PERFORMANCE_FAULTS[1] : PERFORMANCE_FAULTS[0];

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    severity: fault.severity,
    category: fault.category,
    title: fault.code,
    message: fault.message,
    acknowledged: false,
    autoClearMs: fault.autoClearMs,
  };
}

/**
 * Get severity color for display
 */
export function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return '#ef4444'; // red-500
    case 'warning':
      return '#eab308'; // yellow-500
    case 'info':
      return '#3b82f6'; // blue-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get severity badge class for Tailwind
 */
export function getSeverityBadgeClass(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'info':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}
