import type { EntityType } from '@/lib/types/permission';
import { useProjectStore } from '@/stores/projectStore';
import { useWorkflowStore } from '@/stores/workflowStore';

/**
 * Get human-readable label for an entity type
 */
export function getEntityTypeLabel(entityType: EntityType): string {
  const labels: Record<EntityType, string> = {
    projects: 'Projects',
    workflows: 'Workflows',
    tasks: 'Tasks',
    comments: 'Comments',
    user_management: 'User Management',
  };
  return labels[entityType];
}

/**
 * Get the name of a specific entity by its ID
 * Returns null if the entity is not found
 */
export function getEntityName(entityType: EntityType, entityId: string): string | null {
  switch (entityType) {
    case 'projects': {
      const project = useProjectStore.getState().projects.find(p => p.id === entityId);
      return project ? `${project.name} (${project.location})` : null;
    }

    case 'workflows': {
      const stage = useWorkflowStore.getState().workflow.stages.find(s => s.id === entityId);
      return stage ? stage.name : null;
    }

    case 'tasks': {
      const projects = useProjectStore.getState().projects;
      for (const project of projects) {
        for (const [stageId, stageData] of Object.entries(project.stages)) {
          const task = stageData.tasks.find(t => t.id === entityId);
          if (task) {
            // Find stage name from workflow
            const workflow = useWorkflowStore.getState().workflow;
            const stage = workflow.stages.find(s => s.id === stageId);
            const stageName = stage?.name || 'Unknown Stage';
            return `${project.name} > ${stageName} > ${task.title}`;
          }
        }
      }
      return null;
    }

    case 'comments': {
      const projects = useProjectStore.getState().projects;
      for (const project of projects) {
        for (const stageData of Object.values(project.stages)) {
          for (const task of stageData.tasks) {
            const comment = task.comments.find(c => c.id === entityId);
            if (comment) {
              const snippet = comment.text.length > 50
                ? comment.text.substring(0, 50) + '...'
                : comment.text;
              return `"${snippet}" - ${comment.author} (on: ${task.title})`;
            }
          }
        }
      }
      return null;
    }

    case 'user_management':
      // User management has no specific entities
      return null;

    default:
      return null;
  }
}

/**
 * Get names for multiple entities, filtering out any that are not found
 */
export function getEntityNames(entityType: EntityType, entityIds: string[]): string[] {
  return entityIds
    .map(id => getEntityName(entityType, id))
    .filter((name): name is string => name !== null);
}
