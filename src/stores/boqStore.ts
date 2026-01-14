import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BOQ,
  BOQItem,
  BOQGenerationOptions,
  BOQExportPreview,
  BOQExportItem,
} from '@/lib/types/boq';
import { DEFAULT_GENERATION_OPTIONS } from '@/lib/types/boq';
import type { CostLineItem } from '@/lib/types/financial';
import { useUserStore } from './userStore';
import { useDesignStore } from './designStore';
import { useComponentStore } from './componentStore';
import { useFinancialStore } from './financialStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { extractComponentsFromDesign } from '@/lib/dxf/componentExtractor';
// Categories and units are used by UI components, not directly in store
import { toast } from 'sonner';

interface BOQState {
  // State
  boqs: BOQ[];

  // CRUD Actions
  createBOQ: (designId: string, name?: string) => string | undefined;
  updateBOQ: (
    id: string,
    updates: Partial<Pick<BOQ, 'name'>>
  ) => void;
  deleteBOQ: (id: string) => void;

  // Item Management
  addItem: (
    boqId: string,
    item: Omit<BOQItem, 'id' | 'totalPrice'>
  ) => string | undefined;
  updateItem: (
    boqId: string,
    itemId: string,
    updates: Partial<Omit<BOQItem, 'id' | 'totalPrice'>>
  ) => void;
  deleteItem: (boqId: string, itemId: string) => void;

  // Generation Actions
  generateFromDesign: (
    boqId: string,
    options?: Partial<BOQGenerationOptions>
  ) => Promise<boolean>;
  refreshPricesFromComponents: (boqId: string) => void;

  // Export Actions
  previewExportToCapex: (boqId: string) => BOQExportPreview | null;
  exportToCapex: (boqId: string) => boolean;

  // Helpers
  getBOQByDesign: (designId: string) => BOQ | undefined;
  getBOQById: (id: string) => BOQ | undefined;
  getBOQsByProject: (projectId: string) => BOQ[];
}

// Helper to calculate totals
function calculateItemTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

function calculateBOQTotal(items: BOQItem[]): number {
  return items.reduce((sum, item) => sum + item.totalPrice, 0);
}

