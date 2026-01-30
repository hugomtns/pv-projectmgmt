import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DesignFinancialModel,
  ProjectResults,
  CostLineItem,
  FinancingParameters,
} from '@/lib/types/financial';
import {
  DEFAULT_FINANCIAL_ASSUMPTIONS,
  DEFAULT_FINANCING_PARAMETERS,
} from '@/lib/types/financial';
import type { YieldEstimate, YieldCalculationInput } from '@/lib/yield/types';
import { calculateYield } from '@/lib/yield';
import { useUserStore } from './userStore';
import { useProjectFinancialSettingsStore } from './projectFinancialSettingsStore';
import { useDesignStore } from './designStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

interface DesignFinancialState {
  // State
  designFinancialModels: DesignFinancialModel[];

  // CRUD Actions
  addModel: (
    designId: string,
    name: string,
    overrides?: Partial<DesignFinancialModel>
  ) => string | undefined;
  updateModel: (id: string, updates: Partial<DesignFinancialModel>) => void;
  deleteModel: (id: string) => void;

  // Specific Update Actions
  updateCapex: (id: string, capex: CostLineItem[]) => void;
  updateOpex: (id: string, opex: CostLineItem[]) => void;
  updateFinancing: (id: string, financing: Partial<FinancingParameters>) => void;
  updateResults: (id: string, results: ProjectResults) => void;

  // Winner Management
  markAsWinner: (id: string) => void;

  // Yield calculation actions
  calculateYieldForModel: (
    id: string,
    input: Omit<YieldCalculationInput, 'capacityKwp'>
  ) => Promise<YieldEstimate | null>;
  applyYieldEstimate: (id: string, estimate: YieldEstimate) => void;
  clearYieldEstimate: (id: string) => void;

  // Helpers
  getModelByDesign: (designId: string) => DesignFinancialModel | undefined;
  getModelsByProject: (projectId: string) => DesignFinancialModel[];
  getWinnerModelByProject: (projectId: string) => DesignFinancialModel | undefined;
  getModelById: (id: string) => DesignFinancialModel | undefined;
}

