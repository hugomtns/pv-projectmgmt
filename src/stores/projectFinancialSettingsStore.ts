import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ProjectFinancialSettings,
  DefaultFinancialAssumptions,
} from '@/lib/types/financial';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '@/lib/types/financial';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

interface ProjectFinancialSettingsState {
  // State
  settings: ProjectFinancialSettings[];

  // CRUD Actions
  createSettings: (
    projectId: string,
    defaults?: Partial<DefaultFinancialAssumptions>
  ) => string | undefined;
  updateSettings: (
    id: string,
    updates: Partial<Omit<ProjectFinancialSettings, 'id' | 'projectId' | 'createdAt'>>
  ) => void;
  deleteSettings: (id: string) => void;

  // Winner Management
  setWinnerDesign: (projectId: string, designId: string) => void;
  clearWinner: (projectId: string) => void;

  // Helpers
  getSettingsByProject: (projectId: string) => ProjectFinancialSettings | undefined;
  getSettingsById: (id: string) => ProjectFinancialSettings | undefined;
}

export const useProjectFinancialSettingsStore = create<ProjectFinancialSettingsState>()(
  persist(
    (set, get) => ({
      settings: [],

      createSettings: (projectId, defaultsOverride) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create financial settings');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'financials',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create financial settings');
          return;
        }

        // Check if project already has settings
        const existing = get().settings.find((s) => s.projectId === projectId);
        if (existing) {
          toast.error('This project already has financial settings');
          return existing.id;
        }

        const now = new Date().toISOString();

        const newSettings: ProjectFinancialSettings = {
          id: crypto.randomUUID(),
          projectId,
          defaultAssumptions: {
            ...DEFAULT_FINANCIAL_ASSUMPTIONS,
            ...defaultsOverride,
          },
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          settings: [...state.settings, newSettings],
        }));

        logAdminAction('create', 'financials', newSettings.id, `Project ${projectId} Settings`, {
          projectId,
        });

        toast.success('Financial settings created successfully');
        return newSettings.id;
      },

      updateSettings: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update financial settings');
          return;
        }

        const settings = get().settings.find((s) => s.id === id);
        if (!settings) {
          toast.error('Financial settings not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'financials',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update financial settings');
          return;
        }

        set((state) => ({
          settings: state.settings.map((s) =>
            s.id === id
              ? { ...s, ...updates, updatedAt: new Date().toISOString() }
              : s
          ),
        }));

        logAdminAction('update', 'financials', id, `Project ${settings.projectId} Settings`, {
          updatedFields: Object.keys(updates),
        });
      },

      deleteSettings: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete financial settings');
          return;
        }

        const settings = get().settings.find((s) => s.id === id);
        if (!settings) {
          toast.error('Financial settings not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'financials',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';

        if (!permissions.delete || !isAdmin) {
          toast.error('Permission denied: Only admins can delete financial settings');
          return;
        }

        set((state) => ({
          settings: state.settings.filter((s) => s.id !== id),
        }));

        logAdminAction('delete', 'financials', id, `Project ${settings.projectId} Settings`);

        toast.success('Financial settings deleted');
      },

      setWinnerDesign: (projectId, designId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to set winner design');
          return;
        }

        const settings = get().settings.find((s) => s.projectId === projectId);
        if (!settings) {
          toast.error('Financial settings not found for this project');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'financials',
          settings.id,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to set winner design');
          return;
        }

        set((state) => ({
          settings: state.settings.map((s) =>
            s.projectId === projectId
              ? { ...s, winnerDesignId: designId, updatedAt: new Date().toISOString() }
              : s
          ),
        }));

        logAdminAction('update', 'financials', settings.id, `Project ${projectId} Settings`, {
          action: 'set_winner_design',
          designId,
        });

        toast.success('Winner design set successfully');
      },

      clearWinner: (projectId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to clear winner design');
          return;
        }

        const settings = get().settings.find((s) => s.projectId === projectId);
        if (!settings) {
          toast.error('Financial settings not found for this project');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'financials',
          settings.id,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to clear winner design');
          return;
        }

        set((state) => ({
          settings: state.settings.map((s) =>
            s.projectId === projectId
              ? { ...s, winnerDesignId: undefined, updatedAt: new Date().toISOString() }
              : s
          ),
        }));

        logAdminAction('update', 'financials', settings.id, `Project ${projectId} Settings`, {
          action: 'clear_winner_design',
        });

        toast.success('Winner design cleared');
      },

      // Helpers
      getSettingsByProject: (projectId) => {
        return get().settings.find((s) => s.projectId === projectId);
      },

      getSettingsById: (id) => {
        return get().settings.find((s) => s.id === id);
      },
    }),
    { name: 'project-financial-settings-storage' }
  )
);
