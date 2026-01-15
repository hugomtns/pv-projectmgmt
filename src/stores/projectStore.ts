import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Task, Comment, Milestone } from '@/lib/types';
import { useWorkflowStore } from './workflowStore';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
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
  // Milestone actions
  addMilestone: (projectId: string, milestoneData: Omit<Milestone, 'id' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'>) => void;
  updateMilestone: (projectId: string, milestoneId: string, updates: Partial<Milestone>) => void;
  deleteMilestone: (projectId: string, milestoneId: string) => void;
  toggleMilestoneComplete: (projectId: string, milestoneId: string) => void;
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
            stages: project.stages || {},
            attachments: project.attachments || [],
            milestones: project.milestones || []
          };

          // Log the action
          logAdminAction('create', 'projects', newProject.id, newProject.name, {
            location: newProject.location,
            priority: newProject.priority,
          });

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

        const project = useProjectStore.getState().projects.find(p => p.id === id);
        const users = useUserStore.getState().users;

        // Calculate actual changes (only fields that differ from current values)
        const actualChanges: Record<string, unknown> = {};
        if (project) {
          for (const [key, newValue] of Object.entries(updates)) {
            const oldValue = project[key as keyof Project];
            // Simple comparison for primitives, stringify for objects/arrays
            const oldStr = typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue;
            const newStr = typeof newValue === 'object' ? JSON.stringify(newValue) : newValue;
            if (oldStr !== newStr) {
              // Resolve user IDs to names for owner field
              if (key === 'owner' && typeof newValue === 'string') {
                const user = users.find(u => u.id === newValue);
                actualChanges[key] = user ? `${user.firstName} ${user.lastName}` : newValue;
              } else {
                actualChanges[key] = newValue;
              }
            }
          }
        }

        set((state) => ({
          projects: state.projects.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          )
        }));

        // Log the action only if there are actual changes
        if (Object.keys(actualChanges).length > 0) {
          logAdminAction('update', 'projects', id, project?.name, { updates: actualChanges });
        }
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

        const project = useProjectStore.getState().projects.find(p => p.id === id);

        set((state) => ({
          projects: state.projects.filter(p => p.id !== id),
          selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId
        }));

        // Log the action
        logAdminAction('delete', 'projects', id, project?.name);
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
                comments: [],
                attachments: []
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

        // Log successful stage moves
        if (success) {
          const project = useProjectStore.getState().projects.find(p => p.id === projectId);
          const workflow = useWorkflowStore.getState().workflow;
          const stageName = workflow.stages.find(s => s.id === stageId)?.name;
          logAdminAction('update', 'projects', projectId, project?.name, {
            action: 'moveToStage',
            stageId,
            stageName,
          });
        }

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

        const taskId = crypto.randomUUID();

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
                        { ...task, id: taskId, attachments: task.attachments || [] }
                      ]
                    }
                  }
                }
              : p
          )
        }));

        // Log the action
        logAdminAction('create', 'tasks', taskId, task.title, { projectId, stageId });
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

        // Get task before update
        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        const task = project?.stages[stageId]?.tasks.find(t => t.id === taskId);
        const users = useUserStore.getState().users;

        // Calculate actual changes
        const actualChanges: Record<string, unknown> = {};
        if (task) {
          for (const [key, newValue] of Object.entries(updates)) {
            const oldValue = task[key as keyof Task];
            const oldStr = typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue;
            const newStr = typeof newValue === 'object' ? JSON.stringify(newValue) : newValue;
            if (oldStr !== newStr) {
              // Resolve user IDs to names for assignee field
              if (key === 'assignee' && typeof newValue === 'string' && newValue.startsWith('user-')) {
                const user = users.find(u => u.id === newValue);
                actualChanges[key] = user ? `${user.firstName} ${user.lastName}` : newValue;
              } else {
                actualChanges[key] = newValue;
              }
            }
          }
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

        // Log the action only if there are actual changes
        if (Object.keys(actualChanges).length > 0) {
          logAdminAction('update', 'tasks', taskId, task?.title, { projectId, stageId, updates: actualChanges });
        }
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

        // Get task name before delete
        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        const task = project?.stages[stageId]?.tasks.find(t => t.id === taskId);

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

        // Log the action
        logAdminAction('delete', 'tasks', taskId, task?.title, { projectId, stageId });
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

        const commentId = crypto.randomUUID();

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
                                  id: commentId,
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

        // Log the action
        logAdminAction('create', 'comments', commentId, undefined, { projectId, stageId, taskId });
      },

      // Milestone actions
      addMilestone: (projectId, milestoneData) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;
        const roles = userState.roles;
        const overrides = userState.permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'projects',
          projectId,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: Cannot manage milestones');
          return;
        }

        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        if (!project) {
          toast.error('Project not found');
          return;
        }

        const now = new Date().toISOString();
        const milestoneId = crypto.randomUUID();
        const newMilestone: Milestone = {
          id: milestoneId,
          ...milestoneData,
          completed: false,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, milestones: [...(p.milestones || []), newMilestone], updatedAt: now }
              : p
          ),
        }));

        // Log the action
        logAdminAction('create', 'projects', milestoneId, milestoneData.name, {
          action: 'addMilestone',
          projectId,
        });

        toast.success('Milestone added');
      },

      updateMilestone: (projectId, milestoneId, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;
        const roles = userState.roles;
        const overrides = userState.permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'projects',
          projectId,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: Cannot manage milestones');
          return;
        }

        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        const milestone = project?.milestones?.find(m => m.id === milestoneId);

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  milestones: (p.milestones || []).map((m) =>
                    m.id === milestoneId
                      ? { ...m, ...updates, updatedAt: new Date().toISOString() }
                      : m
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));

        // Log the action
        logAdminAction('update', 'projects', milestoneId, milestone?.name, {
          action: 'updateMilestone',
          projectId,
          updates,
        });

        toast.success('Milestone updated');
      },

      deleteMilestone: (projectId, milestoneId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;
        const roles = userState.roles;
        const overrides = userState.permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'projects',
          projectId,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: Cannot manage milestones');
          return;
        }

        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        const milestone = project?.milestones?.find(m => m.id === milestoneId);

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  milestones: (p.milestones || []).filter((m) => m.id !== milestoneId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));

        // Log the action
        logAdminAction('delete', 'projects', milestoneId, milestone?.name, {
          action: 'deleteMilestone',
          projectId,
        });

        toast.success('Milestone deleted');
      },

      toggleMilestoneComplete: (projectId, milestoneId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;
        const roles = userState.roles;
        const overrides = userState.permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'projects',
          projectId,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: Cannot manage milestones');
          return;
        }

        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        const milestone = project?.milestones?.find(m => m.id === milestoneId);
        const newCompletedState = !milestone?.completed;

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  milestones: (p.milestones || []).map((m) =>
                    m.id === milestoneId
                      ? {
                          ...m,
                          completed: !m.completed,
                          completedAt: !m.completed ? new Date().toISOString() : null,
                          updatedAt: new Date().toISOString(),
                        }
                      : m
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));

        // Log the action
        logAdminAction('update', 'projects', milestoneId, milestone?.name, {
          action: 'toggleMilestoneComplete',
          projectId,
          completed: newCompletedState,
        });
      },

      selectProject: (id) => set({ selectedProjectId: id })
    }),
    { name: 'project-storage-v2' }
  )
);
