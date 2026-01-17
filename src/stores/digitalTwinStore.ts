/**
 * Digital Twin Store
 *
 * Manages the real-time state for the Digital Twin simulation.
 * Unlike other stores, this does NOT persist to localStorage since
 * telemetry data is regenerated each session.
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import type {
  TelemetrySnapshot,
  DigitalTwinAlert,
  SimulationConfig,
} from '@/lib/digitaltwin/types';
import { DigitalTwinSimulator, createSimulator } from '@/lib/digitaltwin/simulationEngine';
import { fetchCurrentWeather } from '@/lib/digitaltwin/weatherClient';

interface DigitalTwinState {
  // Simulation state
  isActive: boolean;
  isLoading: boolean;
  error: string | null;

  // Current telemetry
  currentSnapshot: TelemetrySnapshot | null;

  // Alert management
  alerts: DigitalTwinAlert[];

  // Historical data (last hour for charts)
  snapshotHistory: TelemetrySnapshot[];
  maxHistoryLength: number;

  // Configuration
  updateIntervalMs: number;
  currentConfig: SimulationConfig | null;

  // Internal (not exposed to components)
  _simulator: DigitalTwinSimulator | null;
  _intervalId: ReturnType<typeof setInterval> | null;

  // Actions
  startSimulation: (config: Omit<SimulationConfig, 'enableRandomFaults' | 'faultProbability' | 'soilingLoss' | 'mismatchLoss' | 'maxConcurrentPanelFaults'> & Partial<SimulationConfig>) => Promise<void>;
  stopSimulation: () => void;
  triggerUpdate: () => Promise<void>;

  // Alert actions
  acknowledgeAlert: (alertId: string) => void;
  clearAlert: (alertId: string) => void;
  clearAllAlerts: () => void;

  // Configuration
  setUpdateInterval: (ms: number) => void;
  setFaultProbability: (probability: number) => void;
  setSoilingLoss: (loss: number) => void;
  setMismatchLoss: (loss: number) => void;
  setEnableRandomFaults: (enabled: boolean) => void;

  // Manual fault injection
  triggerManualFault: (category: 'inverter' | 'transformer' | 'panel') => void;

  // Helpers
  getActiveAlerts: () => DigitalTwinAlert[];
  getCriticalAlerts: () => DigitalTwinAlert[];
  getAlertsByEquipment: (equipmentId: string) => DigitalTwinAlert[];
}

export const useDigitalTwinStore = create<DigitalTwinState>()((set, get) => ({
  // Initial state
  isActive: false,
  isLoading: false,
  error: null,
  currentSnapshot: null,
  alerts: [],
  snapshotHistory: [],
  maxHistoryLength: 60, // 1 hour at 1-minute intervals
  updateIntervalMs: 5000, // 5 seconds for demo
  currentConfig: null,
  _simulator: null,
  _intervalId: null,

  startSimulation: async (config) => {
    const { _intervalId } = get();

    // Clean up any existing simulation
    if (_intervalId) {
      clearInterval(_intervalId);
    }

    // Create new simulator
    const simulator = createSimulator(config);

    set({
      isActive: true,
      isLoading: true,
      error: null,
      currentSnapshot: null,
      snapshotHistory: [],
      alerts: [],
      currentConfig: simulator.getConfig(),
      _simulator: simulator,
    });

    // Run initial update
    try {
      await get().triggerUpdate();
    } catch (error) {
      console.error('[DigitalTwin] Initial update failed:', error);
    }

    // Start polling interval
    const intervalId = setInterval(() => {
      get().triggerUpdate();
    }, get().updateIntervalMs);

    set({ _intervalId: intervalId, isLoading: false });

    toast.success('Digital Twin simulation started');
  },

  stopSimulation: () => {
    const { _intervalId } = get();

    if (_intervalId) {
      clearInterval(_intervalId);
    }

    set({
      isActive: false,
      isLoading: false,
      _simulator: null,
      _intervalId: null,
      currentSnapshot: null,
      snapshotHistory: [],
      currentConfig: null,
      alerts: [], // Clear alerts when stopping
    });

    toast.success('Digital Twin simulation stopped');
  },

  triggerUpdate: async () => {
    const { _simulator, snapshotHistory, maxHistoryLength, currentConfig } = get();

    if (!_simulator || !currentConfig) {
      return;
    }

    try {
      // Fetch current weather
      const weather = await fetchCurrentWeather(
        currentConfig.latitude,
        currentConfig.longitude
      );

      // Generate telemetry snapshot
      const snapshot = await _simulator.generateTelemetry(weather);

      // Get any new alerts from simulator
      const newAlerts = _simulator.getNewAlerts();

      // Process new alerts
      if (newAlerts.length > 0) {
        set((state) => ({
          alerts: [...newAlerts, ...state.alerts].slice(0, 100),
        }));

        // Show toast for critical alerts
        newAlerts.forEach((alert) => {
          if (alert.severity === 'critical') {
            toast.error(alert.title, { description: alert.message });
          } else if (alert.severity === 'warning') {
            toast.warning?.(alert.title, { description: alert.message }) ||
              toast(alert.title, { description: alert.message });
          }
        });
      }

      // Update state with new snapshot
      const newHistory = [snapshot, ...snapshotHistory].slice(0, maxHistoryLength);

      set({
        currentSnapshot: snapshot,
        snapshotHistory: newHistory,
        error: null,
      });
    } catch (error) {
      console.error('[DigitalTwin] Update failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Update failed',
      });
    }
  },

  acknowledgeAlert: (alertId) => {
    const { _simulator, alerts } = get();

    // Find the alert to get its equipment ID or title
    const alert = alerts.find((a) => a.id === alertId);

    if (alert && _simulator) {
      if (alert.category === 'panel' && alert.equipmentId) {
        // Panel zone fault - clear by zone ID
        _simulator.clearPanelZoneFault(alert.equipmentId);
      } else if (alert.equipmentId) {
        // Equipment-level fault - clear by equipment ID
        _simulator.clearFault(alert.equipmentId);
      } else {
        // System-level alert - clear by title
        _simulator.clearSystemAlert(alert.title);
      }
    }

    // Remove the alert (fixing it clears it entirely)
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== alertId),
    }));
  },

  clearAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== alertId),
    }));
  },

  clearAllAlerts: () => {
    set({ alerts: [] });
  },

  setUpdateInterval: (ms) => {
    const { isActive, _intervalId } = get();

    // Update the interval setting
    set({ updateIntervalMs: ms });

    // If simulation is running, restart the interval
    if (isActive && _intervalId) {
      clearInterval(_intervalId);

      const newIntervalId = setInterval(() => {
        get().triggerUpdate();
      }, ms);

      set({ _intervalId: newIntervalId });
    }
  },

  setFaultProbability: (probability) => {
    const { _simulator, currentConfig } = get();

    if (_simulator && currentConfig) {
      _simulator.updateConfig({ faultProbability: probability });
      set({
        currentConfig: { ...currentConfig, faultProbability: probability },
      });
    }
  },

  setSoilingLoss: (loss) => {
    const { _simulator, currentConfig } = get();

    if (_simulator && currentConfig) {
      _simulator.updateConfig({ soilingLoss: loss });
      set({
        currentConfig: { ...currentConfig, soilingLoss: loss },
      });
    }
  },

  setMismatchLoss: (loss) => {
    const { _simulator, currentConfig } = get();

    if (_simulator && currentConfig) {
      _simulator.updateConfig({ mismatchLoss: loss });
      set({
        currentConfig: { ...currentConfig, mismatchLoss: loss },
      });
    }
  },

  setEnableRandomFaults: (enabled) => {
    const { _simulator, currentConfig } = get();

    if (_simulator && currentConfig) {
      _simulator.updateConfig({ enableRandomFaults: enabled });
      set({
        currentConfig: { ...currentConfig, enableRandomFaults: enabled },
      });
    }
  },

  triggerManualFault: (category) => {
    const { _simulator, isActive } = get();

    if (!_simulator || !isActive) {
      toast.error('Simulation must be active to trigger faults');
      return;
    }

    const alert = _simulator.injectFault(category);

    if (alert) {
      // Add the alert to the store
      set((state) => ({
        alerts: [alert, ...state.alerts].slice(0, 100),
      }));

      // Show toast notification
      if (alert.severity === 'critical') {
        toast.error(alert.title, { description: alert.message });
      } else {
        toast.warning?.(alert.title, { description: alert.message }) ||
          toast(alert.title, { description: alert.message });
      }
    } else {
      toast.info(`No available ${category} to fault`, {
        description: 'All equipment of this type already has active faults',
      });
    }
  },

  // Helper selectors
  getActiveAlerts: () => {
    return get().alerts.filter((alert) => !alert.acknowledged);
  },

  getCriticalAlerts: () => {
    return get().alerts.filter(
      (alert) => alert.severity === 'critical' && !alert.acknowledged
    );
  },

  getAlertsByEquipment: (equipmentId) => {
    return get().alerts.filter((alert) => alert.equipmentId === equipmentId);
  },
}));

// Selector hooks for common patterns
export const useDigitalTwinActive = () =>
  useDigitalTwinStore((state) => state.isActive);

export const useCurrentTelemetry = () =>
  useDigitalTwinStore((state) => state.currentSnapshot);

export const useDigitalTwinAlerts = () =>
  useDigitalTwinStore((state) => state.alerts);

export const useActiveAlertCount = () =>
  useDigitalTwinStore((state) =>
    state.alerts.filter((a) => !a.acknowledged).length
  );
