import { useWorkflowStore } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUserStore } from '@/stores/userStore';
import { useFilterStore } from '@/stores/filterStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useDisplayStore } from '@/stores/displayStore';
import { useSiteStore } from '@/stores/siteStore';
import { defaultWorkflow, mockProjects } from '@/data/seedData';
import { seedUsers, seedGroups, seedRoles } from '@/data/seedUserData';
import { toast } from 'sonner';
import type { Project } from '@/lib/types';

/**
 * Create full Project objects from mock data without triggering store actions (and thus logging)
 */
function createSeededProjects(): Project[] {
  const now = new Date().toISOString();
  return mockProjects.map((mock) => ({
    ...mock,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }));
}

// Data version - increment this to force a data refresh
const DATA_VERSION = 10;

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
 * Migrate filter store from old owner string to new owners array
 */
function migrateFilterStore() {
  const filterState = useFilterStore.getState();
  const filters = filterState.filters;

  // Check if old schema with string owner exists
  if (typeof (filters as any).owner === 'string') {
    const oldOwner = (filters as any).owner;
    useFilterStore.setState({
      filters: {
        ...filters,
        owners: oldOwner ? [oldOwner] : [],
      }
    });
    console.log('✓ Migrated filter store owner field to owners array');
  }
}

/**
 * Add attachments field to existing projects
 */
function migrateProjectsForAttachments() {
  const projectState = useProjectStore.getState();
  let migrated = false;

  const updatedProjects = projectState.projects.map((project: any) => {
    // If project doesn't have attachments field, add it
    if (!project.attachments) {
      migrated = true;
      return {
        ...project,
        attachments: [],
      };
    }
    return project;
  });

  if (migrated) {
    useProjectStore.setState({ projects: updatedProjects });
    console.log('✓ Migrated projects to include attachments field');
  }
}

/**
 * Add attachments field to existing tasks in all stages
 */
function migrateTasksForAttachments() {
  const projectState = useProjectStore.getState();
  let migrated = false;

  const updatedProjects = projectState.projects.map((project) => {
    const updatedStages: typeof project.stages = {};
    let projectMigrated = false;

    Object.entries(project.stages).forEach(([stageId, stageData]) => {
      const updatedTasks = stageData.tasks.map((task: any) => {
        // If task doesn't have attachments field, add it
        if (!task.attachments) {
          migrated = true;
          projectMigrated = true;
          return {
            ...task,
            attachments: [],
          };
        }
        return task;
      });

      updatedStages[stageId] = {
        ...stageData,
        tasks: updatedTasks,
      };
    });

    if (projectMigrated) {
      return {
        ...project,
        stages: updatedStages,
      };
    }
    return project;
  });

  if (migrated) {
    useProjectStore.setState({ projects: updatedProjects });
    console.log('✓ Migrated tasks to include attachments field');
  }
}

/**
 * Add lock fields to existing documents
 */
function migrateDocumentsForLocking() {
  const documentState = useDocumentStore.getState();
  const documentsNeedLockFields = documentState.documents.some(
    (doc: any) => doc.isLocked === undefined
  );

  if (documentsNeedLockFields) {
    const updatedDocuments = documentState.documents.map((doc: any) => ({
      ...doc,
      isLocked: doc.isLocked ?? false,
      lockedBy: doc.lockedBy ?? undefined,
      lockedAt: doc.lockedAt ?? undefined,
      lockedByUserId: doc.lockedByUserId ?? undefined,
    }));

    useDocumentStore.setState({ documents: updatedDocuments });
    console.log('✓ Migrated documents to include lock fields');
  }
}

/**
 * Add milestones field to existing projects
 */
function migrateProjectsForMilestones() {
  const projectState = useProjectStore.getState();
  let migrated = false;

  const updatedProjects = projectState.projects.map((project: any) => {
    if (!project.milestones) {
      migrated = true;
      return {
        ...project,
        milestones: [],
      };
    }
    return project;
  });

  if (migrated) {
    useProjectStore.setState({ projects: updatedProjects });
    console.log('✓ Migrated projects to include milestones field');
  }
}

/**
 * Add timeline settings to display store if missing
 */
function migrateDisplayStoreForTimeline() {
  const displayState = useDisplayStore.getState();
  const settings = displayState.settings as any;

  // Check if timeline settings are missing
  if (!settings.timeline) {
    useDisplayStore.setState({
      settings: {
        ...settings,
        timeline: {
          viewMode: 'quarter',
          showCompletedMilestones: true,
          groupBy: 'none',
          ordering: { field: 'priority', direction: 'asc' },
          properties: ['priority', 'owner', 'milestones'],
        }
      }
    });
    console.log('✓ Migrated display store to include timeline settings');
  }
}

