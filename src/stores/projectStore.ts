import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Task, Comment } from '@/lib/types';
import { useWorkflowStore } from './workflowStore';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { toast } from 'sonner';

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  // Actions
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  moveProjectToStage: (projectId: string, stageId: string) => boolean; // returns false if gate blocks
  // Task actions
  addTask: (projectId: string, stageId: string, task: Omit<Task, 'id'>) => void;
  updateTask: (projectId: string, stageId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (projectId: string, stageId: string, taskId: string) => void;
  addComment: (projectId: string, stageId: string, taskId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => void;
  // Selection
  selectProject: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      selectedProjectId: null,

      addProject: (project) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to create projects');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'projects',
          undefined,
          overrides,
          roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create projects');
          return;
        }

        set((state) => {
          const now = new Date().toISOString();
          const newProject: Project = {
            ...project,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
            stages: project.stages || {}
          };
          return { projects: [...state.projects, newProject] };
        });
      },

      updateProject: (id, updates) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to update projects');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'projects',
          id,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update projects');
          return;
        }

        set((state) => ({
          projects: state.projects.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          )
        }));
      },

      deleteProject: (id) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to delete projects');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'projects',
          id,
          overrides,
          roles
        );

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete projects');
          return;
        }

        set((state) => ({
          projects: state.projects.filter(p => p.id !== id),
          selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId
        }));
      },

      moveProjectToStage: (projectId, stageId) => {
        let success = false;
        set((state) => {
          const project = state.projects.find(p => p.id === projectId);
          if (!project) return state;

          // Gate check: all tasks in current stage must be complete
          const currentStage = project.stages[project.currentStageId];
          if (currentStage && currentStage.tasks.some(t => t.status !== 'complete')) {
            success = false;
            return state;
          }

          // Get workflow to instantiate tasks from template
          const workflow = useWorkflowStore.getState().workflow;
          const targetStage = workflow.stages.find(s => s.id === stageId);

          // Create tasks from template if entering stage for first time
          let stageData = project.stages[stageId];
          if (!stageData && targetStage) {
            stageData = {
              enteredAt: new Date().toISOString(),
              tasks: targetStage.taskTemplates.map(template => ({
                id: crypto.randomUUID(),
                title: template.title,
                description: template.description,
                assignee: '',
                dueDate: null,
                status: 'not_started' as const,
                comments: []
              }))
            };
          }

          success = true;
          return {
            projects: state.projects.map(p =>
              p.id === projectId
                ? {
                    ...p,
                    currentStageId: stageId,
                    updatedAt: new Date().toISOString(),
                    stages: {
                      ...p.stages,
                      [stageId]: stageData || {
                        enteredAt: new Date().toISOString(),
                        tasks: []
                      }
                    }
                  }
                : p
            )
          };
        });
        return success;
      },

      addTask: (projectId, stageId, task) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to create tasks');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'tasks',
          undefined,
          overrides,
          roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create tasks');
          return;
        }

        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? {
                  ...p,
                  updatedAt: new Date().toISOString(),
                  stages: {
                    ...p.stages,
                    [stageId]: {
                      ...p.stages[stageId],
                      tasks: [
                        ...(p.stages[stageId]?.tasks || []),
                        { ...task, id: crypto.randomUUID() }
                      ]
                    }
                  }
                }
              : p
          )
        }));
      },

      updateTask: (projectId, stageId, taskId, updates) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to update tasks');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'tasks',
          taskId,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update tasks');
          return;
        }

        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? {
                  ...p,
                  updatedAt: new Date().toISOString(),
                  stages: {
                    ...p.stages,
                    [stageId]: {
                      ...p.stages[stageId],
                      tasks: p.stages[stageId].tasks.map(t =>
                        t.id === taskId ? { ...t, ...updates } : t
                      )
                    }
                  }
                }
              : p
          )
        }));
      },

      deleteTask: (projectId, stageId, taskId) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to delete tasks');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'tasks',
          taskId,
          overrides,
          roles
        );

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete tasks');
          return;
        }

        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? {
                  ...p,
                  updatedAt: new Date().toISOString(),
                  stages: {
                    ...p.stages,
                    [stageId]: {
                      ...p.stages[stageId],
                      tasks: p.stages[stageId].tasks.filter(t => t.id !== taskId)
                    }
                  }
                }
              : p
          )
        }));
      },

      addComment: (projectId, stageId, taskId, comment) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to add comments');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'comments',
          undefined,
          overrides,
          roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to add comments');
          return;
        }

        set((state) => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? {
                  ...p,
                  updatedAt: new Date().toISOString(),
                  stages: {
                    ...p.stages,
                    [stageId]: {
                      ...p.stages[stageId],
                      tasks: p.stages[stageId].tasks.map(t =>
                        t.id === taskId
                          ? {
                              ...t,
                              comments: [
                                ...t.comments,
                                {
                                  ...comment,
                                  id: crypto.randomUUID(),
                                  createdAt: new Date().toISOString()
                                }
                              ]
                            }
                          : t
                      )
                    }
                  }
                }
              : p
          )
        }));
      },

      selectProject: (id) => set({ selectedProjectId: id })
    }),
    { name: 'project-storage-v2' }
  )
);