export const useDesignFinancialStore = create<DesignFinancialState>()(
  persist(
    (set, get) => ({
      designFinancialModels: [],

      addModel: (designId, name, overrides) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create design financial models');
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

        // Get design to extract projectId
        const design = useDesignStore.getState().designs.find((d) => d.id === designId);
        if (!design) {
          toast.error('Design not found');
          return;
        }

        // Check if design already has a financial model
        const existing = get().designFinancialModels.find((m) => m.designId === designId);
        if (existing) {
          toast.error('This design already has a financial model');
          return existing.id;
        }

        // Get project defaults (if settings exist)
        const projectSettings = useProjectFinancialSettingsStore
          .getState()
          .getSettingsByProject(design.projectId);

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        // Build default model
        const defaultModel: DesignFinancialModel = {
          id: crypto.randomUUID(),
          designId,
          projectId: design.projectId,
          name,

          // Core inputs (defaults)
          capacity: 300, // MW
          p50_year_0_yield: 577_920, // MWh (300 MW × 0.22 CF × 8760 hours)
          ppa_price: 65, // $/MWh

          // Cost line items
          capex: [],
          opex: [],
          global_margin: 0,

          // Technical/Economic params (inherit from project or use defaults)
          ...(projectSettings?.defaultAssumptions || DEFAULT_FINANCIAL_ASSUMPTIONS),

          // Financing params
          financing: { ...DEFAULT_FINANCING_PARAMETERS },

          // Winner status
          isWinner: false,

          // Metadata
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        // Apply overrides
        const newModel: DesignFinancialModel = {
          ...defaultModel,
          ...overrides,
        };

        set((state) => ({
          designFinancialModels: [...state.designFinancialModels, newModel],
        }));

        logAdminAction('create', 'financials', newModel.id, name, {
          designId,
          projectId: design.projectId,
        });

        toast.success('Design financial model created successfully');
        return newModel.id;
      },

      updateModel: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update financial models');
          return;
        }

        const model = get().designFinancialModels.find((m) => m.id === id);
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
          toast.error('Permission denied: You can only update your own financial models');
          return;
        }

        set((state) => ({
          designFinancialModels: state.designFinancialModels.map((m) =>
            m.id === id
              ? { ...m, ...updates, updatedAt: new Date().toISOString() }
              : m
          ),
        }));

        logAdminAction('update', 'financials', id, model.name, {
          updatedFields: Object.keys(updates),
        });
      },

      deleteModel: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete financial models');
          return;
        }

        const model = get().designFinancialModels.find((m) => m.id === id);
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

        if (!permissions.delete || (!isAdmin && !isCreator)) {
          toast.error('Permission denied: You can only delete your own financial models');
          return;
        }

        // If this was the winner, clear winner status
        if (model.isWinner) {
          useProjectFinancialSettingsStore.getState().clearWinner(model.projectId);
          useDesignStore.getState().clearFinancialWinner(model.projectId);
        }

        set((state) => ({
          designFinancialModels: state.designFinancialModels.filter((m) => m.id !== id),
        }));

        logAdminAction('delete', 'financials', id, model.name);

        toast.success('Financial model deleted');
      },

      updateCapex: (id, capex) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update CAPEX');
          return;
        }

        const model = get().designFinancialModels.find((m) => m.id === id);
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
          designFinancialModels: state.designFinancialModels.map((m) =>
            m.id === id
              ? {
                  ...m,
                  capex,
                  results: undefined, // Clear cached results when CAPEX changes
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));

        logAdminAction('update', 'financials', id, model.name, {
          action: 'update_capex',
          capexItems: capex.length,
        });
      },

      updateOpex: (id, opex) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update OPEX');
          return;
        }

        const model = get().designFinancialModels.find((m) => m.id === id);
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
          designFinancialModels: state.designFinancialModels.map((m) =>
            m.id === id
              ? {
                  ...m,
                  opex,
                  results: undefined, // Clear cached results when OPEX changes
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));

        logAdminAction('update', 'financials', id, model.name, {
          action: 'update_opex',
          opexItems: opex.length,
        });
      },

      updateFinancing: (id, financingUpdates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update financing');
          return;
        }

        const model = get().designFinancialModels.find((m) => m.id === id);
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
          designFinancialModels: state.designFinancialModels.map((m) =>
            m.id === id
              ? {
                  ...m,
                  financing: { ...m.financing, ...financingUpdates },
                  results: undefined, // Clear cached results
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));

        logAdminAction('update', 'financials', id, model.name, {
          action: 'update_financing',
          updatedFields: Object.keys(financingUpdates),
        });
      },

      updateResults: (id, results) => {
        set((state) => ({
          designFinancialModels: state.designFinancialModels.map((m) =>
            m.id === id
              ? { ...m, results, updatedAt: new Date().toISOString() }
              : m
          ),
        }));
      },

      markAsWinner: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to mark winner');
          return;
        }

        const model = get().designFinancialModels.find((m) => m.id === id);
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

        if (!permissions.update) {
          toast.error('Permission denied');
          return;
        }

        // Clear previous winner in this project
        set((state) => ({
          designFinancialModels: state.designFinancialModels.map((m) =>
            m.projectId === model.projectId
              ? {
                  ...m,
                  isWinner: m.id === id,
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));

        // Update project financial settings
        useProjectFinancialSettingsStore.getState().setWinnerDesign(model.projectId, model.designId);

        // Update design winner flag
        useDesignStore.getState().markAsFinancialWinner(model.designId);

        logAdminAction('update', 'financials', id, model.name, {
          action: 'mark_as_winner',
        });

        toast.success(`${model.name} marked as winner`);
      },

      // Yield calculation actions (kept from financialStore)
      calculateYieldForModel: async (id, input) => {
        console.log('[DesignFinancialStore] calculateYieldForModel called', { id, input });
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          console.log('[DesignFinancialStore] No current user');
          toast.error('You must be logged in to calculate yield');
          return null;
        }

        const model = get().designFinancialModels.find((m) => m.id === id);
        if (!model) {
          console.log('[DesignFinancialStore] Model not found');
          toast.error('Financial model not found');
          return null;
        }
        console.log('[DesignFinancialStore] Found model:', model.name);

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
          console.log('[DesignFinancialStore] Permission denied', { permissions, isAdmin, isCreator });
          toast.error('Permission denied');
          return null;
        }

        // Get capacity from model (convert MW to kWp)
        const capacityKwp = model.capacity * 1000;
        console.log('[DesignFinancialStore] Capacity:', capacityKwp, 'kWp');

        try {
          console.log('[DesignFinancialStore] Calling calculateYield...');
          const result = await calculateYield({
            ...input,
            capacityKwp,
          });
          console.log('[DesignFinancialStore] calculateYield result:', result);

          if (result.success && result.estimate) {
            return result.estimate;
          } else {
            toast.error(result.error || 'Failed to calculate yield');
            return null;
          }
        } catch (error) {
          console.error('[DesignFinancialStore] Error calculating yield:', error);
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

        const model = get().designFinancialModels.find((m) => m.id === id);
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

        // Convert annual yield from kWh to MWh for p50_year_0_yield (round to whole number)
        const p50YieldMwh = Math.round(estimate.annualYield / 1000);

        set((state) => ({
          designFinancialModels: state.designFinancialModels.map((m) =>
            m.id === id
              ? {
                  ...m,
                  p50_year_0_yield: p50YieldMwh,
                  yieldEstimate: estimate,
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

        const model = get().designFinancialModels.find((m) => m.id === id);
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
          designFinancialModels: state.designFinancialModels.map((m) =>
            m.id === id
              ? {
                  ...m,
                  yieldEstimate: undefined,
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
      getModelByDesign: (designId) => {
        return get().designFinancialModels.find((m) => m.designId === designId);
      },

      getModelsByProject: (projectId) => {
        return get().designFinancialModels.filter((m) => m.projectId === projectId);
      },

      getWinnerModelByProject: (projectId) => {
        return get().designFinancialModels.find(
          (m) => m.projectId === projectId && m.isWinner
        );
      },

      getModelById: (id) => {
        return get().designFinancialModels.find((m) => m.id === id);
      },
    }),
    { name: 'design-financial-storage' }
  )
);