/**
 * Add 'components' permissions to existing roles
 */
function migrateRolesForComponents() {
  const userState = useUserStore.getState();
  const roles = userState.roles;

  // Check if any role is missing 'components' permission
  const needsMigration = roles.some((role: any) => !role.permissions.components);

  if (needsMigration) {
    const updatedRoles = roles.map((role: any) => {
      if (role.permissions.components) return role;

      // Determine permissions based on role type
      let componentPermissions;
      if (role.id === 'role-admin') {
        componentPermissions = { create: true, read: true, update: true, delete: true };
      } else if (role.id === 'role-user') {
        componentPermissions = { create: true, read: true, update: true, delete: true };
      } else {
        // Guest and other roles: read-only
        componentPermissions = { create: false, read: true, update: false, delete: false };
      }

      return {
        ...role,
        permissions: {
          ...role.permissions,
          components: componentPermissions,
        },
      };
    });

    useUserStore.setState({ roles: updatedRoles });
    console.log('✓ Migrated roles to include components permissions');
  }
}

/**
 * Add 'boqs' permissions to existing roles
 */
function migrateRolesForBOQs() {
  const userState = useUserStore.getState();
  const roles = userState.roles;

  // Check if any role is missing 'boqs' permission
  const needsMigration = roles.some((role: any) => !role.permissions.boqs);

  if (needsMigration) {
    const updatedRoles = roles.map((role: any) => {
      if (role.permissions.boqs) return role;

      // Determine permissions based on role type
      let boqPermissions;
      if (role.id === 'role-admin') {
        boqPermissions = { create: true, read: true, update: true, delete: true };
      } else if (role.id === 'role-user') {
        boqPermissions = { create: true, read: true, update: true, delete: true };
      } else {
        // Guest and other roles: read-only
        boqPermissions = { create: false, read: true, update: false, delete: false };
      }

      return {
        ...role,
        permissions: {
          ...role.permissions,
          boqs: boqPermissions,
        },
      };
    });

    useUserStore.setState({ roles: updatedRoles });
    console.log('✓ Migrated roles to include boqs permissions');
  }
}

/**
 * Add 'admin_logs' permissions to existing roles
 */
function migrateRolesForAdminLogs() {
  const userState = useUserStore.getState();
  const roles = userState.roles;

  // Check if any role is missing 'admin_logs' permission
  const needsMigration = roles.some((role: any) => !role.permissions.admin_logs);

  if (needsMigration) {
    const updatedRoles = roles.map((role: any) => {
      if (role.permissions.admin_logs) return role;

      // Only admins get access to admin logs
      const adminLogsPermissions = role.id === 'role-admin'
        ? { create: true, read: true, update: true, delete: true }
        : { create: false, read: false, update: false, delete: false };

      return {
        ...role,
        permissions: {
          ...role.permissions,
          admin_logs: adminLogsPermissions,
        },
      };
    });

    useUserStore.setState({ roles: updatedRoles });
    console.log('✓ Migrated roles to include admin_logs permissions');
  }
}

/**
 * Fix sites with usableArea = 0 or undefined (should equal totalArea when no exclusions)
 */
function migrateSitesUsableArea() {
  const siteState = useSiteStore.getState();
  let migrated = false;

  const updatedSites = siteState.sites.map((site: any) => {
    // If usableArea is 0 or undefined but totalArea exists, calculate it
    if ((site.usableArea === 0 || site.usableArea === undefined) && site.totalArea) {
      const exclusionArea = (site.exclusionZones || []).reduce(
        (sum: number, ez: any) => sum + (ez.area || 0),
        0
      );
      const calculatedUsableArea = Math.max(0, site.totalArea - exclusionArea);
      migrated = true;
      return {
        ...site,
        usableArea: calculatedUsableArea,
      };
    }
    return site;
  });

  if (migrated) {
    useSiteStore.setState({ sites: updatedSites });
    console.log('✓ Migrated sites to fix usableArea calculation');
  }
}

/**
 * Add 'sites' permissions to existing roles
 */
