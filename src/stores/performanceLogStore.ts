import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PerformanceLog,
  PerformancePeriod,
  PerformanceKPIs,
} from '@/lib/types/performanceLog';
import { calculatePerformanceKPIs } from '@/lib/types/performanceLog';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

interface CreatePerformanceLogData {
  projectId: string;
  siteId?: string;
  period: PerformancePeriod;
  startDate: string;
  endDate: string;
  actualProduction: number;
  expectedProduction?: number;
  irradiance?: number;
  irradianceType?: 'poa' | 'ghi';
  availabilityPercent?: number;
  gridExport?: number;
  curtailment?: number;
  avgTemperature?: number;
  snowDays?: number;
  soilingLoss?: number;
  notes?: string;
  anomalies?: string;
}

interface PerformanceLogState {
  // State
  logs: PerformanceLog[];

  // Actions
  createLog: (data: CreatePerformanceLogData) => string | undefined;
  updateLog: (
    id: string,
    updates: Partial<Omit<PerformanceLog, 'id' | 'projectId' | 'createdAt' | 'creatorId' | 'createdBy'>>
  ) => void;
  deleteLog: (id: string) => void;

  // Helpers
  getLogsByProject: (projectId: string) => PerformanceLog[];
  getLogById: (id: string) => PerformanceLog | undefined;
  getLogsByDateRange: (projectId: string, startDate: string, endDate: string) => PerformanceLog[];
  getKPIs: (projectId: string) => PerformanceKPIs;
  getMonthlyLogs: (projectId: string, year: number) => PerformanceLog[];
}

export const usePerformanceLogStore = create<PerformanceLogState>()(
  persist(
    (set, get) => ({
      logs: [],

      createLog: (data) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create performance logs');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'performance_logs',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create performance logs');
          return;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        // Calculate performance ratio if both values provided
        let performanceRatio: number | undefined;
        if (data.expectedProduction && data.expectedProduction > 0) {
          performanceRatio = data.actualProduction / data.expectedProduction;
        }

        const newLog: PerformanceLog = {
          id: crypto.randomUUID(),
          projectId: data.projectId,
          siteId: data.siteId,
          period: data.period,
          startDate: data.startDate,
          endDate: data.endDate,
          actualProduction: data.actualProduction,
          expectedProduction: data.expectedProduction,
          performanceRatio,
          irradiance: data.irradiance,
          irradianceType: data.irradianceType,
          availabilityPercent: data.availabilityPercent,
          gridExport: data.gridExport,
          curtailment: data.curtailment,
          avgTemperature: data.avgTemperature,
          snowDays: data.snowDays,
          soilingLoss: data.soilingLoss,
          notes: data.notes,
          anomalies: data.anomalies,
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          logs: [...state.logs, newLog],
        }));

        logAdminAction('create', 'performance_logs', newLog.id, `${data.period} log`, {
          projectId: data.projectId,
          period: data.period,
          startDate: data.startDate,
          actualProduction: data.actualProduction,
        });

        toast.success('Performance log created');
        return newLog.id;
      },

      updateLog: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update performance logs');
          return;
        }

        const log = get().logs.find((l) => l.id === id);
        if (!log) {
          toast.error('Performance log not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'performance_logs',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = log.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update performance logs');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only update logs you created');
          return;
        }

        // Recalculate performance ratio if production values changed
        let performanceRatio = log.performanceRatio;
        const actualProduction = updates.actualProduction ?? log.actualProduction;
        const expectedProduction = updates.expectedProduction ?? log.expectedProduction;
        if (expectedProduction && expectedProduction > 0) {
          performanceRatio = actualProduction / expectedProduction;
        }

        set((state) => ({
          logs: state.logs.map((l) =>
            l.id === id
              ? { ...l, ...updates, performanceRatio, updatedAt: new Date().toISOString() }
              : l
          ),
        }));

        logAdminAction('update', 'performance_logs', id, `${log.period} log`, {
          updatedFields: Object.keys(updates),
        });

        toast.success('Performance log updated');
      },

      deleteLog: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete performance logs');
          return;
        }

        const log = get().logs.find((l) => l.id === id);
        if (!log) {
          toast.error('Performance log not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'performance_logs',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = log.creatorId === currentUser.id;

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete performance logs');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only delete logs you created');
          return;
        }

        set((state) => ({
          logs: state.logs.filter((l) => l.id !== id),
        }));

        logAdminAction('delete', 'performance_logs', id, `${log.period} log`);

        toast.success('Performance log deleted');
      },

      getLogsByProject: (projectId) => {
        return get().logs.filter((l) => l.projectId === projectId);
      },

      getLogById: (id) => {
        return get().logs.find((l) => l.id === id);
      },

      getLogsByDateRange: (projectId, startDate, endDate) => {
        return get().logs.filter((l) => {
          if (l.projectId !== projectId) return false;
          return l.startDate >= startDate && l.endDate <= endDate;
        });
      },

      getKPIs: (projectId) => {
        const projectLogs = get().getLogsByProject(projectId);
        return calculatePerformanceKPIs(projectLogs);
      },

      getMonthlyLogs: (projectId, year) => {
        return get().logs.filter((l) => {
          if (l.projectId !== projectId || l.period !== 'monthly') return false;
          return l.startDate.startsWith(String(year));
        }).sort((a, b) => a.startDate.localeCompare(b.startDate));
      },
    }),
    { name: 'performance-log-storage' }
  )
);
