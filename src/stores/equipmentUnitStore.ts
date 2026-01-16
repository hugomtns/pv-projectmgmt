import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EquipmentUnit, UnitStatus } from '@/lib/types/equipment';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

interface CreateUnitData {
  equipmentId: string;
  serialNumber?: string;
  assetTag?: string;
  status?: UnitStatus;
  installedDate?: string;
  warrantyExpiration?: string;
  location?: string;
  notes?: string;
}

interface EquipmentUnitState {
  // State
  units: EquipmentUnit[];

  // Actions
  createUnit: (data: CreateUnitData) => string | undefined;
  updateUnit: (
    id: string,
    updates: Partial<Omit<EquipmentUnit, 'id' | 'equipmentId' | 'createdAt' | 'creatorId' | 'createdBy'>>
  ) => void;
  deleteUnit: (id: string) => void;

  // Bulk operations
  createMultipleUnits: (
    equipmentId: string,
    units: Array<Omit<CreateUnitData, 'equipmentId'>>
  ) => string[];

  // Helpers
  getUnitsByEquipment: (equipmentId: string) => EquipmentUnit[];
  getUnitById: (id: string) => EquipmentUnit | undefined;
  getUnitsByStatus: (equipmentId: string, status: UnitStatus) => EquipmentUnit[];
  getUnitStats: (equipmentId: string) => {
    total: number;
    operational: number;
    degraded: number;
    offline: number;
    replaced: number;
    decommissioned: number;
  };
}

export const useEquipmentUnitStore = create<EquipmentUnitState>()(
  persist(
    (set, get) => ({
      units: [],

      createUnit: (data) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create equipment units');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'equipment_units',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create equipment units');
          return;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        const newUnit: EquipmentUnit = {
          id: crypto.randomUUID(),
          equipmentId: data.equipmentId,
          serialNumber: data.serialNumber,
          assetTag: data.assetTag,
          status: data.status || 'operational',
          installedDate: data.installedDate,
          warrantyExpiration: data.warrantyExpiration,
          location: data.location,
          notes: data.notes,
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          units: [...state.units, newUnit],
        }));

        logAdminAction('create', 'equipment_units', newUnit.id, data.serialNumber || 'Unit', {
          equipmentId: data.equipmentId,
          status: newUnit.status,
        });

        return newUnit.id;
      },

      updateUnit: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update equipment units');
          return;
        }

        const unit = get().units.find((u) => u.id === id);
        if (!unit) {
          toast.error('Unit not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'equipment_units',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = unit.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update equipment units');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only update units you created');
          return;
        }

        set((state) => ({
          units: state.units.map((u) =>
            u.id === id
              ? { ...u, ...updates, updatedAt: new Date().toISOString() }
              : u
          ),
        }));

        logAdminAction('update', 'equipment_units', id, unit.serialNumber || 'Unit', {
          updatedFields: Object.keys(updates),
        });

        toast.success('Unit updated');
      },

      deleteUnit: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete equipment units');
          return;
        }

        const unit = get().units.find((u) => u.id === id);
        if (!unit) {
          toast.error('Unit not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'equipment_units',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = unit.creatorId === currentUser.id;

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete equipment units');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only delete units you created');
          return;
        }

        set((state) => ({
          units: state.units.filter((u) => u.id !== id),
        }));

        logAdminAction('delete', 'equipment_units', id, unit.serialNumber || 'Unit');

        toast.success('Unit deleted');
      },

      createMultipleUnits: (equipmentId, unitsData) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create equipment units');
          return [];
        }

        const permissions = resolvePermissions(
          currentUser,
          'equipment_units',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create equipment units');
          return [];
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;
        const createdIds: string[] = [];

        const newUnits: EquipmentUnit[] = unitsData.map((data) => {
          const id = crypto.randomUUID();
          createdIds.push(id);
          return {
            id,
            equipmentId,
            serialNumber: data.serialNumber,
            assetTag: data.assetTag,
            status: data.status || 'operational',
            installedDate: data.installedDate,
            warrantyExpiration: data.warrantyExpiration,
            location: data.location,
            notes: data.notes,
            createdBy: userFullName,
            creatorId: currentUser.id,
            createdAt: now,
            updatedAt: now,
          };
        });

        set((state) => ({
          units: [...state.units, ...newUnits],
        }));

        logAdminAction('create', 'equipment_units', equipmentId, `Bulk create ${unitsData.length} units`, {
          equipmentId,
          count: unitsData.length,
        });

        toast.success(`Created ${unitsData.length} units`);
        return createdIds;
      },

      getUnitsByEquipment: (equipmentId) => {
        return get().units.filter((u) => u.equipmentId === equipmentId);
      },

      getUnitById: (id) => {
        return get().units.find((u) => u.id === id);
      },

      getUnitsByStatus: (equipmentId, status) => {
        return get().units.filter((u) => u.equipmentId === equipmentId && u.status === status);
      },

      getUnitStats: (equipmentId) => {
        const units = get().units.filter((u) => u.equipmentId === equipmentId);
        return {
          total: units.length,
          operational: units.filter((u) => u.status === 'operational').length,
          degraded: units.filter((u) => u.status === 'degraded').length,
          offline: units.filter((u) => u.status === 'offline').length,
          replaced: units.filter((u) => u.status === 'replaced').length,
          decommissioned: units.filter((u) => u.status === 'decommissioned').length,
        };
      },
    }),
    { name: 'equipment-unit-storage' }
  )
);
