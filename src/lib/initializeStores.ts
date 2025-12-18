import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { defaultWorkflow, mockProjects } from '@/data/seedData';

/**
 * Migrate old task data structure from 'name' to 'title' field
 */
function migrateTaskData() {
  const projectState = useProjectStore.getState();
  let migrated = false;

  const updatedProjects = projectState.projects.map((project) => {
    const updatedStages: typeof project.stages = {};

    Object.entries(project.stages).forEach(([stageId, stageData]) => {
      const updatedTasks = stageData.tasks.map((task: any) => {
        // If task has 'name' but not 'title', migrate it
        if (task.name && !task.title) {
          migrated = true;
          return {
            id: task.id,
            title: task.name,
            description: task.description || '',
            assignee: task.assignee || '',
            dueDate: task.dueDate || null,
            status: task.status,
            comments: task.comments || [],
          };
        }
        return task;
      });

      updatedStages[stageId] = {
        ...stageData,
        tasks: updatedTasks,
      };
    });

    return {
      ...project,
      stages: updatedStages,
    };
  });

  if (migrated) {
    useProjectStore.setState({ projects: updatedProjects });
    console.log('✓ Migrated task data from name to title field');
  }
}

/**
 * Initialize stores with seed data on first load.
 * Checks if workflow store is empty and seeds both workflow and projects if needed.
 */
export function initializeStores() {
  const workflowState = useWorkflowStore.getState();
  const projectState = useProjectStore.getState();

  // Check if stores are empty (first load)
  const isFirstLoad = workflowState.workflow.stages.length === 0 && projectState.projects.length === 0;

  if (isFirstLoad) {
    // Seed workflow
    useWorkflowStore.setState({ workflow: defaultWorkflow });

    // Seed projects
    mockProjects.forEach((project) => {
      useProjectStore.getState().addProject(project);
    });

    console.log('✓ Stores initialized with seed data');
  } else {
    // Run migrations on existing data
    migrateTaskData();
  }
}
