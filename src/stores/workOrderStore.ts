import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WorkOrder,
  WorkOrderType,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderItem,
  WorkOrderItemResult,
  WorkOrderSignature,
  WorkOrderPart,
} from '@/lib/types/workOrder';
import type { InspectionItemPhoto } from '@/lib/types/inspection';
import type { MaintenanceSchedule } from '@/lib/types/maintenance';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { storeBlob, deleteBlob } from '@/lib/db';
import { toast } from 'sonner';

interface CreateWorkOrderData {
  projectId: string;
  scheduleId?: string;
  equipmentId?: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  title: string;
  description: string;
  scheduledDate: string;
  dueDate?: string;
  assigneeId?: string;
  assigneeName?: string;
}

interface WorkOrderState {
  // State
  workOrders: WorkOrder[];

  // Work Order CRUD
  createWorkOrder: (data: CreateWorkOrderData) => string | undefined;
  createFromSchedule: (schedule: MaintenanceSchedule, scheduledDate: string) => string | undefined;
  updateWorkOrder: (
    id: string,
    updates: Partial<
      Pick<
        WorkOrder,
        | 'status'
        | 'priority'
        | 'title'
        | 'description'
        | 'scheduledDate'
        | 'dueDate'
        | 'assigneeId'
        | 'assigneeName'
        | 'overallNotes'
        | 'laborHours'
        | 'laborRate'
      >
    >
  ) => void;
  deleteWorkOrder: (id: string) => void;

  // Item operations
  updateWorkOrderItem: (
    workOrderId: string,
    itemId: string,
    updates: Partial<Pick<WorkOrderItem, 'result' | 'notes' | 'isPunchListItem' | 'timeSpentMinutes'>>
  ) => void;

  // Photo operations
  addItemPhoto: (
    workOrderId: string,
    itemId: string,
    file: File,
    caption?: string
  ) => Promise<string | undefined>;
  deleteItemPhoto: (
    workOrderId: string,
    itemId: string,
    photoId: string
  ) => Promise<void>;

  // Parts tracking
  addPart: (workOrderId: string, itemId: string, part: Omit<WorkOrderPart, 'id'>) => void;
  updatePart: (workOrderId: string, itemId: string, partId: string, updates: Partial<WorkOrderPart>) => void;
  removePart: (workOrderId: string, itemId: string, partId: string) => void;

  // Punch list operations
  markPunchListResolved: (workOrderId: string, itemId: string) => void;

  // Signature operations
  addSignature: (workOrderId: string, role: WorkOrderSignature['role']) => void;

  // Completion
  completeWorkOrder: (workOrderId: string) => boolean;
  calculateCosts: (workOrderId: string) => { laborCost: number; partsCost: number; totalCost: number };

  // Helpers
  getWorkOrdersByProject: (projectId: string) => WorkOrder[];
  getWorkOrderById: (id: string) => WorkOrder | undefined;
  getWorkOrdersByStatus: (projectId: string, status: WorkOrderStatus) => WorkOrder[];
  getPunchListItems: (projectId: string) => Array<{ workOrder: WorkOrder; item: WorkOrderItem }>;
  getOverdueWorkOrders: (projectId: string) => WorkOrder[];
}