function migrateRolesForSites() {
  const userState = useUserStore.getState();
  const roles = userState.roles;

  // Check if any role is missing 'sites' permission
  const needsMigration = roles.some((role: any) => !role.permissions.sites);

  if (needsMigration) {
    const updatedRoles = roles.map((role: any) => {
      if (role.permissions.sites) return role;

      // Determine permissions based on role type
      let sitesPermissions;
      if (role.id === 'role-admin') {
        sitesPermissions = { create: true, read: true, update: true, delete: true };
      } else if (role.id === 'role-user') {
        sitesPermissions = { create: true, read: true, update: true, delete: true };
      } else {
        // Guest and other roles: read-only
        sitesPermissions = { create: false, read: true, update: false, delete: false };
      }

      return {
        ...role,
        permissions: {
          ...role.permissions,
          sites: sitesPermissions,
        },
      };
    });

    useUserStore.setState({ roles: updatedRoles });
    console.log('✓ Migrated roles to include sites permissions');
  }
}

/**
 * Initialize stores with seed data on first load.
 * Checks if workflow store is empty and seeds both workflow and projects if needed.
 * Also checks data version and forces refresh if version has changed.
 */
export function initializeStores() {
  try {
    // Check stored data version
    const storedVersion = localStorage.getItem('data-version');
    const needsRefresh = !storedVersion || parseInt(storedVersion) < DATA_VERSION;

    if (needsRefresh) {
      console.log(`Data version mismatch (stored: ${storedVersion}, current: ${DATA_VERSION}). Refreshing seed data...`);

      // Clear all stores and re-seed
      useWorkflowStore.setState({ workflow: defaultWorkflow });

      // Clear projects and set seeded projects directly (without logging)
      useProjectStore.setState({ projects: createSeededProjects() });

      // Clear and re-seed user store
      useUserStore.setState({
        users: seedUsers,
        groups: seedGroups,
        roles: seedRoles,
        permissionOverrides: [],
        currentUser: seedUsers[0], // Set admin as default current user
      });

      // Reset filters
      useFilterStore.setState({
        filters: {
          stages: [],
          priorities: [],
          owners: [],
          search: '',
        },
      });

      // Update stored version
      localStorage.setItem('data-version', DATA_VERSION.toString());

      console.log('✓ All stores refreshed with new seed data (version ' + DATA_VERSION + ')');
      toast.success('Data refreshed', {
        description: 'Seed data has been updated to the latest version.',
      });

      return;
    }

    const workflowState = useWorkflowStore.getState();
    const projectState = useProjectStore.getState();

    // Check if stores are empty (first load)
    const isFirstLoad = workflowState.workflow.stages.length === 0 && projectState.projects.length === 0;

    if (isFirstLoad) {
      // Seed workflow
      useWorkflowStore.setState({ workflow: defaultWorkflow });

      // Seed projects directly (without logging)
      useProjectStore.setState({ projects: createSeededProjects() });

      console.log('✓ Stores initialized with seed data');
    } else {
      // Run migrations on existing data
      migrateTaskData();
      migrateFilterStore();
      migrateProjectsForAttachments();
      migrateTasksForAttachments();
      migrateDocumentsForLocking();
      migrateProjectsForMilestones();
      migrateDisplayStoreForTimeline();
      migrateRolesForComponents();
      migrateRolesForBOQs();
      migrateRolesForAdminLogs();
      migrateRolesForSites();
      migrateSitesUsableArea();
    }

    // Initialize user store if empty
    const userState = useUserStore.getState();
    const isUserStoreEmpty =
      userState.users.length === 0 &&
      userState.roles.length === 0;

    if (isUserStoreEmpty) {
      useUserStore.setState({
        users: seedUsers,
        groups: seedGroups,
        roles: seedRoles,
        permissionOverrides: [],
        currentUser: seedUsers[0], // Set admin as default current user
      });
      console.log('✓ User store initialized with seed data');
    }

    // Store current version if not set
    if (!storedVersion) {
      localStorage.setItem('data-version', DATA_VERSION.toString());
    }
  } catch (error) {
    console.error('Failed to initialize stores:', error);
    toast.error('Failed to load data', {
      description: 'There was an error loading your data. The app will continue with default settings.',
    });

    // Fallback: seed with default data
    try {
      useWorkflowStore.setState({ workflow: defaultWorkflow });
      useProjectStore.setState({ projects: createSeededProjects() });
    } catch (fallbackError) {
      console.error('Fallback initialization also failed:', fallbackError);
      toast.error('Critical error', {
        description: 'Unable to initialize the application. Please refresh the page.',
      });
    }
  }
}
