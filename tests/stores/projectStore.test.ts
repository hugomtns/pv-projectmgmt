import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@/stores/projectStore';
import { useUserStore } from '@/stores/userStore';
import { seedRoles } from '@/data/seedUserData';
import type { Project, Task, Comment } from '@/lib/types';

describe('projectStore', () => {
  beforeEach(() => {
    // Reset project store before each test
    useProjectStore.setState({ projects: [], selectedProjectId: null });

    // Set up user store with roles and a current admin user for testing
    const adminUser = {
      id: 'test-user-1',
      firstName: 'Test',
      lastName: 'Admin',
      email: 'admin@test.com',
      function: 'Administrator',
      roleId: 'role-admin',
      groupIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    useUserStore.setState({
      currentUser: adminUser,
      roles: seedRoles,
      users: [adminUser],
      groups: [],
      permissionOverrides: []
    });
  });

  describe('addProject', () => {
    it('should add a new project with generated id and timestamps', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Solar Farm A',
        location: 'California',
        priority: 2,
        owner: 'John Doe',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);

      const { projects } = useProjectStore.getState();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Solar Farm A');
      expect(projects[0].id).toBeDefined();
      expect(projects[0].createdAt).toBeDefined();
      expect(projects[0].updatedAt).toBeDefined();
      expect(projects[0].stages).toEqual({});
    });
  });

  describe('updateProject', () => {
    it('should update project properties', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Solar Farm A',
        location: 'California',
        priority: 2,
        owner: 'John Doe',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().updateProject(projectId, { name: 'Updated Farm', priority: 1 });

      const { projects } = useProjectStore.getState();
      expect(projects[0].name).toBe('Updated Farm');
      expect(projects[0].priority).toBe(1);
      expect(projects[0].updatedAt).toBeDefined();
    });
  });

  describe('deleteProject', () => {
    it('should remove a project by id', () => {
      const project1: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm A',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1'
      };

      const project2: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm B',
        location: 'TX',
        priority: 3,
        owner: 'Jane',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project1);
      useProjectStore.getState().addProject(project2);

      const projectId = useProjectStore.getState().projects[0].id;
      useProjectStore.getState().deleteProject(projectId);

      const { projects } = useProjectStore.getState();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Farm B');
    });

    it('should clear selectedProjectId if deleted project was selected', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm A',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().selectProject(projectId);
      expect(useProjectStore.getState().selectedProjectId).toBe(projectId);

      useProjectStore.getState().deleteProject(projectId);
      expect(useProjectStore.getState().selectedProjectId).toBeNull();
    });
  });

  describe('moveProjectToStage - Gate Logic', () => {
    it('should allow moving to new stage when all tasks are complete', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm A',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      // Add tasks to current stage, all complete
      const task1: Omit<Task, 'id'> = {
        title: 'Task 1',
        description: 'Desc 1',
        assignee: 'John',
        dueDate: null,
        status: 'complete',
        comments: []
      };

      const task2: Omit<Task, 'id'> = {
        title: 'Task 2',
        description: 'Desc 2',
        assignee: 'Jane',
        dueDate: null,
        status: 'complete',
        comments: []
      };

      useProjectStore.getState().addTask(projectId, 'stage-1', task1);
      useProjectStore.getState().addTask(projectId, 'stage-1', task2);

      // Try to move to next stage
      const success = useProjectStore.getState().moveProjectToStage(projectId, 'stage-2');

      expect(success).toBe(true);
      const { projects } = useProjectStore.getState();
      expect(projects[0].currentStageId).toBe('stage-2');
    });

    it('should block moving to new stage when tasks are incomplete', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm A',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      // Add tasks to current stage, some incomplete
      const task1: Omit<Task, 'id'> = {
        title: 'Task 1',
        description: 'Desc 1',
        assignee: 'John',
        dueDate: null,
        status: 'complete',
        comments: []
      };

      const task2: Omit<Task, 'id'> = {
        title: 'Task 2',
        description: 'Desc 2',
        assignee: 'Jane',
        dueDate: null,
        status: 'in_progress',  // Not complete!
        comments: []
      };

      useProjectStore.getState().addTask(projectId, 'stage-1', task1);
      useProjectStore.getState().addTask(projectId, 'stage-1', task2);

      // Try to move to next stage
      const success = useProjectStore.getState().moveProjectToStage(projectId, 'stage-2');

      expect(success).toBe(false);
      const { projects } = useProjectStore.getState();
      expect(projects[0].currentStageId).toBe('stage-1'); // Should still be at stage-1
    });

    it('should allow moving when current stage has no tasks', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm A',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      // Move to stage-2 without any tasks in stage-1
      const success = useProjectStore.getState().moveProjectToStage(projectId, 'stage-2');

      expect(success).toBe(true);
      const { projects } = useProjectStore.getState();
      expect(projects[0].currentStageId).toBe('stage-2');
    });
  });

  describe('addTask', () => {
    it('should add a task to a project stage', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm A',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      const task: Omit<Task, 'id'> = {
        title: 'Review designs',
        description: 'Review all design documents',
        assignee: 'John Doe',
        dueDate: '2024-12-31',
        status: 'not_started',
        comments: []
      };

      useProjectStore.getState().addTask(projectId, 'stage-1', task);

      const { projects } = useProjectStore.getState();
      expect(projects[0].stages['stage-1'].tasks).toHaveLength(1);
      expect(projects[0].stages['stage-1'].tasks[0].title).toBe('Review designs');
      expect(projects[0].stages['stage-1'].tasks[0].id).toBeDefined();
    });
  });

  describe('updateTask', () => {
    it('should update task properties', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm A',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      const task: Omit<Task, 'id'> = {
        title: 'Review designs',
        description: 'Desc',
        assignee: 'John',
        dueDate: null,
        status: 'not_started',
        comments: []
      };

      useProjectStore.getState().addTask(projectId, 'stage-1', task);
      const taskId = useProjectStore.getState().projects[0].stages['stage-1'].tasks[0].id;

      useProjectStore.getState().updateTask(projectId, 'stage-1', taskId, {
        status: 'in_progress',
        assignee: 'Jane Doe'
      });

      const { projects } = useProjectStore.getState();
      expect(projects[0].stages['stage-1'].tasks[0].status).toBe('in_progress');
      expect(projects[0].stages['stage-1'].tasks[0].assignee).toBe('Jane Doe');
    });
  });

  describe('deleteTask', () => {
    it('should remove a task from a stage', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm A',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      const task1: Omit<Task, 'id'> = {
        title: 'Task 1',
        description: 'Desc 1',
        assignee: 'John',
        dueDate: null,
        status: 'not_started',
        comments: []
      };

      const task2: Omit<Task, 'id'> = {
        title: 'Task 2',
        description: 'Desc 2',
        assignee: 'Jane',
        dueDate: null,
        status: 'not_started',
        comments: []
      };

      useProjectStore.getState().addTask(projectId, 'stage-1', task1);
      useProjectStore.getState().addTask(projectId, 'stage-1', task2);

      const taskId = useProjectStore.getState().projects[0].stages['stage-1'].tasks[0].id;
      useProjectStore.getState().deleteTask(projectId, 'stage-1', taskId);

      const { projects } = useProjectStore.getState();
      expect(projects[0].stages['stage-1'].tasks).toHaveLength(1);
      expect(projects[0].stages['stage-1'].tasks[0].title).toBe('Task 2');
    });
  });

  describe('addComment', () => {
    it('should add a comment to a task with generated id and timestamp', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm A',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      const task: Omit<Task, 'id'> = {
        title: 'Task 1',
        description: 'Desc',
        assignee: 'John',
        dueDate: null,
        status: 'not_started',
        comments: []
      };

      useProjectStore.getState().addTask(projectId, 'stage-1', task);
      const taskId = useProjectStore.getState().projects[0].stages['stage-1'].tasks[0].id;

      const comment: Omit<Comment, 'id' | 'createdAt'> = {
        author: 'Jane Doe',
        text: 'This looks good!'
      };

      useProjectStore.getState().addComment(projectId, 'stage-1', taskId, comment);

      const { projects } = useProjectStore.getState();
      const comments = projects[0].stages['stage-1'].tasks[0].comments;
      expect(comments).toHaveLength(1);
      expect(comments[0].text).toBe('This looks good!');
      expect(comments[0].id).toBeDefined();
      expect(comments[0].createdAt).toBeDefined();
    });
  });

  describe('selectProject', () => {
    it('should set the selected project id', () => {
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'> = {
        name: 'Farm A',
        location: 'CA',
        priority: 2,
        owner: 'John',
        currentStageId: 'stage-1'
      };

      useProjectStore.getState().addProject(project);
      const projectId = useProjectStore.getState().projects[0].id;

      useProjectStore.getState().selectProject(projectId);

      expect(useProjectStore.getState().selectedProjectId).toBe(projectId);
    });

    it('should allow deselecting by passing null', () => {
      useProjectStore.getState().selectProject('some-id');
      useProjectStore.getState().selectProject(null);

      expect(useProjectStore.getState().selectedProjectId).toBeNull();
    });
  });
});