export const useWorkOrderStore = create<WorkOrderState>()(
  persist(
    (set, get) => ({
      workOrders: [],

      createWorkOrder: (data) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create work orders');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'work_orders',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create work orders');
          return;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        const newWorkOrder: WorkOrder = {
          id: crypto.randomUUID(),
          projectId: data.projectId,
          scheduleId: data.scheduleId,
          equipmentId: data.equipmentId,
          type: data.type,
          priority: data.priority,
          status: 'draft',
          title: data.title,
          description: data.description,
          scheduledDate: data.scheduledDate,
          dueDate: data.dueDate,
          assigneeId: data.assigneeId,
          assigneeName: data.assigneeName,
          items: [],
          signatures: [],
          overallNotes: '',
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          workOrders: [...state.workOrders, newWorkOrder],
        }));

        logAdminAction('create', 'work_orders', newWorkOrder.id, data.title, {
          projectId: data.projectId,
          type: data.type,
          priority: data.priority,
        });

        toast.success('Work order created');
        return newWorkOrder.id;
      },

      createFromSchedule: (schedule, scheduledDate) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create work orders');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'work_orders',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create work orders');
          return;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        // Create items from schedule templates
        const items: WorkOrderItem[] = schedule.taskTemplates.map((template) => ({
          id: crypto.randomUUID(),
          title: template.title,
          description: template.description,
          category: template.category,
          result: 'pending' as WorkOrderItemResult,
          required: template.required,
          notes: '',
          photos: [],
          partsUsed: [],
          isPunchListItem: false,
          createdAt: now,
          updatedAt: now,
        }));

        const newWorkOrder: WorkOrder = {
          id: crypto.randomUUID(),
          projectId: schedule.projectId,
          scheduleId: schedule.id,
          type: 'preventive',
          priority: 'medium',
          status: 'scheduled',
          title: `${schedule.name} - ${scheduledDate}`,
          description: schedule.description || '',
          scheduledDate,
          assigneeId: schedule.defaultAssigneeId,
          assigneeName: schedule.defaultAssigneeName,
          items,
          signatures: [],
          overallNotes: '',
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          workOrders: [...state.workOrders, newWorkOrder],
        }));

        logAdminAction('create', 'work_orders', newWorkOrder.id, newWorkOrder.title, {
          projectId: schedule.projectId,
          scheduleId: schedule.id,
          itemCount: items.length,
        });

        toast.success('Work order created from schedule');
        return newWorkOrder.id;
      },

      updateWorkOrder: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update work orders');
          return;
        }

        const workOrder = get().workOrders.find((wo) => wo.id === id);
        if (!workOrder) {
          toast.error('Work order not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'work_orders',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = workOrder.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update work orders');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only update work orders you created');
          return;
        }

        set((state) => ({
          workOrders: state.workOrders.map((wo) =>
            wo.id === id
              ? { ...wo, ...updates, updatedAt: new Date().toISOString() }
              : wo
          ),
        }));

        logAdminAction('update', 'work_orders', id, workOrder.title, {
          updatedFields: Object.keys(updates),
        });
      },

      deleteWorkOrder: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete work orders');
          return;
        }

        const workOrder = get().workOrders.find((wo) => wo.id === id);
        if (!workOrder) {
          toast.error('Work order not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'work_orders',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = workOrder.creatorId === currentUser.id;

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete work orders');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only delete work orders you created');
          return;
        }

        // Clean up photo blobs
        for (const item of workOrder.items) {
          for (const photo of item.photos) {
            deleteBlob(photo.blobId).catch(console.error);
          }
        }

        set((state) => ({
          workOrders: state.workOrders.filter((wo) => wo.id !== id),
        }));

        logAdminAction('delete', 'work_orders', id, workOrder.title);

        toast.success('Work order deleted');
      },

      updateWorkOrderItem: (workOrderId, itemId, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const workOrder = get().workOrders.find((wo) => wo.id === workOrderId);
        if (!workOrder) {
          toast.error('Work order not found');
          return;
        }

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = workOrder.creatorId === currentUser.id;

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied');
          return;
        }

        const now = new Date().toISOString();

        set((state) => ({
          workOrders: state.workOrders.map((wo) =>
            wo.id === workOrderId
              ? {
                  ...wo,
                  updatedAt: now,
                  items: wo.items.map((item) =>
                    item.id === itemId
                      ? { ...item, ...updates, updatedAt: now }
                      : item
                  ),
                }
              : wo
          ),
        }));
      },

      addItemPhoto: async (workOrderId, itemId, file, caption) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const workOrder = get().workOrders.find((wo) => wo.id === workOrderId);
        if (!workOrder) {
          toast.error('Work order not found');
          return;
        }

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = workOrder.creatorId === currentUser.id;

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied');
          return;
        }

        try {
          const blobId = await storeBlob(file);
          const now = new Date().toISOString();

          const newPhoto: InspectionItemPhoto = {
            id: crypto.randomUUID(),
            blobId,
            fileName: file.name,
            fileSize: file.size,
            capturedAt: now,
            caption,
          };

          set((state) => ({
            workOrders: state.workOrders.map((wo) =>
              wo.id === workOrderId
                ? {
                    ...wo,
                    updatedAt: now,
                    items: wo.items.map((item) =>
                      item.id === itemId
                        ? {
                            ...item,
                            photos: [...item.photos, newPhoto],
                            updatedAt: now,
                          }
                        : item
                    ),
                  }
                : wo
            ),
          }));

          toast.success('Photo added');
          return newPhoto.id;
        } catch (error) {
          console.error('Failed to store photo:', error);
          toast.error('Failed to add photo');
          return;
        }
      },

      deleteItemPhoto: async (workOrderId, itemId, photoId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const workOrder = get().workOrders.find((wo) => wo.id === workOrderId);
        if (!workOrder) {
          toast.error('Work order not found');
          return;
        }

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = workOrder.creatorId === currentUser.id;

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied');
          return;
        }

        // Find and delete blob
        const item = workOrder.items.find((i) => i.id === itemId);
        const photo = item?.photos.find((p) => p.id === photoId);

        if (photo) {
          try {
            await deleteBlob(photo.blobId);
          } catch (error) {
            console.error('Failed to delete blob:', error);
          }
        }

        const now = new Date().toISOString();

        set((state) => ({
          workOrders: state.workOrders.map((wo) =>
            wo.id === workOrderId
              ? {
                  ...wo,
                  updatedAt: now,
                  items: wo.items.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          photos: item.photos.filter((p) => p.id !== photoId),
                          updatedAt: now,
                        }
                      : item
                  ),
                }
              : wo
          ),
        }));

        toast.success('Photo deleted');
      },

      addPart: (workOrderId, itemId, part) => {
        const newPart: WorkOrderPart = {
          ...part,
          id: crypto.randomUUID(),
          totalCost: part.quantity * part.unitCost,
        };

        const now = new Date().toISOString();

        set((state) => ({
          workOrders: state.workOrders.map((wo) =>
            wo.id === workOrderId
              ? {
                  ...wo,
                  updatedAt: now,
                  items: wo.items.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          partsUsed: [...item.partsUsed, newPart],
                          updatedAt: now,
                        }
                      : item
                  ),
                }
              : wo
          ),
        }));
      },

      updatePart: (workOrderId, itemId, partId, updates) => {
        const now = new Date().toISOString();

        set((state) => ({
          workOrders: state.workOrders.map((wo) =>
            wo.id === workOrderId
              ? {
                  ...wo,
                  updatedAt: now,
                  items: wo.items.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          partsUsed: item.partsUsed.map((p) =>
                            p.id === partId
                              ? {
                                  ...p,
                                  ...updates,
                                  totalCost: (updates.quantity ?? p.quantity) * (updates.unitCost ?? p.unitCost),
                                }
                              : p
                          ),
                          updatedAt: now,
                        }
                      : item
                  ),
                }
              : wo
          ),
        }));
      },

      removePart: (workOrderId, itemId, partId) => {
        const now = new Date().toISOString();

        set((state) => ({
          workOrders: state.workOrders.map((wo) =>
            wo.id === workOrderId
              ? {
                  ...wo,
                  updatedAt: now,
                  items: wo.items.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          partsUsed: item.partsUsed.filter((p) => p.id !== partId),
                          updatedAt: now,
                        }
                      : item
                  ),
                }
              : wo
          ),
        }));
      },

      markPunchListResolved: (workOrderId, itemId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;
        const now = new Date().toISOString();

        set((state) => ({
          workOrders: state.workOrders.map((wo) =>
            wo.id === workOrderId
              ? {
                  ...wo,
                  updatedAt: now,
                  items: wo.items.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          punchListResolvedAt: now,
                          punchListResolvedBy: userFullName,
                          updatedAt: now,
                        }
                      : item
                  ),
                }
              : wo
          ),
        }));

        toast.success('Punch list item resolved');
      },

      addSignature: (workOrderId, role) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const workOrder = get().workOrders.find((wo) => wo.id === workOrderId);
        if (!workOrder) {
          toast.error('Work order not found');
          return;
        }

        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;
        const now = new Date().toISOString();

        const newSignature: WorkOrderSignature = {
          id: crypto.randomUUID(),
          signedBy: userFullName,
          signedById: currentUser.id,
          signedAt: now,
          role,
        };

        set((state) => ({
          workOrders: state.workOrders.map((wo) =>
            wo.id === workOrderId
              ? {
                  ...wo,
                  signatures: [...wo.signatures, newSignature],
                  updatedAt: now,
                }
              : wo
          ),
        }));

        toast.success('Signature added');
      },

      calculateCosts: (workOrderId) => {
        const workOrder = get().workOrders.find((wo) => wo.id === workOrderId);
        if (!workOrder) {
          return { laborCost: 0, partsCost: 0, totalCost: 0 };
        }

        const laborCost = (workOrder.laborHours || 0) * (workOrder.laborRate || 0);

        let partsCost = 0;
        for (const item of workOrder.items) {
          for (const part of item.partsUsed) {
            partsCost += part.totalCost;
          }
        }

        return {
          laborCost,
          partsCost,
          totalCost: laborCost + partsCost,
        };
      },

      completeWorkOrder: (workOrderId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return false;
        }

        const workOrder = get().workOrders.find((wo) => wo.id === workOrderId);
        if (!workOrder) {
          toast.error('Work order not found');
          return false;
        }

        // Check all required items are completed
        const incompleteRequired = workOrder.items.filter(
          (item) => item.required && item.result === 'pending'
        );

        if (incompleteRequired.length > 0) {
          toast.error(`${incompleteRequired.length} required items are not completed`);
          return false;
        }

        // Check for at least one signature
        if (workOrder.signatures.length === 0) {
          toast.error('At least one signature is required to complete the work order');
          return false;
        }

        const costs = get().calculateCosts(workOrderId);
        const now = new Date().toISOString();

        set((state) => ({
          workOrders: state.workOrders.map((wo) =>
            wo.id === workOrderId
              ? {
                  ...wo,
                  status: 'completed' as WorkOrderStatus,
                  completedAt: now,
                  laborCost: costs.laborCost,
                  partsCost: costs.partsCost,
                  totalCost: costs.totalCost,
                  updatedAt: now,
                }
              : wo
          ),
        }));

        logAdminAction('update', 'work_orders', workOrderId, workOrder.title, {
          action: 'completed',
          totalCost: costs.totalCost,
        });

        toast.success('Work order completed');
        return true;
      },

      getWorkOrdersByProject: (projectId) => {
        return get().workOrders.filter((wo) => wo.projectId === projectId);
      },

      getWorkOrderById: (id) => {
        return get().workOrders.find((wo) => wo.id === id);
      },

      getWorkOrdersByStatus: (projectId, status) => {
        return get().workOrders.filter((wo) => wo.projectId === projectId && wo.status === status);
      },

      getPunchListItems: (projectId) => {
        const projectWorkOrders = get().getWorkOrdersByProject(projectId);
        const punchListItems: Array<{ workOrder: WorkOrder; item: WorkOrderItem }> = [];

        for (const workOrder of projectWorkOrders) {
          for (const item of workOrder.items) {
            if (item.isPunchListItem && !item.punchListResolvedAt) {
              punchListItems.push({ workOrder, item });
            }
          }
        }

        return punchListItems;
      },

      getOverdueWorkOrders: (projectId) => {
        const now = new Date();
        return get().workOrders.filter((wo) => {
          if (wo.projectId !== projectId) return false;
          if (wo.status === 'completed' || wo.status === 'cancelled') return false;
          if (!wo.dueDate) return false;
          return new Date(wo.dueDate) < now;
        });
      },
    }),
    { name: 'work-order-storage' }
  )
);
