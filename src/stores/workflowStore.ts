import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workflow, Stage, TaskTemplate } from '@/lib/types';
import { defaultWorkflow } from '@/data/seedData';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';

interface WorkflowState {
  workflow: Workflow;
  // Actions
  addStage: (stage: Omit<Stage, 'id'>) => void;
  updateStage: (id: string, updates: Partial<Stage>) => void;
  removeStage: (id: string) => void;
  reorderStages: (fromIndex: number, toIndex: number) => void;
  addTaskTemplate: (stageId: string, template: Omit<TaskTemplate, 'id'>) => void;
  updateTaskTemplate: (stageId: string, templateId: string, updates: Partial<TaskTemplate>) => void;
  removeTaskTemplate: (stageId: string, templateId: string) => void;
  resetToDefault: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      workflow: { stages: [] },

      addStage: (stage) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to add workflow stages');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'workflows',
          undefined,
          overrides,
          roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create workflow stages');
          return;
        }

        const stageId = crypto.randomUUID();

        set((state) => ({
          workflow: {
            stages: [...state.workflow.stages, { ...stage, id: stageId }]
          }
        }));

        logAdminAction('create', 'workflows', stageId, stage.name);
      },

      updateStage: (id, updates) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to update workflow stages');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'workflows',
          undefined,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update workflow stages');
          return;
        }

        const stage = useWorkflowStore.getState().workflow.stages.find(s => s.id === id);

        set((state) => ({
          workflow: {
            stages: state.workflow.stages.map(s =>
              s.id === id ? { ...s, ...updates } : s
            )
          }
        }));

        logAdminAction('update', 'workflows', id, stage?.name, { updates });
      },

      removeStage: (id) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to remove workflow stages');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'workflows',
          undefined,
          overrides,
          roles
        );

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete workflow stages');
          return;
        }

        const stage = useWorkflowStore.getState().workflow.stages.find(s => s.id === id);

        set((state) => ({
          workflow: {
            stages: state.workflow.stages.filter(s => s.id !== id)
          }
        }));

        logAdminAction('delete', 'workflows', id, stage?.name);
      },

      reorderStages: (fromIndex, toIndex) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to reorder workflow stages');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'workflows',
          undefined,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update workflow stages');
          return;
        }

        const movedStage = useWorkflowStore.getState().workflow.stages[fromIndex];

        set((state) => {
          const stages = [...state.workflow.stages];
          const [removed] = stages.splice(fromIndex, 1);
          stages.splice(toIndex, 0, removed);
          return { workflow: { stages } };
        });

        logAdminAction('update', 'workflows', movedStage?.id || 'unknown', movedStage?.name, {
          action: 'reorderStages',
          fromIndex,
          toIndex,
        });
      },

      addTaskTemplate: (stageId, template) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to add task templates');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'workflows',
          undefined,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to modify workflow templates');
          return;
        }

        const templateId = crypto.randomUUID();

        set((state) => ({
          workflow: {
            stages: state.workflow.stages.map(s =>
              s.id === stageId
                ? { ...s, taskTemplates: [...s.taskTemplates, { ...template, id: templateId }] }
                : s
            )
          }
        }));

        logAdminAction('create', 'workflows', templateId, template.title, {
          action: 'addTaskTemplate',
          stageId,
        });
      },

      updateTaskTemplate: (stageId, templateId, updates) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to update task templates');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'workflows',
          undefined,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to modify workflow templates');
          return;
        }

        const stage = useWorkflowStore.getState().workflow.stages.find(s => s.id === stageId);
        const template = stage?.taskTemplates.find(t => t.id === templateId);

        set((state) => ({
          workflow: {
            stages: state.workflow.stages.map(s =>
              s.id === stageId
                ? {
                    ...s,
                    taskTemplates: s.taskTemplates.map(t =>
                      t.id === templateId ? { ...t, ...updates } : t
                    )
                  }
                : s
            )
          }
        }));

        logAdminAction('update', 'workflows', templateId, template?.title, {
          action: 'updateTaskTemplate',
          stageId,
          updates,
        });
      },

      removeTaskTemplate: (stageId, templateId) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to remove task templates');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'workflows',
          undefined,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to modify workflow templates');
          return;
        }

        const stage = useWorkflowStore.getState().workflow.stages.find(s => s.id === stageId);
        const template = stage?.taskTemplates.find(t => t.id === templateId);

        set((state) => ({
          workflow: {
            stages: state.workflow.stages.map(s =>
              s.id === stageId
                ? { ...s, taskTemplates: s.taskTemplates.filter(t => t.id !== templateId) }
                : s
            )
          }
        }));

        logAdminAction('delete', 'workflows', templateId, template?.title, {
          action: 'removeTaskTemplate',
          stageId,
        });
      },

      resetToDefault: () => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to reset workflow');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'workflows',
          undefined,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to reset workflow');
          return;
        }

        set({ workflow: defaultWorkflow });

        logAdminAction('update', 'workflows', 'workflow', 'Workflow', { action: 'resetToDefault' });
      }
    }),
    { name: 'workflow-storage-v2' }
  )
);
