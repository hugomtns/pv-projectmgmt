import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  MaintenanceSchedule,
  MaintenanceCategory,
  RecurrenceType,
  MaintenanceTaskTemplate,
} from '@/lib/types/maintenance';
import { calculateNextDueDate } from '@/lib/types/maintenance';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

interface CreateScheduleData {
  projectId: string;
  name: string;
  description?: string;
  category: MaintenanceCategory;
  recurrence: RecurrenceType;
  startDate: string;
  isActive?: boolean;
  taskTemplates?: MaintenanceTaskTemplate[];
  equipmentTypes?: string[];
  defaultAssigneeId?: string;
  defaultAssigneeName?: string;
}

interface MaintenanceState {
  // State
  schedules: MaintenanceSchedule[];

  // Actions
  createSchedule: (data: CreateScheduleData) => string | undefined;
  updateSchedule: (
    id: string,
    updates: Partial<Omit<MaintenanceSchedule, 'id' | 'projectId' | 'createdAt' | 'creatorId' | 'createdBy'>>
  ) => void;
  deleteSchedule: (id: string) => void;

  // Task template operations
  addTaskTemplate: (scheduleId: string, template: Omit<MaintenanceTaskTemplate, 'id'>) => void;
  updateTaskTemplate: (scheduleId: string, templateId: string, updates: Partial<MaintenanceTaskTemplate>) => void;
  removeTaskTemplate: (scheduleId: string, templateId: string) => void;

  // Schedule management
  toggleScheduleActive: (id: string) => void;
  updateNextDueDate: (id: string) => void;

  // Helpers
  getSchedulesByProject: (projectId: string) => MaintenanceSchedule[];
  getScheduleById: (id: string) => MaintenanceSchedule | undefined;
  getActiveSchedules: (projectId: string) => MaintenanceSchedule[];
  getDueSchedules: (projectId: string, daysAhead?: number) => MaintenanceSchedule[];
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set, get) => ({
      schedules: [],

      createSchedule: (data) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to create maintenance schedules');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'maintenance_schedules',
          undefined,
          userState.permissionOverrides,
          userState.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create maintenance schedules');
          return;
        }

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        const newSchedule: MaintenanceSchedule = {
          id: crypto.randomUUID(),
          projectId: data.projectId,
          name: data.name,
          description: data.description,
          category: data.category,
          recurrence: data.recurrence,
          startDate: data.startDate,
          nextDueDate: calculateNextDueDate(data.startDate, data.recurrence),
          isActive: data.isActive ?? true,
          taskTemplates: data.taskTemplates || [],
          equipmentTypes: data.equipmentTypes,
          defaultAssigneeId: data.defaultAssigneeId,
          defaultAssigneeName: data.defaultAssigneeName,
          createdBy: userFullName,
          creatorId: currentUser.id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          schedules: [...state.schedules, newSchedule],
        }));

        logAdminAction('create', 'maintenance_schedules', newSchedule.id, data.name, {
          projectId: data.projectId,
          category: data.category,
          recurrence: data.recurrence,
        });

        toast.success('Maintenance schedule created');
        return newSchedule.id;
      },

      updateSchedule: (id, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to update maintenance schedules');
          return;
        }

        const schedule = get().schedules.find((s) => s.id === id);
        if (!schedule) {
          toast.error('Schedule not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'maintenance_schedules',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = schedule.creatorId === currentUser.id;

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update maintenance schedules');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only update schedules you created');
          return;
        }

        // Recalculate next due date if startDate or recurrence changed
        let nextDueDate = schedule.nextDueDate;
        if (updates.startDate || updates.recurrence) {
          nextDueDate = calculateNextDueDate(
            updates.startDate || schedule.startDate,
            updates.recurrence || schedule.recurrence
          );
        }

        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id
              ? { ...s, ...updates, nextDueDate, updatedAt: new Date().toISOString() }
              : s
          ),
        }));

        logAdminAction('update', 'maintenance_schedules', id, schedule.name, {
          updatedFields: Object.keys(updates),
        });

        toast.success('Schedule updated');
      },

      deleteSchedule: (id) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in to delete maintenance schedules');
          return;
        }

        const schedule = get().schedules.find((s) => s.id === id);
        if (!schedule) {
          toast.error('Schedule not found');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'maintenance_schedules',
          id,
          userState.permissionOverrides,
          userState.roles
        );

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = schedule.creatorId === currentUser.id;

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete maintenance schedules');
          return;
        }

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied: You can only delete schedules you created');
          return;
        }

        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
        }));

        logAdminAction('delete', 'maintenance_schedules', id, schedule.name);

        toast.success('Schedule deleted');
      },

      addTaskTemplate: (scheduleId, template) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const schedule = get().schedules.find((s) => s.id === scheduleId);
        if (!schedule) {
          toast.error('Schedule not found');
          return;
        }

        const isAdmin = currentUser.roleId === 'role-admin';
        const isCreator = schedule.creatorId === currentUser.id;

        if (!isAdmin && !isCreator) {
          toast.error('Permission denied');
          return;
        }

        const newTemplate: MaintenanceTaskTemplate = {
          ...template,
          id: crypto.randomUUID(),
        };

        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === scheduleId
              ? {
                  ...s,
                  taskTemplates: [...s.taskTemplates, newTemplate],
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }));
      },

      updateTaskTemplate: (scheduleId, templateId, updates) => {
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === scheduleId
              ? {
                  ...s,
                  taskTemplates: s.taskTemplates.map((t) =>
                    t.id === templateId ? { ...t, ...updates } : t
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }));
      },

      removeTaskTemplate: (scheduleId, templateId) => {
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === scheduleId
              ? {
                  ...s,
                  taskTemplates: s.taskTemplates.filter((t) => t.id !== templateId),
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }));
      },

      toggleScheduleActive: (id) => {
        const schedule = get().schedules.find((s) => s.id === id);
        if (!schedule) return;

        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id
              ? { ...s, isActive: !s.isActive, updatedAt: new Date().toISOString() }
              : s
          ),
        }));

        toast.success(schedule.isActive ? 'Schedule deactivated' : 'Schedule activated');
      },

      updateNextDueDate: (id) => {
        const schedule = get().schedules.find((s) => s.id === id);
        if (!schedule) return;

        const nextDueDate = calculateNextDueDate(schedule.startDate, schedule.recurrence);

        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id
              ? { ...s, nextDueDate, updatedAt: new Date().toISOString() }
              : s
          ),
        }));
      },

      getSchedulesByProject: (projectId) => {
        return get().schedules.filter((s) => s.projectId === projectId);
      },

      getScheduleById: (id) => {
        return get().schedules.find((s) => s.id === id);
      },

      getActiveSchedules: (projectId) => {
        return get().schedules.filter((s) => s.projectId === projectId && s.isActive);
      },

      getDueSchedules: (projectId, daysAhead = 7) => {
        const now = new Date();
        const thresholdDate = new Date(now);
        thresholdDate.setDate(thresholdDate.getDate() + daysAhead);

        return get().schedules.filter((s) => {
          if (s.projectId !== projectId || !s.isActive || !s.nextDueDate) return false;
          const dueDate = new Date(s.nextDueDate);
          return dueDate <= thresholdDate;
        });
      },
    }),
    { name: 'maintenance-storage' }
  )
);
