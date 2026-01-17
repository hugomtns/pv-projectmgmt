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
  PanelFramePerformance,
  DigitalTwinAlert,
  EquipmentStatus,
  PanelFault,
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
  maybeGeneratePanelFault,
  generateRandomFault,
  getRandomPanelFault,
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
  private activePanelFaults: Map<number, PanelFault> = new Map(); // Track individual panel faults by panel index
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
   * Clear a panel fault by panel index
   */
  clearPanelFault(panelIndex: number): void {
    this.activePanelFaults.delete(panelIndex);
  }

  /**
   * Legacy method - clear panel fault by equipment ID (e.g., "panel-0")
   */
  clearPanelZoneFault(equipmentId: string): void {
    const match = equipmentId.match(/^panel-(\d+)$/);
    if (match) {
      this.activePanelFaults.delete(parseInt(match[1], 10));
    }
  }

  /**
   * Check if equipment has an active fault
   */
  private hasActiveFault(equipmentId: string): boolean {
    return this.activeFaults.has(equipmentId);
  }

  /**
   * Check if a panel has an active fault
   */
  private hasActivePanelFault(panelIndex: number): boolean {
    return this.activePanelFaults.has(panelIndex);
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

    // Generate individual panel frame performance
    const panelFrames = this.simulatePanelFrames(effectiveWeather, cellTemp);

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
      panelFrames,
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
   * Simulate individual panel frame performance
   */
  private simulatePanelFrames(
    weather: WeatherData,
    cellTemp: number
  ): PanelFramePerformance[] {
    const panels: PanelFramePerformance[] = [];
    const maxFaults = this.config.maxConcurrentPanelFaults || 5;

    // Check if we can generate new faults (limit concurrent faults)
    const canGenerateNewFault =
      this.config.enableRandomFaults &&
      this.activePanelFaults.size < maxFaults;

    // Calculate fault probability per panel (much lower since there are many panels)
    // Scale by panel count to maintain similar overall fault rate
    const faultProbabilityPerPanel = canGenerateNewFault
      ? (this.config.faultProbability * 0.3) / Math.max(1, this.config.panelCount / 100)
      : 0;

    for (let i = 0; i < this.config.panelCount; i++) {
      // Check for new faults on this panel
      if (faultProbabilityPerPanel > 0 && !this.hasActivePanelFault(i)) {
        const result = maybeGeneratePanelFault(i, faultProbabilityPerPanel);
        if (result) {
          this.activePanelFaults.set(i, result.fault);
          this.addAlert(result.alert);

          // Schedule auto-clear if applicable
          if (result.alert.autoClearMs && result.alert.autoClearMs > 0) {
            setTimeout(() => {
              this.activePanelFaults.delete(i);
            }, result.alert.autoClearMs);
          }
        }
      }

      // Add variation per panel (+/- 5%)
      let variation = 0.95 + Math.random() * 0.1;

      // Apply fault effects if panel has an active fault
      const activeFault = this.activePanelFaults.get(i);
      const faultType = activeFault?.faultType;
      if (activeFault) {
        variation *= activeFault.performanceImpact;
      }

      // Calculate temperature - elevated for hot spot faults
      const temperature = activeFault?.faultType === 'hot_spot'
        ? cellTemp + 20 + Math.random() * 15
        : cellTemp + (Math.random() - 0.5) * 3;

      panels.push({
        panelIndex: i,
        avgIrradiance: weather.irradiance * variation,
        temperature,
        performanceIndex: variation,
        faultType,
      });
    }

    return panels;
  }

  /**
   * Inject a fault manually for testing
   * @param category The category of equipment to fault
   * @returns The generated alert, or null if no suitable equipment found
   */
  public injectFault(category: 'inverter' | 'transformer' | 'panel'): DigitalTwinAlert | null {
    if (category === 'inverter') {
      // Find an inverter without an active fault
      for (let i = 0; i < this.config.inverterCount; i++) {
        const equipmentId = `inv-${i + 1}`;
        if (!this.hasActiveFault(equipmentId)) {
          const alert = generateRandomFault('inverter', equipmentId);
          if (alert) {
            this.addAlert(alert);
            return alert;
          }
        }
      }
    } else if (category === 'transformer') {
      // Find a transformer without an active fault
      for (let i = 0; i < this.config.transformerCount; i++) {
        const equipmentId = `xfr-${i + 1}`;
        if (!this.hasActiveFault(equipmentId)) {
          const alert = generateRandomFault('transformer', equipmentId);
          if (alert) {
            this.addAlert(alert);
            return alert;
          }
        }
      }
    } else if (category === 'panel') {
      // Find a random panel without an active fault
      const availablePanels: number[] = [];
      for (let i = 0; i < this.config.panelCount; i++) {
        if (!this.hasActivePanelFault(i)) {
          availablePanels.push(i);
        }
      }

      if (availablePanels.length > 0) {
        const panelIndex = availablePanels[Math.floor(Math.random() * availablePanels.length)];
        const faultDef = getRandomPanelFault();

        const fault: PanelFault = {
          panelIndex,
          faultType: faultDef.type,
          startTime: new Date().toISOString(),
          performanceImpact: faultDef.performanceImpact,
        };

        const alert: DigitalTwinAlert = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          severity: faultDef.severity,
          category: 'panel',
          equipmentId: `panel-${panelIndex}`,
          title: faultDef.code,
          message: `${faultDef.message} (Panel ${panelIndex + 1})`,
          acknowledged: false,
          autoClearMs: faultDef.autoClearMs,
        };

        this.activePanelFaults.set(panelIndex, fault);
        this.addAlert(alert);

        // Schedule auto-clear if applicable
        if (alert.autoClearMs && alert.autoClearMs > 0) {
          setTimeout(() => {
            this.activePanelFaults.delete(panelIndex);
          }, alert.autoClearMs);
        }

        return alert;
      }
    }

    return null;
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
    enableRandomFaults: true,
    faultProbability: 0.01,
    soilingLoss: 0.02,
    mismatchLoss: 0.02,
    maxConcurrentPanelFaults: 5,
    ...config,
  };

  return new DigitalTwinSimulator(fullConfig);
}