export const useBOQStore = create<BOQState>()(
  persist(
    (set, get) => ({
      boqs: [],

      createBOQ: (designId, name) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create a BOQ');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'boqs',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create BOQs');
          return;
        }

        // Get design to extract projectId
        const design = useDesignStore.getState().designs.find((d) => d.id === designId);
        if (!design) {
          toast.error('Design not found');
          return;
        }

        // Check if design already has a BOQ
        const existing = get().boqs.find((b) => b.designId === designId);
        if (existing) {
          toast.error('This design already has a BOQ');
          return existing.id;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        const newBOQ: BOQ = {
          id: crypto.randomUUID(),
          designId,
          projectId: design.projectId,
          name: name || `${design.name} - BOQ`,
          items: [],
          totalValue: 0,
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          boqs: [...state.boqs, newBOQ],
        }));

        toast.success('BOQ created successfully');
        return newBOQ.id;
      },

      updateBOQ: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update BOQs');
          return;
        }

        const boq = get().boqs.find((b) => b.id === id);
        if (!boq) {
          toast.error('BOQ not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'boqs',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = boq.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update BOQs');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only update your own BOQs');
          return;
        }

        set((state) => ({
          boqs: state.boqs.map((b) =>
            b.id === id
              ? { ...b, ...updates, updatedAt: new Date().toISOString() }
              : b
          ),
        }));
      },

      deleteBOQ: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete BOQs');
          return;
        }

        const boq = get().boqs.find((b) => b.id === id);
        if (!boq) {
          toast.error('BOQ not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'boqs',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = boq.creatorId === currentUser.id;

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete BOQs');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only delete your own BOQs');
          return;
        }

        set((state) => ({
          boqs: state.boqs.filter((b) => b.id !== id),
        }));

        toast.success('BOQ deleted');
      },

      addItem: (boqId, item) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to add items to a BOQ');
          return;
        }

        const boq = get().boqs.find((b) => b.id === boqId);
        if (!boq) {
          toast.error('BOQ not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'boqs',
          boqId,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = boq.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only modify your own BOQs');
          return;
        }

        const newItem: BOQItem = {
          id: crypto.randomUUID(),
          ...item,
          totalPrice: calculateItemTotal(item.quantity, item.unitPrice),
        };

        set((state) => ({
          boqs: state.boqs.map((b) => {
            if (b.id !== boqId) return b;
            const newItems = [...b.items, newItem];
            return {
              ...b,
              items: newItems,
              totalValue: calculateBOQTotal(newItems),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));

        return newItem.id;
      },

      updateItem: (boqId, itemId, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update BOQ items');
          return;
        }

        const boq = get().boqs.find((b) => b.id === boqId);
        if (!boq) {
          toast.error('BOQ not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'boqs',
          boqId,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = boq.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only modify your own BOQs');
          return;
        }

        set((state) => ({
          boqs: state.boqs.map((b) => {
            if (b.id !== boqId) return b;
            const newItems = b.items.map((item) => {
              if (item.id !== itemId) return item;
              const updated = { ...item, ...updates };
              updated.totalPrice = calculateItemTotal(
                updated.quantity,
                updated.unitPrice
              );
              return updated;
            });
            return {
              ...b,
              items: newItems,
              totalValue: calculateBOQTotal(newItems),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteItem: (boqId, itemId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete BOQ items');
          return;
        }

        const boq = get().boqs.find((b) => b.id === boqId);
        if (!boq) {
          toast.error('BOQ not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'boqs',
          boqId,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = boq.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only modify your own BOQs');
          return;
        }

        set((state) => ({
          boqs: state.boqs.map((b) => {
            if (b.id !== boqId) return b;
            const newItems = b.items.filter((item) => item.id !== itemId);
            return {
              ...b,
              items: newItems,
              totalValue: calculateBOQTotal(newItems),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      generateFromDesign: async (boqId, optionsOverride) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to generate BOQ');
          return false;
        }

        const boq = get().boqs.find((b) => b.id === boqId);
        if (!boq) {
          toast.error('BOQ not found');
          return false;
        }

        const permissions = resolvePermissions(
          currentUser,
          'boqs',
          boqId,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = boq.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied');
          return false;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only modify your own BOQs');
          return false;
        }

        const options: BOQGenerationOptions = {
          ...DEFAULT_GENERATION_OPTIONS,
          ...optionsOverride,
        };

        try {
          // Extract components from design DXF
          const extracted = await extractComponentsFromDesign(boq.designId);

          if (extracted.error) {
            toast.error(`Failed to extract from design: ${extracted.error}`);
            return false;
          }

          const newItems: BOQItem[] = [];
          const componentStore = useComponentStore.getState();

          // Get linked components for pricing
          const linkedModules = componentStore.components.filter(
            (c) =>
              c.type === 'module' &&
              c.linkedDesigns?.some((d) => d.designId === boq.designId)
          );
          const linkedInverters = componentStore.components.filter(
            (c) =>
              c.type === 'inverter' &&
              c.linkedDesigns?.some((d) => d.designId === boq.designId)
          );

          // Generate module item
          if (options.includeModules && extracted.modules) {
            let modulePrice = options.defaultModulePrice || 100;
            let moduleSourceId: string | undefined;

            if (options.useComponentLibraryPrices && linkedModules.length > 0) {
              const linkedModule = linkedModules[0];
              modulePrice = linkedModule.unitPrice || modulePrice;
              moduleSourceId = linkedModule.id;
            }

            newItems.push({
              id: crypto.randomUUID(),
              name: 'PV modules',
              category: 'PV Equipment',
              quantity: extracted.modules.count,
              unit: 'panels',
              unitPrice: modulePrice,
              totalPrice: calculateItemTotal(extracted.modules.count, modulePrice),
              source: moduleSourceId ? 'component_library' : 'dxf_extraction',
              sourceId: moduleSourceId,
            });
          }

          // Generate inverter item
          if (options.includeInverters && extracted.inverters) {
            let inverterPrice = options.defaultInverterPrice || 5000;
            let inverterSourceId: string | undefined;

            if (options.useComponentLibraryPrices && linkedInverters.length > 0) {
              const linkedInverter = linkedInverters[0];
              inverterPrice = linkedInverter.unitPrice || inverterPrice;
              inverterSourceId = linkedInverter.id;
            }

            newItems.push({
              id: crypto.randomUUID(),
              name: 'Inverters',
              category: 'PV Equipment',
              quantity: extracted.inverters.count,
              unit: 'units',
              unitPrice: inverterPrice,
              totalPrice: calculateItemTotal(extracted.inverters.count, inverterPrice),
              source: inverterSourceId ? 'component_library' : 'dxf_extraction',
              sourceId: inverterSourceId,
            });
          }

          if (newItems.length === 0) {
            toast.warning('No components found in design to generate BOQ items');
            return false;
          }

          // Replace extracted items, keep manual items
          set((state) => ({
            boqs: state.boqs.map((b) => {
              if (b.id !== boqId) return b;
              const manualItems = b.items.filter((item) => item.source === 'manual');
              const allItems = [...manualItems, ...newItems];
              return {
                ...b,
                items: allItems,
                totalValue: calculateBOQTotal(allItems),
                updatedAt: new Date().toISOString(),
              };
            }),
          }));

          toast.success(`Generated ${newItems.length} BOQ item(s) from design`);
          return true;
        } catch (error) {
          console.error('Failed to generate BOQ from design:', error);
          toast.error('Failed to generate BOQ from design');
          return false;
        }
      },

      refreshPricesFromComponents: (boqId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const boq = get().boqs.find((b) => b.id === boqId);
        if (!boq) {
          toast.error('BOQ not found');
          return;
        }

        const componentStore = useComponentStore.getState();
        let updatedCount = 0;

        set((state) => ({
          boqs: state.boqs.map((b) => {
            if (b.id !== boqId) return b;
            const newItems = b.items.map((item) => {
              // Only refresh items that came from component library
              if (item.source !== 'component_library' || !item.sourceId) {
                return item;
              }

              const component = componentStore.getComponentById(item.sourceId);
              if (!component || component.unitPrice === item.unitPrice) {
                return item;
              }

              updatedCount++;
              const newUnitPrice = component.unitPrice;
              return {
                ...item,
                unitPrice: newUnitPrice,
                totalPrice: calculateItemTotal(item.quantity, newUnitPrice),
              };
            });

            return {
              ...b,
              items: newItems,
              totalValue: calculateBOQTotal(newItems),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));

        if (updatedCount > 0) {
          toast.success(`Updated prices for ${updatedCount} item(s)`);
        } else {
          toast.info('All prices are up to date');
        }
      },

      previewExportToCapex: (boqId) => {
        const boq = get().boqs.find((b) => b.id === boqId);
        if (!boq) {
          return null;
        }

        const financialStore = useFinancialStore.getState();
        const financialModel = financialStore.getModelByProject(boq.projectId);

        const existingCapexItems = financialModel?.inputs.capex_items || [];
        const items: BOQExportItem[] = [];
        let totalNewValue = 0;
        let totalUpdateValue = 0;

        for (const boqItem of boq.items) {
          // Check if item already exists in CAPEX by name
          const existingItem = existingCapexItems.find(
            (c) => c.name === boqItem.name && c.is_capex
          );

          if (existingItem) {
            items.push({
              boqItem,
              capexCategory: boqItem.category,
              capexName: boqItem.name,
              isNew: false,
              existingQuantity: existingItem.quantity,
            });
            totalUpdateValue += boqItem.totalPrice;
          } else {
            items.push({
              boqItem,
              capexCategory: boqItem.category,
              capexName: boqItem.name,
              isNew: true,
            });
            totalNewValue += boqItem.totalPrice;
          }
        }

        return {
          items,
          totalNewValue,
          totalUpdateValue,
          hasFinancialModel: !!financialModel,
        };
      },

      exportToCapex: (boqId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to export BOQ');
          return false;
        }

        const boq = get().boqs.find((b) => b.id === boqId);
        if (!boq) {
          toast.error('BOQ not found');
          return false;
        }

        if (boq.items.length === 0) {
          toast.error('BOQ has no items to export');
          return false;
        }

        const financialStore = useFinancialStore.getState();
        let financialModel = financialStore.getModelByProject(boq.projectId);

        // Create financial model if it doesn't exist
        if (!financialModel) {
          const design = useDesignStore.getState().designs.find(
            (d) => d.id === boq.designId
          );
          const modelId = financialStore.addFinancialModel(
            boq.projectId,
            `${design?.name || 'Project'} - Financial Model`
          );
          if (!modelId) {
            toast.error('Failed to create financial model');
            return false;
          }
          financialModel = financialStore.getModelById(modelId);
        }

        if (!financialModel) {
          toast.error('Could not access financial model');
          return false;
        }

        // Build new CAPEX items from BOQ
        const existingCapexItems = [...financialModel.inputs.capex_items];
        const newCapexItems: CostLineItem[] = [];

        for (const boqItem of boq.items) {
          // Check if item already exists by name
          const existingIndex = existingCapexItems.findIndex(
            (c) => c.name === boqItem.name && c.is_capex
          );

          const capexItem: CostLineItem = {
            id: existingIndex >= 0 ? existingCapexItems[existingIndex].id : crypto.randomUUID(),
            name: boqItem.name,
            amount: boqItem.totalPrice,
            is_capex: true,
            category: boqItem.category,
            unit_price: boqItem.unitPrice,
            quantity: boqItem.quantity,
            unit: boqItem.unit,
          };

          if (existingIndex >= 0) {
            // Update existing
            existingCapexItems[existingIndex] = capexItem;
          } else {
            // Add new
            newCapexItems.push(capexItem);
          }
        }

        // Merge and update
        const allCapexItems = [...existingCapexItems, ...newCapexItems];
        financialStore.updateInputs(financialModel.id, {
          capex_items: allCapexItems,
        });

        // Update BOQ export tracking
        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        set((state) => ({
          boqs: state.boqs.map((b) =>
            b.id === boqId
              ? { ...b, lastExportedAt: now, lastExportedBy: userFullName }
              : b
          ),
        }));

        toast.success(`Exported ${boq.items.length} item(s) to CAPEX`);
        return true;
      },

      getBOQByDesign: (designId) => {
        return get().boqs.find((b) => b.designId === designId);
      },

      getBOQById: (id) => {
        return get().boqs.find((b) => b.id === id);
      },

      getBOQsByProject: (projectId) => {
        return get().boqs.filter((b) => b.projectId === projectId);
      },
    }),
    { name: 'boq-storage' }
  )
);
