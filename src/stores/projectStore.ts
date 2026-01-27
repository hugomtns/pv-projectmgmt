import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Task, Comment, Milestone, NtpChecklistItem, NtpChecklist } from '@/lib/types';
import { DEFAULT_NTP_CHECKLIST_ITEMS } from '@/data/ntpChecklistTemplate';
import { useWorkflowStore } from './workflowStore';
import { useUserStore } from './userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { logAdminAction } from '@/lib/adminLogger';
import { toast } from 'sonner';
import { extractMentions } from '@/lib/mentions/parser';
import { notifyMention, notifyTaskAssigned } from '@/lib/notifications/notificationService';

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  // Actions
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => string | undefined;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  moveProjectToStage: (projectId: string, stageId: string) => boolean; // returns false if gate blocks
  // Task actions
  addTask: (projectId: string, stageId: string, task: Omit<Task, 'id'>) => string | undefined;
  updateTask: (projectId: string, stageId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (projectId: string, stageId: string, taskId: string) => void;
  addComment: (projectId: string, stageId: string, taskId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => void;
  updateComment: (projectId: string, stageId: string, taskId: string, commentId: string, updates: Partial<Comment>) => void;
  // Milestone actions
  addMilestone: (projectId: string, milestoneData: Omit<Milestone, 'id' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'>) => void;
  updateMilestone: (projectId: string, milestoneId: string, updates: Partial<Milestone>) => void;
  deleteMilestone: (projectId: string, milestoneId: string) => void;
  toggleMilestoneComplete: (projectId: string, milestoneId: string) => void;
  // NTP Checklist actions
  initializeNtpChecklist: (projectId: string) => void;
  updateNtpChecklistItem: (projectId: string, itemId: string, updates: Partial<NtpChecklistItem>) => void;
  toggleNtpChecklistItemStatus: (projectId: string, itemId: string) => void;
  addNtpChecklistItem: (projectId: string, item: Omit<NtpChecklistItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteNtpChecklistItem: (projectId: string, itemId: string) => void;
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
          return undefined;
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
          return undefined;
        }

        const projectId = crypto.randomUUID();

        set((state) => {
          const now = new Date().toISOString();
          const newProject: Project = {
            ...project,
            id: projectId,
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

        return projectId;
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
        const users = useUserStore.getState().users;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to create tasks');
          return undefined;
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
          return undefined;
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

        // Notify assignee if set and different from current user
        if (task.assignee && task.assignee !== currentUser.id) {
          const assigneeUser = users.find((u) => u.id === task.assignee);
          if (assigneeUser) {
            const actorName = `${currentUser.firstName} ${currentUser.lastName}`;
            notifyTaskAssigned({
              actorId: currentUser.id,
              actorName,
              assigneeId: task.assignee,
              task: { ...task, id: taskId } as Task,
              projectId,
              stageId,
            });
          }
        }

        return taskId;
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

        // Check for assignee change before update
        const oldAssignee = task?.assignee;
        const newAssignee = updates.assignee;
        const assigneeChanged = newAssignee && newAssignee !== oldAssignee;

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

        // Notify new assignee if assignee changed
        if (assigneeChanged && task && newAssignee) {
          // Get the updated task
          const updatedTask = { ...task, ...updates };
          notifyTaskAssigned({
            actorId: currentUser.id,
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            assigneeId: newAssignee,
            task: updatedTask,
            projectId,
            stageId,
            projectName: project?.name,
          });
        }

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
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;
        const roles = userState.roles;
        const overrides = userState.permissionOverrides;
        const users = userState.users;

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

        // Extract mentions from comment text
        const mentionedUserIds = extractMentions(comment.text, users);

        // Get task and project info for notification context
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
                      tasks: p.stages[stageId].tasks.map(t =>
                        t.id === taskId
                          ? {
                              ...t,
                              comments: [
                                ...t.comments,
                                {
                                  ...comment,
                                  id: commentId,
                                  authorId: currentUser.id,
                                  mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
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

        // Trigger mention notifications
        if (mentionedUserIds.length > 0 && task) {
          notifyMention({
            actorId: currentUser.id,
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            mentionedUserIds,
            commentText: comment.text,
            context: {
              type: 'task',
              projectId,
              stageId,
              taskId,
              taskTitle: task.title,
            },
          });
        }

        // Log the action
        logAdminAction('create', 'comments', commentId, undefined, { projectId, stageId, taskId });
      },

      updateComment: (projectId, stageId, taskId, commentId, updates) => {
        // Permission check
        const currentUser = useUserStore.getState().currentUser;
        const roles = useUserStore.getState().roles;
        const overrides = useUserStore.getState().permissionOverrides;

        if (!currentUser) {
          toast.error('You must be logged in to update comments');
          return;
        }

        const permissions = resolvePermissions(
          currentUser,
          'comments',
          commentId,
          overrides,
          roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update comments');
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
                              comments: t.comments.map(c =>
                                c.id === commentId
                                  ? { ...c, ...updates }
                                  : c
                              )
                            }
                          : t
                      )
                    }
                  }
                }
              : p
          )
        }));

        logAdminAction('update', 'comments', commentId, undefined, { projectId, stageId, taskId });
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

      // NTP Checklist actions
      initializeNtpChecklist: (projectId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        if (!project) {
          toast.error('Project not found');
          return;
        }

        // Permission check: Admins have full access, project owners have full access, others view-only
        const isAdmin = currentUser.roleId === 'role-admin';
        const isProjectOwner = project.owner === currentUser.id;

        if (!isAdmin && !isProjectOwner) {
          toast.error('Permission denied: Only admins or project owners can initialize NTP checklists');
          return;
        }

        if (project.ntpChecklist) {
          toast.error('NTP checklist already exists for this project');
          return;
        }

        const now = new Date().toISOString();
        const items: NtpChecklistItem[] = DEFAULT_NTP_CHECKLIST_ITEMS.map((template) => ({
          ...template,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        }));

        const ntpChecklist: NtpChecklist = {
          items,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, ntpChecklist, updatedAt: now }
              : p
          ),
        }));

        logAdminAction('create', 'ntp_checklists', projectId, project.name, {
          action: 'initializeNtpChecklist',
          itemCount: items.length,
        });

        toast.success('NTP checklist initialized');
      },

      updateNtpChecklistItem: (projectId, itemId, updates) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        if (!project) {
          toast.error('Project not found');
          return;
        }

        // Permission check: Admins have full access, project owners have full access, others view-only
        const isAdmin = currentUser.roleId === 'role-admin';
        const isProjectOwner = project.owner === currentUser.id;

        if (!isAdmin && !isProjectOwner) {
          toast.error('Permission denied: Only admins or project owners can update NTP checklists');
          return;
        }

        const item = project?.ntpChecklist?.items.find(i => i.id === itemId);

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        // If status is being changed to complete, set completedAt and completedBy
        const statusUpdates: Partial<NtpChecklistItem> = {};
        if (updates.status === 'complete' && item?.status !== 'complete') {
          statusUpdates.completedAt = now;
          statusUpdates.completedBy = userFullName;
        } else if (updates.status && updates.status !== 'complete' && item?.status === 'complete') {
          statusUpdates.completedAt = null;
          statusUpdates.completedBy = null;
        }

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && p.ntpChecklist
              ? {
                  ...p,
                  ntpChecklist: {
                    ...p.ntpChecklist,
                    items: p.ntpChecklist.items.map((i) =>
                      i.id === itemId
                        ? { ...i, ...updates, ...statusUpdates, updatedAt: now }
                        : i
                    ),
                    updatedAt: now,
                  },
                  updatedAt: now,
                }
              : p
          ),
        }));

        logAdminAction('update', 'ntp_checklists', itemId, item?.title, {
          action: 'updateNtpChecklistItem',
          itemTitle: item?.title,
          projectId,
          updates,
        });
      },

      toggleNtpChecklistItemStatus: (projectId, itemId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        if (!project) {
          toast.error('Project not found');
          return;
        }

        // Permission check: Admins have full access, project owners have full access, others view-only
        const isAdmin = currentUser.roleId === 'role-admin';
        const isProjectOwner = project.owner === currentUser.id;

        if (!isAdmin && !isProjectOwner) {
          toast.error('Permission denied: Only admins or project owners can update NTP checklists');
          return;
        }

        const item = project?.ntpChecklist?.items.find(i => i.id === itemId);
        if (!item) return;

        const now = new Date().toISOString();
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`;

        // Cycle through statuses: not_started -> in_progress -> complete -> not_started
        const statusCycle: Record<string, 'not_started' | 'in_progress' | 'complete'> = {
          'not_started': 'in_progress',
          'in_progress': 'complete',
          'complete': 'not_started',
        };
        const newStatus = statusCycle[item.status];

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && p.ntpChecklist
              ? {
                  ...p,
                  ntpChecklist: {
                    ...p.ntpChecklist,
                    items: p.ntpChecklist.items.map((i) =>
                      i.id === itemId
                        ? {
                            ...i,
                            status: newStatus,
                            completedAt: newStatus === 'complete' ? now : null,
                            completedBy: newStatus === 'complete' ? userFullName : null,
                            updatedAt: now,
                          }
                        : i
                    ),
                    updatedAt: now,
                  },
                  updatedAt: now,
                }
              : p
          ),
        }));

        logAdminAction('update', 'ntp_checklists', itemId, item.title, {
          action: 'toggleNtpChecklistItemStatus',
          itemTitle: item.title,
          projectId,
          statusChange: { from: item.status, to: newStatus },
        });
      },

      addNtpChecklistItem: (projectId, item) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        if (!project) {
          toast.error('Project not found');
          return;
        }

        // Permission check: Admins have full access, project owners have full access, others view-only
        const isAdmin = currentUser.roleId === 'role-admin';
        const isProjectOwner = project.owner === currentUser.id;

        if (!isAdmin && !isProjectOwner) {
          toast.error('Permission denied: Only admins or project owners can add NTP checklist items');
          return;
        }

        if (!project.ntpChecklist) {
          toast.error('NTP checklist not initialized');
          return;
        }

        const now = new Date().toISOString();
        const itemId = crypto.randomUUID();
        const newItem: NtpChecklistItem = {
          ...item,
          id: itemId,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && p.ntpChecklist
              ? {
                  ...p,
                  ntpChecklist: {
                    ...p.ntpChecklist,
                    items: [...p.ntpChecklist.items, newItem],
                    updatedAt: now,
                  },
                  updatedAt: now,
                }
              : p
          ),
        }));

        logAdminAction('create', 'ntp_checklists', itemId, item.title, {
          action: 'addNtpChecklistItem',
          itemTitle: item.title,
          projectId,
          category: item.category,
        });

        toast.success('Checklist item added');
      },

      deleteNtpChecklistItem: (projectId, itemId) => {
        const userState = useUserStore.getState();
        const currentUser = userState.currentUser;

        if (!currentUser) {
          toast.error('You must be logged in');
          return;
        }

        const project = useProjectStore.getState().projects.find(p => p.id === projectId);
        if (!project) {
          toast.error('Project not found');
          return;
        }

        // Permission check: Admins have full access, project owners have full access, others view-only
        const isAdmin = currentUser.roleId === 'role-admin';
        const isProjectOwner = project.owner === currentUser.id;

        if (!isAdmin && !isProjectOwner) {
          toast.error('Permission denied: Only admins or project owners can delete NTP checklist items');
          return;
        }

        const item = project?.ntpChecklist?.items.find(i => i.id === itemId);

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && p.ntpChecklist
              ? {
                  ...p,
                  ntpChecklist: {
                    ...p.ntpChecklist,
                    items: p.ntpChecklist.items.filter((i) => i.id !== itemId),
                    updatedAt: new Date().toISOString(),
                  },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));

        logAdminAction('delete', 'ntp_checklists', itemId, item?.title, {
          action: 'deleteNtpChecklistItem',
          itemTitle: item?.title,
          projectId,
        });

        toast.success('Checklist item deleted');
      },

      selectProject: (id) => set({ selectedProjectId: id })
    }),
    { name: 'project-storage-v2' }
  )
);
