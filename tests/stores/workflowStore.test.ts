import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { Stage, TaskTemplate } from '@/lib/types';

describe('workflowStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useWorkflowStore.setState({ workflow: { stages: [] } });
  });

  describe('addStage', () => {
    it('should add a new stage with generated id', () => {
      const stage: Omit<Stage, 'id'> = {
        name: 'Design',
        color: '#3b82f6',
        taskTemplates: []
      };

      useWorkflowStore.getState().addStage(stage);

      const { workflow } = useWorkflowStore.getState();
      expect(workflow.stages).toHaveLength(1);
      expect(workflow.stages[0].name).toBe('Design');
      expect(workflow.stages[0].id).toBeDefined();
    });
  });

  describe('updateStage', () => {
    it('should update stage properties', () => {
      const stage: Omit<Stage, 'id'> = {
        name: 'Design',
        color: '#3b82f6',
        taskTemplates: []
      };

      useWorkflowStore.getState().addStage(stage);
      const stageId = useWorkflowStore.getState().workflow.stages[0].id;

      useWorkflowStore.getState().updateStage(stageId, { name: 'Updated Design', color: '#ef4444' });

      const { workflow } = useWorkflowStore.getState();
      expect(workflow.stages[0].name).toBe('Updated Design');
      expect(workflow.stages[0].color).toBe('#ef4444');
    });
  });

  describe('removeStage', () => {
    it('should remove a stage by id', () => {
      const stage1: Omit<Stage, 'id'> = { name: 'Design', color: '#3b82f6', taskTemplates: [] };
      const stage2: Omit<Stage, 'id'> = { name: 'Build', color: '#10b981', taskTemplates: [] };

      useWorkflowStore.getState().addStage(stage1);
      useWorkflowStore.getState().addStage(stage2);

      const stageId = useWorkflowStore.getState().workflow.stages[0].id;
      useWorkflowStore.getState().removeStage(stageId);

      const { workflow } = useWorkflowStore.getState();
      expect(workflow.stages).toHaveLength(1);
      expect(workflow.stages[0].name).toBe('Build');
    });
  });

  describe('reorderStages', () => {
    it('should reorder stages correctly', () => {
      const stage1: Omit<Stage, 'id'> = { name: 'Design', color: '#3b82f6', taskTemplates: [] };
      const stage2: Omit<Stage, 'id'> = { name: 'Build', color: '#10b981', taskTemplates: [] };
      const stage3: Omit<Stage, 'id'> = { name: 'Test', color: '#f59e0b', taskTemplates: [] };

      useWorkflowStore.getState().addStage(stage1);
      useWorkflowStore.getState().addStage(stage2);
      useWorkflowStore.getState().addStage(stage3);

      // Move first stage to last
      useWorkflowStore.getState().reorderStages(0, 2);

      const { workflow } = useWorkflowStore.getState();
      expect(workflow.stages[0].name).toBe('Build');
      expect(workflow.stages[1].name).toBe('Test');
      expect(workflow.stages[2].name).toBe('Design');
    });
  });

  describe('addTaskTemplate', () => {
    it('should add a task template to a stage', () => {
      const stage: Omit<Stage, 'id'> = { name: 'Design', color: '#3b82f6', taskTemplates: [] };
      useWorkflowStore.getState().addStage(stage);

      const stageId = useWorkflowStore.getState().workflow.stages[0].id;
      const template: Omit<TaskTemplate, 'id'> = {
        title: 'Create wireframes',
        description: 'Design wireframes for the application'
      };

      useWorkflowStore.getState().addTaskTemplate(stageId, template);

      const { workflow } = useWorkflowStore.getState();
      expect(workflow.stages[0].taskTemplates).toHaveLength(1);
      expect(workflow.stages[0].taskTemplates[0].title).toBe('Create wireframes');
      expect(workflow.stages[0].taskTemplates[0].id).toBeDefined();
    });
  });

  describe('updateTaskTemplate', () => {
    it('should update a task template', () => {
      const stage: Omit<Stage, 'id'> = { name: 'Design', color: '#3b82f6', taskTemplates: [] };
      useWorkflowStore.getState().addStage(stage);

      const stageId = useWorkflowStore.getState().workflow.stages[0].id;
      const template: Omit<TaskTemplate, 'id'> = {
        title: 'Create wireframes',
        description: 'Design wireframes'
      };

      useWorkflowStore.getState().addTaskTemplate(stageId, template);
      const templateId = useWorkflowStore.getState().workflow.stages[0].taskTemplates[0].id;

      useWorkflowStore.getState().updateTaskTemplate(stageId, templateId, {
        title: 'Updated wireframes',
        description: 'Updated description'
      });

      const { workflow } = useWorkflowStore.getState();
      expect(workflow.stages[0].taskTemplates[0].title).toBe('Updated wireframes');
      expect(workflow.stages[0].taskTemplates[0].description).toBe('Updated description');
    });
  });

  describe('removeTaskTemplate', () => {
    it('should remove a task template from a stage', () => {
      const stage: Omit<Stage, 'id'> = { name: 'Design', color: '#3b82f6', taskTemplates: [] };
      useWorkflowStore.getState().addStage(stage);

      const stageId = useWorkflowStore.getState().workflow.stages[0].id;
      const template1: Omit<TaskTemplate, 'id'> = { title: 'Task 1', description: 'Desc 1' };
      const template2: Omit<TaskTemplate, 'id'> = { title: 'Task 2', description: 'Desc 2' };

      useWorkflowStore.getState().addTaskTemplate(stageId, template1);
      useWorkflowStore.getState().addTaskTemplate(stageId, template2);

      const templateId = useWorkflowStore.getState().workflow.stages[0].taskTemplates[0].id;
      useWorkflowStore.getState().removeTaskTemplate(stageId, templateId);

      const { workflow } = useWorkflowStore.getState();
      expect(workflow.stages[0].taskTemplates).toHaveLength(1);
      expect(workflow.stages[0].taskTemplates[0].title).toBe('Task 2');
    });
  });

  describe('resetToDefault', () => {
    it('should reset workflow to empty state', () => {
      const stage: Omit<Stage, 'id'> = { name: 'Design', color: '#3b82f6', taskTemplates: [] };
      useWorkflowStore.getState().addStage(stage);

      useWorkflowStore.getState().resetToDefault();

      const { workflow } = useWorkflowStore.getState();
      expect(workflow.stages).toHaveLength(0);
    });
  });
});
