import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Task, Comment } from '@/lib/types';

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

      addProject: (project) => set((state) => {
        const now = new Date().toISOString();
        const newProject: Project = {
          ...project,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          stages: project.stages || {}
        };
        return { projects: [...state.projects, newProject] };
      }),

      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        )
      })),

      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId
      })),

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
                      [stageId]: p.stages[stageId] || {
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

      addTask: (projectId, stageId, task) => set((state) => ({
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
      })),

      updateTask: (projectId, stageId, taskId, updates) => set((state) => ({
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
      })),

      deleteTask: (projectId, stageId, taskId) => set((state) => ({
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
      })),

      addComment: (projectId, stageId, taskId, comment) => set((state) => ({
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
      })),

      selectProject: (id) => set({ selectedProjectId: id })
    }),
    { name: 'project-storage' }
  )
);
