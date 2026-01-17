/**
 * Simulation Engine
 *
 * Core engine for generating simulated telemetry data.
 * Combines weather data, solar calculations, and equipment simulation
 * to produce realistic plant telemetry snapshots.
 */

import type {
  SimulationConfig,
  TelemetrySnapshot,
  WeatherData,
  InverterTelemetry,
  TransformerTelemetry,
  PanelZonePerformance,
  DigitalTwinAlert,
  EquipmentStatus,
  PanelZoneFault,
} from './types';
import {
  calculateCellTemperature,
  calculateExpectedPower,
  applyCloudAttenuation,
  calculateClearSkyGHI,
} from './irradianceModel';
import {
  maybeGenerateInverterFault,
  maybeGenerateTransformerFault,
  checkPerformanceThreshold,
  maybeGeneratePanelZoneFault,
} from './faultSimulator';

/**
 * Digital Twin Simulator
 *
 * Maintains state for energy accumulation and active faults,
 * generating telemetry snapshots on each update cycle.
 */
export class DigitalTwinSimulator {
  private config: SimulationConfig;
  private energyAccumulator: number = 0;
  private lastUpdateTime: Date | null = null;
  private activeFaults: Map<string, DigitalTwinAlert> = new Map();
  private activeSystemAlerts: Set<string> = new Set(); // Track system-level alerts by title
  private activePanelZoneFaults: Map<string, PanelZoneFault> = new Map(); // Track panel zone faults
  private pendingAlerts: DigitalTwinAlert[] = [];
  private dayStartTime: Date | null = null;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.resetDailyAccumulator();
  }

  /**
   * Reset energy accumulator at start of day
   */
  private resetDailyAccumulator(): void {
    const now = new Date();
    this.dayStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.energyAccumulator = 0;
  }

  /**
   * Check if we've crossed into a new day
   */
  private checkDayRollover(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (this.dayStartTime && today.getTime() > this.dayStartTime.getTime()) {
      this.resetDailyAccumulator();
    }
  }

  /**
   * Get and clear pending alerts
   */
  getNewAlerts(): DigitalTwinAlert[] {
    const alerts = [...this.pendingAlerts];
    this.pendingAlerts = [];
    return alerts;
  }

  /**
   * Add an alert to pending queue
   */
  private addAlert(alert: DigitalTwinAlert): void {
    // Don't duplicate active faults (equipment-level)
    if (alert.equipmentId && this.activeFaults.has(alert.equipmentId)) {
      return;
    }

    // Don't duplicate system-level alerts (by title)
    if (!alert.equipmentId && this.activeSystemAlerts.has(alert.title)) {
      return;
    }

    this.pendingAlerts.push(alert);

    if (alert.equipmentId) {
      this.activeFaults.set(alert.equipmentId, alert);

      // Schedule auto-clear if applicable
      if (alert.autoClearMs && alert.autoClearMs > 0) {
        setTimeout(() => {
          this.activeFaults.delete(alert.equipmentId!);
        }, alert.autoClearMs);
      }
    } else {
      // System-level alert - track by title
      this.activeSystemAlerts.add(alert.title);

      // Schedule auto-clear if applicable
      if (alert.autoClearMs && alert.autoClearMs > 0) {
        setTimeout(() => {
          this.activeSystemAlerts.delete(alert.title);
        }, alert.autoClearMs);
      }
    }
  }

  /**
   * Clear an active fault manually
   */
  clearFault(equipmentId: string): void {
    this.activeFaults.delete(equipmentId);
  }

  /**
   * Clear a system-level alert by title
   */
  clearSystemAlert(title: string): void {
    this.activeSystemAlerts.delete(title);
  }

  /**
   * Clear a panel zone fault
   */
  clearPanelZoneFault(zoneId: string): void {
    this.activePanelZoneFaults.delete(zoneId);
  }

  /**
   * Check if equipment has an active fault
   */
  private hasActiveFault(equipmentId: string): boolean {
    return this.activeFaults.has(equipmentId);
  }

  /**
   * Check if a panel zone has an active fault
   */
  private hasActivePanelZoneFault(zoneId: string): boolean {
    return this.activePanelZoneFaults.has(zoneId);
  }

  /**
   * Generate a complete telemetry snapshot
   */
  async generateTelemetry(weather: WeatherData): Promise<TelemetrySnapshot> {
    const now = new Date();
    this.checkDayRollover();

    // Calculate irradiance (use weather API value or fall back to clear-sky model)
    let irradiance = weather.irradiance;
    if (irradiance === 0 && weather.isDay) {
      // API might not have irradiance data - calculate from clear-sky model
      const clearSky = calculateClearSkyGHI(
        this.config.latitude,
        this.config.longitude,
        now
      );
      irradiance = applyCloudAttenuation(clearSky, weather.cloudCover);
    }

    // Update weather with calculated irradiance
    const effectiveWeather: WeatherData = {
      ...weather,
      irradiance,
    };

    // Calculate cell temperature
    const cellTemp = calculateCellTemperature(weather.temperature, irradiance);

    // Calculate expected power
    const systemLosses = this.config.soilingLoss + this.config.mismatchLoss;
    const expectedPower = calculateExpectedPower(
      this.config.capacityKwp,
      irradiance,
      cellTemp,
      systemLosses
    );

    // Generate inverter telemetry (which may include faults)
    const inverters = this.simulateInverters(expectedPower, effectiveWeather);

    // Calculate actual power from inverters
    const actualPower = inverters.reduce((sum, inv) => sum + inv.acPower, 0);

    // Generate transformer telemetry
    const transformers = this.simulateTransformers(actualPower);

    // Generate panel zone performance
    const panelZones = this.simulatePanelZones(effectiveWeather, cellTemp);

    // Update energy accumulator
    if (this.lastUpdateTime && actualPower > 0) {
      const hoursDelta = (now.getTime() - this.lastUpdateTime.getTime()) / 3600000;
      this.energyAccumulator += actualPower * hoursDelta;
    }
    this.lastUpdateTime = now;

    // Calculate performance metrics
    const performanceRatio = expectedPower > 0 ? actualPower / expectedPower : 1;
    const onlineInverters = inverters.filter((i) => i.status === 'online').length;
    const availability = (onlineInverters / Math.max(1, inverters.length)) * 100;

    // Check for performance alerts
    if (weather.isDay && performanceRatio < 0.7) {
      const perfAlert = checkPerformanceThreshold(performanceRatio);
      if (perfAlert) {
        this.addAlert(perfAlert);
      }
    }

    return {
      timestamp: now.toISOString(),
      designId: this.config.designId,
      weather: effectiveWeather,
      system: {
        powerOutput: actualPower,
        energyToday: this.energyAccumulator,
        expectedPower,
        performanceRatio,
        availability,
        gridExport: actualPower * 0.98, // Small station consumption
      },
      inverters,
      transformers,
      panelZones,
    };
  }

  /**
   * Simulate inverter telemetry
   */
  private simulateInverters(
    totalExpectedPower: number,
    weather: WeatherData
  ): InverterTelemetry[] {
    const inverters: InverterTelemetry[] = [];
    const powerPerInverter = totalExpectedPower / Math.max(1, this.config.inverterCount);

    for (let i = 0; i < this.config.inverterCount; i++) {
      const equipmentId = `inv-${i + 1}`;

      // Check for new faults
      if (this.config.enableRandomFaults && !this.hasActiveFault(equipmentId)) {
        const fault = maybeGenerateInverterFault(
          equipmentId,
          this.config.faultProbability
        );
        if (fault) {
          this.addAlert(fault);
        }
      }

      const hasFault = this.hasActiveFault(equipmentId);
      const activeFault = hasFault ? this.activeFaults.get(equipmentId) : null;
      const status: EquipmentStatus = hasFault ? 'fault' : 'online';

      // Add realistic variation (+/- 5%)
      const variation = 1 + (Math.random() - 0.5) * 0.1;

      // Fault reduces output to 0
      const acPower = hasFault ? 0 : powerPerInverter * variation;
      const dcPower = acPower > 0 ? acPower * 1.02 : 0; // DC slightly higher due to conversion loss

      // MPPT simulation (2 channels)
      const nominalVoltage = 650;
      const mpptVoltage = dcPower > 0
        ? [nominalVoltage + Math.random() * 50, nominalVoltage - 10 + Math.random() * 50]
        : [0, 0];
      const mpptCurrent = dcPower > 0
        ? [dcPower / 2 / mpptVoltage[0], dcPower / 2 / mpptVoltage[1]]
        : [0, 0];

      // Temperature: elevated if INV_004 (temperature fault)
      const isTemperatureFault = activeFault?.title === 'INV_004';
      const temperature = isTemperatureFault
        ? 85 + Math.random() * 10 // Overheating: 85-95°C
        : weather.temperature + 15 + Math.random() * 10; // Normal: ambient + 15-25°C

      inverters.push({
        equipmentId,
        name: `INV-${String(i + 1).padStart(2, '0')}`,
        status,
        dcPower,
        acPower,
        efficiency: dcPower > 0 ? (acPower / dcPower) * 100 : 0,
        temperature,
        mpptVoltage,
        mpptCurrent,
        faultCode: hasFault ? activeFault?.title : undefined,
        faultMessage: hasFault ? activeFault?.message : undefined,
      });
    }

    return inverters;
  }

  /**
   * Simulate transformer telemetry
   */
  private simulateTransformers(totalPower: number): TransformerTelemetry[] {
    const transformers: TransformerTelemetry[] = [];
    const powerPerTransformer = totalPower / Math.max(1, this.config.transformerCount);

    // Assume transformer rated capacity is 1.1x plant capacity per transformer
    const ratedCapacity = (this.config.capacityKwp * 1.1) / Math.max(1, this.config.transformerCount);

    for (let i = 0; i < this.config.transformerCount; i++) {
      const equipmentId = `xfr-${i + 1}`;

      // Check for new faults
      if (this.config.enableRandomFaults && !this.hasActiveFault(equipmentId)) {
        const fault = maybeGenerateTransformerFault(
          equipmentId,
          this.config.faultProbability * 0.5 // Transformers fault less often
        );
        if (fault) {
          this.addAlert(fault);
        }
      }

      const hasFault = this.hasActiveFault(equipmentId);
      const activeFault = hasFault ? this.activeFaults.get(equipmentId) : null;
      const status: EquipmentStatus = hasFault ? 'warning' : 'online';

      const loadPercent = (powerPerTransformer / ratedCapacity) * 100;

      // Temperature rises with load
      const baseTemp = 40;
      const tempRise = loadPercent * 0.3;

      // Check for temperature-related faults
      const isWindingTempFault = activeFault?.title === 'XFR_001';
      const isOilTempFault = activeFault?.title === 'XFR_002';

      // Winding temperature: elevated if XFR_001
      const temperature = isWindingTempFault
        ? 95 + Math.random() * 10 // Overheating: 95-105°C
        : baseTemp + tempRise + Math.random() * 5; // Normal

      // Oil temperature: elevated if XFR_002
      const oilTemperature = isOilTempFault
        ? 80 + Math.random() * 10 // Elevated: 80-90°C
        : baseTemp - 5 + tempRise * 0.8 + Math.random() * 3; // Normal

      transformers.push({
        equipmentId,
        name: `XFR-${String(i + 1).padStart(2, '0')}`,
        status,
        loadPercent: Math.min(100, loadPercent + Math.random() * 2),
        temperature,
        oilTemperature,
        tapPosition: 5, // Neutral tap position
      });
    }

    return transformers;
  }

  /**
   * Simulate panel zone performance
   */
  private simulatePanelZones(
    weather: WeatherData,
    cellTemp: number
  ): PanelZonePerformance[] {
    const zones: PanelZonePerformance[] = [];
    const panelsPerZone = Math.ceil(this.config.panelCount / this.config.zoneCount);

    for (let i = 0; i < this.config.zoneCount; i++) {
      const zoneId = `zone-${String.fromCharCode(65 + i)}`; // zone-A, zone-B, etc.
      const startIndex = i * panelsPerZone;
      const endIndex = Math.min(startIndex + panelsPerZone, this.config.panelCount);
      const panelIndices = Array.from(
        { length: endIndex - startIndex },
        (_, j) => startIndex + j
      );

      // Check for new panel zone faults
      if (this.config.enableRandomFaults && !this.hasActivePanelZoneFault(zoneId)) {
        // Lower probability for panel faults (they affect larger areas)
        const result = maybeGeneratePanelZoneFault(
          zoneId,
          this.config.faultProbability * 0.3
        );
        if (result) {
          this.activePanelZoneFaults.set(zoneId, result.fault);
          this.addAlert(result.alert);

          // Schedule auto-clear if applicable
          if (result.alert.autoClearMs && result.alert.autoClearMs > 0) {
            setTimeout(() => {
              this.activePanelZoneFaults.delete(zoneId);
            }, result.alert.autoClearMs);
          }
        }
      }

      // Add variation between zones (+/- 10%)
      let zoneVariation = 0.9 + Math.random() * 0.2;

      // Soiling varies by zone
      const zoneSoiling = this.config.soilingLoss * (0.8 + Math.random() * 0.4);

      // Apply fault effects if zone has an active fault
      const activeFault = this.activePanelZoneFaults.get(zoneId);
      let faultType = activeFault?.faultType;
      if (activeFault) {
        // Apply performance impact from fault
        zoneVariation *= activeFault.performanceImpact;
      }

      zones.push({
        zoneId,
        panelIndices,
        avgIrradiance: weather.irradiance * zoneVariation,
        avgTemperature: activeFault?.faultType === 'hot_spot'
          ? cellTemp + 20 + Math.random() * 15 // Hot spot: significantly elevated temperature
          : cellTemp + (Math.random() - 0.5) * 5,
        performanceIndex: zoneVariation * (1 - zoneSoiling),
        soilingFactor: 1 - zoneSoiling,
        faultType,
      });
    }

    return zones;
  }

  /**
   * Get current configuration
   */
  getConfig(): SimulationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Create a simulator with default configuration
 */
export function createSimulator(config: Partial<SimulationConfig> & {
  designId: string;
  capacityKwp: number;
  latitude: number;
  longitude: number;
}): DigitalTwinSimulator {
  const fullConfig: SimulationConfig = {
    inverterCount: 1,
    transformerCount: 1,
    panelCount: 100,
    zoneCount: 4,
    enableRandomFaults: true,
    faultProbability: 0.01,
    soilingLoss: 0.02,
    mismatchLoss: 0.02,
    ...config,
  };

  return new DigitalTwinSimulator(fullConfig);
}
