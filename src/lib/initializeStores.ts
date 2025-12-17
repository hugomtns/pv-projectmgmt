import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { defaultWorkflow, mockProjects } from '@/data/seedData';

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
  }
}
