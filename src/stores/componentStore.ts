import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Component,
  ComponentType,
  ModuleSpecs,
  InverterSpecs,
  DesignUsage,
} from '@/lib/types/component';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

interface AddComponentData {
  manufacturer: string;
  model: string;
  specs: ModuleSpecs | InverterSpecs;
  unitPrice: number;
  currency?: string;
  linkedDesigns?: DesignUsage[];
}

interface ComponentState {
  // State
  components: Component[];

  // Actions
  addComponent: (type: ComponentType, data: AddComponentData) => string | undefined;
  addComponents: (type: ComponentType, dataArray: AddComponentData[]) => string[];
  updateComponent: (id: string, updates: Partial<Omit<Component, 'id' | 'type' | 'createdAt' | 'creatorId' | 'createdBy'>>) => void;
  deleteComponent: (id: string) => void;
  linkToDesign: (componentId: string, designId: string, quantity: number) => void;
  unlinkFromDesign: (componentId: string, designId: string) => void;

  // Helpers
  getComponentsByType: (type: ComponentType) => Component[];
  getComponentById: (id: string) => Component | undefined;
  getModules: () => Component[];
  getInverters: () => Component[];
}

export const useComponentStore = create<ComponentState>()(
  persist(
    (set, get) => ({
      components: [],

      addComponent: (type, data) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create components');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'components',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create components');
          return;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        const newComponent = {
          id: crypto.randomUUID(),
          type,
          manufacturer: data.manufacturer,
          model: data.model,
          specs: data.specs,
          unitPrice: data.unitPrice,
          currency: data.currency || 'USD',
          linkedDesigns: data.linkedDesigns || [],
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        } as Component;

        set((state) => ({
          components: [...state.components, newComponent],
        }));

        logAdminAction('create', 'components', newComponent.id, `${data.manufacturer} ${data.model}`, {
          type,
          manufacturer: data.manufacturer,
          model: data.model,
        });

        toast.success(`${type === 'module' ? 'Module' : 'Inverter'} created successfully`);
        return newComponent.id;
      },

      addComponents: (type, dataArray) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create components');
          return [];
        }

        const permissions = resolvePermissions(
          currentUser,
          'components',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create components');
          return [];
        }

        if (dataArray.length === 0) {
          return [];
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        const newComponents = dataArray.map((data) => ({
          id: crypto.randomUUID(),
          type,
          manufacturer: data.manufacturer,
          model: data.model,
          specs: data.specs,
          unitPrice: data.unitPrice,
          currency: data.currency || 'USD',
          linkedDesigns: data.linkedDesigns || [],
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        } as Component));

        set((state) => ({
          components: [...state.components, ...newComponents],
        }));

        // Log the batch creation
        logAdminAction('create', 'components', 'batch', `Batch import: ${dataArray.length} ${type}s`, {
          type,
          count: dataArray.length,
          models: dataArray.map((d) => d.model),
        });

        toast.success(`Created ${dataArray.length} ${type === 'module' ? 'module' : 'inverter'}${dataArray.length !== 1 ? 's' : ''}`);
        return newComponents.map((c) => c.id);
      },

      updateComponent: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update components');
          return;
        }

        const component = get().components.find((c) => c.id === id);
        if (!component) {
          toast.error('Component not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'components',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        // Check permissions: Admins can update any, Users only their own
        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = component.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update components');
          return;
        }

        // Non-admin users can only update their own components
        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only update your own components');
          return;
        }

        set((state) => ({
          components: state.components.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: new Date().toISOString() } as Component
              : c
          ),
        }));

        logAdminAction('update', 'components', id, `${component.manufacturer} ${component.model}`, {
          updatedFields: Object.keys(updates),
        });

        toast.success('Component updated successfully');
      },

      deleteComponent: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete components');
          return;
        }

        const component = get().components.find((c) => c.id === id);
        if (!component) {
          toast.error('Component not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'components',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        // Check permissions: Admins can delete any, Users only their own
        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = component.creatorId === currentUser.id;

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete components');
          return;
        }

        // Non-admin users can only delete their own components
        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only delete your own components');
          return;
        }

        set((state) => ({
          components: state.components.filter((c) => c.id !== id),
        }));

        logAdminAction('delete', 'components', id, `${component.manufacturer} ${component.model}`);

        toast.success('Component deleted');
      },

      linkToDesign: (componentId, designId, quantity) => {
        const component = get().components.find((c) => c.id === componentId);
        if (!component) return;

        const linkedDesigns = component.linkedDesigns || [];
        const existingIndex = linkedDesigns.findIndex((d) => d.designId === designId);

        let updatedLinkedDesigns: DesignUsage[];
        if (existingIndex >= 0) {
          // Update existing link
          updatedLinkedDesigns = linkedDesigns.map((d, i) =>
            i === existingIndex ? { ...d, quantity } : d
          );
        } else {
          // Add new link
          updatedLinkedDesigns = [...linkedDesigns, { designId, quantity }];
        }

        set((state) => ({
          components: state.components.map((c) =>
            c.id === componentId
              ? { ...c, linkedDesigns: updatedLinkedDesigns, updatedAt: new Date().toISOString() } as Component
              : c
          ),
        }));
      },

      unlinkFromDesign: (componentId, designId) => {
        const component = get().components.find((c) => c.id === componentId);
        if (!component) return;

        const linkedDesigns = (component.linkedDesigns || []).filter(
          (d) => d.designId !== designId
        );

        set((state) => ({
          components: state.components.map((c) =>
            c.id === componentId
              ? { ...c, linkedDesigns, updatedAt: new Date().toISOString() } as Component
              : c
          ),
        }));
      },

      getComponentsByType: (type) => {
        return get().components.filter((c) => c.type === type);
      },

      getComponentById: (id) => {
        return get().components.find((c) => c.id === id);
      },

      getModules: () => {
        return get().components.filter((c) => c.type === 'module');
      },

      getInverters: () => {
        return get().components.filter((c) => c.type === 'inverter');
      },
    }),
    { name: 'component-storage' }
  )
);
