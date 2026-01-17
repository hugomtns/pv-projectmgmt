/**
 * Digital Twin Module
 *
 * Exports all Digital Twin functionality for simulated plant telemetry.
 */

// Types
export type {
  WeatherData,
  SystemMetrics,
  EquipmentStatus,
  InverterTelemetry,
  TransformerTelemetry,
  PanelZonePerformance,
  TelemetrySnapshot,
  AlertSeverity,
  AlertCategory,
  DigitalTwinAlert,
  FaultScenario,
  SimulationConfig,
} from './types';

export { EQUIPMENT_STATUS_COLORS, DEFAULT_SIMULATION_CONFIG } from './types';

// Weather Client
export { fetchCurrentWeather, clearWeatherCache } from './weatherClient';

// Irradiance Model
export {
  getDayOfYear,
  calculateSolarDeclination,
  calculateEquationOfTime,
  calculateSolarNoon,
  calculateHourAngle,
  calculateSolarAltitude,
  calculateAirMass,
  calculateClearSkyGHI,
  applyCloudAttenuation,
  calculateCellTemperature,
  calculateTemperatureLoss,
  calculateExpectedPower,
} from './irradianceModel';

// Fault Simulator
export {
  INVERTER_FAULTS,
  TRANSFORMER_FAULTS,
  COMMUNICATION_FAULTS,
  PERFORMANCE_FAULTS,
  ALL_FAULT_SCENARIOS,
  getFaultsByCategory,
  generateRandomFault,
  shouldTriggerFault,
  maybeGenerateInverterFault,
  maybeGenerateTransformerFault,
  checkPerformanceThreshold,
  getSeverityColor,
  getSeverityBadgeClass,
} from './faultSimulator';

// Simulation Engine
export { DigitalTwinSimulator, createSimulator } from './simulationEngine';
