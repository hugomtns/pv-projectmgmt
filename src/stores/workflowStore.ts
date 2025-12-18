import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workflow, Stage, TaskTemplate } from '@/lib/types';
import { defaultWorkflow } from '@/data/seedData';

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

      addStage: (stage) => set((state) => ({
        workflow: {
          stages: [...state.workflow.stages, { ...stage, id: crypto.randomUUID() }]
        }
      })),

      updateStage: (id, updates) => set((state) => ({
        workflow: {
          stages: state.workflow.stages.map(s =>
            s.id === id ? { ...s, ...updates } : s
          )
        }
      })),

      removeStage: (id) => set((state) => ({
        workflow: {
          stages: state.workflow.stages.filter(s => s.id !== id)
        }
      })),

      reorderStages: (fromIndex, toIndex) => set((state) => {
        const stages = [...state.workflow.stages];
        const [removed] = stages.splice(fromIndex, 1);
        stages.splice(toIndex, 0, removed);
        return { workflow: { stages } };
      }),

      addTaskTemplate: (stageId, template) => set((state) => ({
        workflow: {
          stages: state.workflow.stages.map(s =>
            s.id === stageId
              ? { ...s, taskTemplates: [...s.taskTemplates, { ...template, id: crypto.randomUUID() }] }
              : s
          )
        }
      })),

      updateTaskTemplate: (stageId, templateId, updates) => set((state) => ({
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
      })),

      removeTaskTemplate: (stageId, templateId) => set((state) => ({
        workflow: {
          stages: state.workflow.stages.map(s =>
            s.id === stageId
              ? { ...s, taskTemplates: s.taskTemplates.filter(t => t.id !== templateId) }
              : s
          )
        }
      })),

      resetToDefault: () => set({ workflow: defaultWorkflow })
    }),
    { name: 'workflow-storage-v2' }
  )
);
