import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinancialModel, FinancialInputs, ProjectResults } from '@/lib/types/financial';
import { DEFAULT_FINANCIAL_INPUTS } from '@/lib/types/financial';
import type { YieldEstimate, YieldCalculationInput } from '@/lib/yield/types';
import { calculateYield } from '@/lib/yield';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

interface FinancialState {
  // State
  financialModels: FinancialModel[];

  // Actions
  addFinancialModel: (
    projectId: string,
    name: string,
    inputs?: Partial<FinancialInputs>
  ) => string | undefined;
  updateFinancialModel: (id: string, updates: Partial<FinancialModel>) => void;
  updateInputs: (id: string, inputs: Partial<FinancialInputs>) => void;
  updateResults: (id: string, results: ProjectResults) => void;
  deleteFinancialModel: (id: string) => void;

  // Yield calculation actions
  calculateYieldForModel: (
    id: string,
    input: Omit<YieldCalculationInput, 'capacityKwp'>
  ) => Promise<YieldEstimate | null>;
  applyYieldEstimate: (id: string, estimate: YieldEstimate) => void;
  clearYieldEstimate: (id: string) => void;

  // Helpers
  getModelByProject: (projectId: string) => FinancialModel | undefined;
  getModelById: (id: string) => FinancialModel | undefined;
}

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      financialModels: [],

      addFinancialModel: (projectId, name, inputOverrides) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create financial models');
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
          toast.error('Permission denied: You do not have permission to create financial models');
          return;
        }

        // Check if project already has a financial model
        const existing = get().financialModels.find((m) => m.projectId === projectId);
        if (existing) {
          toast.error('This project already has a financial model');
          return existing.id;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        const newModel: FinancialModel = {
          id: crypto.randomUUID(),
          projectId,
          name,
          inputs: {
            ...DEFAULT_FINANCIAL_INPUTS,
            ...inputOverrides,
          },
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          financialModels: [...state.financialModels, newModel],
        }));

        logAdminAction('create', 'financials', newModel.id, name, {
          projectId,
        });

        toast.success('Financial model created successfully');
        return newModel.id;
      },

      updateFinancialModel: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update financial models');
          return;
        }

        const model = get().financialModels.find((m) => m.id === id);
        if (!model) {
          toast.error('Financial model not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'financials',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        // Check permissions: Admins can update any, Users only their own, Guests none
        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = model.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update financial models');
          return;
        }

        // Non-admin users can only update their own models
        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only update your own financial models');
          return;
        }

        set((state) => ({
          financialModels: state.financialModels.map((m) =>
            m.id === id
              ? { ...m, ...updates, updatedAt: new Date().toISOString() }
              : m
          ),
        }));

        logAdminAction('update', 'financials', id, model.name, {
          updatedFields: Object.keys(updates),
        });
      },

      updateInputs: (id, inputUpdates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update financial models');
          return;
        }

        const model = get().financialModels.find((m) => m.id === id);
        if (!model) {
          toast.error('Financial model not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'financials',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        // Check permissions: Admins can update any, Users only their own, Guests none
        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = model.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied');
          return;
        }

        // Non-admin users can only update their own models
        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only update your own financial models');
          return;
        }

        set((state) => ({
          financialModels: state.financialModels.map((m) =>
            m.id === id
              ? {
                  ...m,
                  inputs: { ...m.inputs, ...inputUpdates },
                  results: undefined, // Clear cached results when inputs change
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));

        logAdminAction('update', 'financials', id, model.name, {
          updatedInputs: Object.keys(inputUpdates),
        });
      },

      updateResults: (id, results) => {
        set((state) => ({
          financialModels: state.financialModels.map((m) =>
            m.id === id
              ? { ...m, results, updatedAt: new Date().toISOString() }
              : m
          ),
        }));
      },

      deleteFinancialModel: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete financial models');
          return;
        }

        const model = get().financialModels.find((m) => m.id === id);
        if (!model) {
          toast.error('Financial model not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'financials',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        // Check permissions: Admins can delete any, Users only their own, Guests none
        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = model.creatorId === currentUser.id;

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete financial models');
          return;
        }

        // Non-admin users can only delete their own models
        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only delete your own financial models');
          return;
        }

        set((state) => ({
          financialModels: state.financialModels.filter((m) => m.id !== id),
        }));

        logAdminAction('delete', 'financials', id, model.name);

        toast.success('Financial model deleted');
      },

      // Yield calculation actions
      calculateYieldForModel: async (id, input) => {
        console.log('[Store] calculateYieldForModel called', { id, input });
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          console.log('[Store] No current user');
          toast.error('You must be logged in to calculate yield');
          return null;
        }

        const model = get().financialModels.find((m) => m.id === id);
        if (!model) {
          console.log('[Store] Model not found');
          toast.error('Financial model not found');
          return null;
        }
        console.log('[Store] Found model:', model.name);

        const permissions = resolvePermissions(
          currentUser,
          'financials',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = model.creatorId === currentUser.id;

        if (!permissions.update || (!isAdmin && !isCreator)) {
          console.log('[Store] Permission denied', { permissions, isAdmin, isCreator });
          toast.error('Permission denied');
          return null;
        }

        // Get capacity from model (convert MW to kWp)
        const capacityKwp = model.inputs.capacity * 1000;
        console.log('[Store] Capacity:', capacityKwp, 'kWp');

        try {
          console.log('[Store] Calling calculateYield...');
          const result = await calculateYield({
            ...input,
            capacityKwp,
          });
          console.log('[Store] calculateYield result:', result);

          if (result.success && result.estimate) {
            return result.estimate;
          } else {
            toast.error(result.error || 'Failed to calculate yield');
            return null;
          }
        } catch (error) {
          console.error('[Store] Error calculating yield:', error);
          toast.error('Failed to calculate yield');
          return null;
        }
      },

      applyYieldEstimate: (id, estimate) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to apply yield estimate');
          return;
        }

        const model = get().financialModels.find((m) => m.id === id);
        if (!model) {
          toast.error('Financial model not found');
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
        const isCreator = model.creatorId === currentUser.id;

        if (!permissions.update || (!isAdmin && !isCreator)) {
          toast.error('Permission denied');
          return;
        }

        // Convert annual yield from kWh to MWh for p50_year_0_yield
        const p50YieldMwh = estimate.annualYield / 1000;

        set((state) => ({
          financialModels: state.financialModels.map((m) =>
            m.id === id
              ? {
                  ...m,
                  inputs: {
                    ...m.inputs,
                    p50_year_0_yield: p50YieldMwh,
                    yieldEstimate: estimate,
                  },
                  results: undefined, // Clear cached results
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));

        logAdminAction('update', 'financials', id, model.name, {
          action: 'apply_yield_estimate',
          source: estimate.source,
          annualYield: estimate.annualYield,
        });

        toast.success('Yield estimate applied');
      },

      clearYieldEstimate: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const model = get().financialModels.find((m) => m.id === id);
        if (!model) {
          toast.error('Financial model not found');
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
        const isCreator = model.creatorId === currentUser.id;

        if (!permissions.update || (!isAdmin && !isCreator)) {
          toast.error('Permission denied');
          return;
        }

        set((state) => ({
          financialModels: state.financialModels.map((m) =>
            m.id === id
              ? {
                  ...m,
                  inputs: {
                    ...m.inputs,
                    yieldEstimate: undefined,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));

        logAdminAction('update', 'financials', id, model.name, {
          action: 'clear_yield_estimate',
        });

        toast.success('Yield estimate cleared');
      },

      // Helpers
      getModelByProject: (projectId) => {
        return get().financialModels.find((m) => m.projectId === projectId);
      },

      getModelById: (id) => {
        return get().financialModels.find((m) => m.id === id);
      },
    }),
    { name: 'financial-storage' }
  )
);
