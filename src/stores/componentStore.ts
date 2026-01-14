import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Component,
  ComponentType,
  ModuleSpecs,
  InverterSpecs,
} from '@/lib/types/component';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { toast } from 'sonner';

interface AddComponentData {
  manufacturer: string;
  model: string;
  specs: ModuleSpecs | InverterSpecs;
  unitPrice: number;
  currency?: string;
}

interface ComponentState {
  // State
  components: Component[];

  // Actions
  addComponent: (type: ComponentType, data: AddComponentData) => string | undefined;
  updateComponent: (id: string, updates: Partial<Omit<Component, 'id' | 'type' | 'createdAt' | 'creatorId' | 'createdBy'>>) => void;
  deleteComponent: (id: string) => void;

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
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        } as Component;

        set((state) => ({
          components: [...state.components, newComponent],
        }));

        toast.success(`${type === 'module' ? 'Module' : 'Inverter'} created successfully`);
        return newComponent.id;
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

        toast.success('Component deleted');
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
