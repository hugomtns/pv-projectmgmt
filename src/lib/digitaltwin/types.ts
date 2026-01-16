/**
 * Digital Twin Types
 *
 * Type definitions for the simulated telemetry system including
 * weather data, equipment telemetry, system metrics, and alerts.
 */

// ============================================================================
// Weather Data
// ============================================================================

export interface WeatherData {
  /** Ambient temperature in Celsius */
  temperature: number;
  /** Cloud cover percentage (0-100) */
  cloudCover: number;
  /** Global Horizontal Irradiance in W/m2 */
  irradiance: number;
  /** Wind speed in m/s */
  windSpeed: number;
  /** Relative humidity percentage (0-100) */
  humidity: number;
  /** Whether it's currently daytime */
  isDay: boolean;
  /** Sunrise time (ISO string) */
  sunrise: string;
  /** Sunset time (ISO string) */
  sunset: string;
}

// ============================================================================
// System Metrics
// ============================================================================

export interface SystemMetrics {
  /** Current power output in kW */
  powerOutput: number;
  /** Accumulated energy today in kWh */
  energyToday: number;
  /** Expected/theoretical power output in kW */
  expectedPower: number;
  /** Performance ratio (0-1) */
  performanceRatio: number;
  /** System availability percentage (0-100) */
  availability: number;
  /** Power exported to grid in kW */
  gridExport: number;
}

// ============================================================================
// Equipment Telemetry
// ============================================================================

export type EquipmentStatus = 'online' | 'warning' | 'fault' | 'offline';

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  online: '#22c55e',   // green-500
  warning: '#eab308',  // yellow-500
  fault: '#ef4444',    // red-500
  offline: '#6b7280',  // gray-500
};

export interface InverterTelemetry {
  /** Equipment ID (matches design element) */
  equipmentId: string;
  /** Display name */
  name: string;
  /** Current status */
  status: EquipmentStatus;
  /** DC input power in kW */
  dcPower: number;
  /** AC output power in kW */
  acPower: number;
  /** Conversion efficiency (0-100) */
  efficiency: number;
  /** Internal temperature in Celsius */
  temperature: number;
  /** MPPT channel voltages in V */
  mpptVoltage: number[];
  /** MPPT channel currents in A */
  mpptCurrent: number[];
  /** Fault code if in fault state */
  faultCode?: string;
  /** Human-readable fault message */
  faultMessage?: string;
}

export interface TransformerTelemetry {
  /** Equipment ID (matches design element) */
  equipmentId: string;
  /** Display name */
  name: string;
  /** Current status */
  status: EquipmentStatus;
  /** Load percentage (0-100) */
  loadPercent: number;
  /** Winding temperature in Celsius */
  temperature: number;
  /** Oil temperature in Celsius (optional) */
  oilTemperature?: number;
  /** Tap changer position (optional) */
  tapPosition?: number;
}

// ============================================================================
// Panel Zone Performance
// ============================================================================

export interface PanelZonePerformance {
  /** Zone identifier */
  zoneId: string;
  /** Indices of panels in this zone */
  panelIndices: number[];
  /** Average irradiance for zone in W/m2 */
  avgIrradiance: number;
  /** Average cell temperature in Celsius */
  avgTemperature: number;
  /** Performance index (0-1, relative to expected) */
  performanceIndex: number;
  /** Soiling factor (0-1, 1 = clean) */
  soilingFactor: number;
}

// ============================================================================
// Telemetry Snapshot
// ============================================================================

export interface TelemetrySnapshot {
  /** Timestamp (ISO string) */
  timestamp: string;
  /** Design ID this telemetry is for */
  designId: string;
  /** Current weather conditions */
  weather: WeatherData;
  /** System-level metrics */
  system: SystemMetrics;
  /** Inverter telemetry array */
  inverters: InverterTelemetry[];
  /** Transformer telemetry array */
  transformers: TransformerTelemetry[];
  /** Panel zone performance data */
  panelZones: PanelZonePerformance[];
}

// ============================================================================
// Alerts
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'inverter' | 'transformer' | 'performance' | 'communication' | 'weather';

export interface DigitalTwinAlert {
  /** Unique alert ID */
  id: string;
  /** When the alert was raised (ISO string) */
  timestamp: string;
  /** Severity level */
  severity: AlertSeverity;
  /** Category for filtering/grouping */
  category: AlertCategory;
  /** Related equipment ID (optional) */
  equipmentId?: string;
  /** Short title/code */
  title: string;
  /** Detailed message */
  message: string;
  /** Whether user has acknowledged */
  acknowledged: boolean;
  /** Auto-clear duration in ms (0 = manual clear) */
  autoClearMs?: number;
}

// ============================================================================
// Fault Scenarios
// ============================================================================

export interface FaultScenario {
  /** Fault code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Alert category */
  category: AlertCategory;
  /** Severity level */
  severity: AlertSeverity;
  /** Auto-clear duration in ms (0 = manual) */
  autoClearMs: number;
}

// ============================================================================
// Simulation Configuration
// ============================================================================

export interface SimulationConfig {
  /** Design ID being simulated */
  designId: string;
  /** Total DC capacity in kWp */
  capacityKwp: number;
  /** Site latitude */
  latitude: number;
  /** Site longitude */
  longitude: number;
  /** Number of inverters */
  inverterCount: number;
  /** Number of transformers */
  transformerCount: number;
  /** Total panel count */
  panelCount: number;
  /** Number of panel zones for heatmap */
  zoneCount: number;
  /** Enable random fault generation */
  enableRandomFaults: boolean;
  /** Fault probability per update cycle (0-1) */
  faultProbability: number;
  /** Base soiling loss (0-1, default 0.02) */
  soilingLoss: number;
  /** Mismatch loss (0-1, default 0.02) */
  mismatchLoss: number;
}

export const DEFAULT_SIMULATION_CONFIG: Partial<SimulationConfig> = {
  zoneCount: 4,
  enableRandomFaults: true,
  faultProbability: 0.01,
  soilingLoss: 0.02,
  mismatchLoss: 0.02,
};
