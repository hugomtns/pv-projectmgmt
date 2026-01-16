import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Equipment,
  EquipmentType,
  EquipmentStatus,
} from '@/lib/types/equipment';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

interface CreateEquipmentData {
  projectId: string;
  siteId?: string;
  designId?: string;
  componentId?: string;
  type: EquipmentType;
  name: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  quantity: number;
  status?: EquipmentStatus;
  warrantyExpiration?: string;
  warrantyProvider?: string;
  commissionedDate?: string;
  location?: string;
  notes?: string;
}

interface EquipmentState {
  // State
  equipment: Equipment[];

  // Actions
  createEquipment: (data: CreateEquipmentData) => string | undefined;
  updateEquipment: (
    id: string,
    updates: Partial<Omit<Equipment, 'id' | 'projectId' | 'createdAt' | 'creatorId' | 'createdBy'>>
  ) => void;
  deleteEquipment: (id: string) => void;

  // Bulk import from design
  importFromDesign: (
    projectId: string,
    designId: string,
    items: Array<{
      componentId: string;
      type: EquipmentType;
      name: string;
      manufacturer?: string;
      model?: string;
      quantity: number;
    }>
  ) => string[];

  // Helpers
  getEquipmentByProject: (projectId: string) => Equipment[];
  getEquipmentById: (id: string) => Equipment | undefined;
  getEquipmentByType: (projectId: string, type: EquipmentType) => Equipment[];
  getExpiringWarranties: (projectId: string, daysThreshold?: number) => Equipment[];
}

export const useEquipmentStore = create<EquipmentState>()(
  persist(
    (set, get) => ({
      equipment: [],

      createEquipment: (data) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create equipment');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'equipment',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create equipment');
          return;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        const newEquipment: Equipment = {
          id: crypto.randomUUID(),
          projectId: data.projectId,
          siteId: data.siteId,
          designId: data.designId,
          componentId: data.componentId,
          type: data.type,
          name: data.name,
          serialNumber: data.serialNumber,
          manufacturer: data.manufacturer,
          model: data.model,
          quantity: data.quantity,
          status: data.status || 'operational',
          warrantyExpiration: data.warrantyExpiration,
          warrantyProvider: data.warrantyProvider,
          commissionedDate: data.commissionedDate,
          location: data.location,
          notes: data.notes,
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          equipment: [...state.equipment, newEquipment],
        }));

        logAdminAction('create', 'equipment', newEquipment.id, data.name, {
          projectId: data.projectId,
          type: data.type,
          quantity: data.quantity,
        });

        toast.success('Equipment created successfully');
        return newEquipment.id;
      },

      updateEquipment: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update equipment');
          return;
        }

        const equipment = get().equipment.find((e) => e.id === id);
        if (!equipment) {
          toast.error('Equipment not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'equipment',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = equipment.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update equipment');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only update equipment you created');
          return;
        }

        set((state) => ({
          equipment: state.equipment.map((e) =>
            e.id === id
              ? { ...e, ...updates, updatedAt: new Date().toISOString() }
              : e
          ),
        }));

        logAdminAction('update', 'equipment', id, equipment.name, {
          updatedFields: Object.keys(updates),
        });

        toast.success('Equipment updated');
      },

      deleteEquipment: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete equipment');
          return;
        }

        const equipment = get().equipment.find((e) => e.id === id);
        if (!equipment) {
          toast.error('Equipment not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'equipment',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = equipment.creatorId === currentUser.id;

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete equipment');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only delete equipment you created');
          return;
        }

        set((state) => ({
          equipment: state.equipment.filter((e) => e.id !== id),
        }));

        logAdminAction('delete', 'equipment', id, equipment.name);

        toast.success('Equipment deleted');
      },

      importFromDesign: (projectId, designId, items) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to import equipment');
          return [];
        }

        const permissions = resolvePermissions(
          currentUser,
          'equipment',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create equipment');
          return [];
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;
        const createdIds: string[] = [];

        const newEquipment: Equipment[] = items.map((item) => {
          const id = crypto.randomUUID();
          createdIds.push(id);
          return {
            id,
            projectId,
            designId,
            componentId: item.componentId,
            type: item.type,
            name: item.name,
            manufacturer: item.manufacturer,
            model: item.model,
            quantity: item.quantity,
            status: 'operational' as EquipmentStatus,
            createdBy: userFullName,
            creatorId: currentUser.id,
            createdAt: now,
            updatedAt: now,
          };
        });

        set((state) => ({
          equipment: [...state.equipment, ...newEquipment],
        }));

        logAdminAction('create', 'equipment', designId, `Bulk import from design`, {
          projectId,
          designId,
          itemCount: items.length,
        });

        toast.success(`Imported ${items.length} equipment items from design`);
        return createdIds;
      },

      getEquipmentByProject: (projectId) => {
        return get().equipment.filter((e) => e.projectId === projectId);
      },

      getEquipmentById: (id) => {
        return get().equipment.find((e) => e.id === id);
      },

      getEquipmentByType: (projectId, type) => {
        return get().equipment.filter((e) => e.projectId === projectId && e.type === type);
      },

      getExpiringWarranties: (projectId, daysThreshold = 90) => {
        const now = new Date();
        const thresholdDate = new Date(now);
        thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

        return get().equipment.filter((e) => {
          if (e.projectId !== projectId || !e.warrantyExpiration) return false;
          const expirationDate = new Date(e.warrantyExpiration);
          return expirationDate <= thresholdDate && expirationDate >= now;
        });
      },
    }),
    { name: 'equipment-storage' }
  )
);
