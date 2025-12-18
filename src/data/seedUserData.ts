import type { User, UserGroup, CustomRole } from '@/lib/types';

const fullAccess = { create: true, read: true, update: true, delete: true };
const readOnly = { create: false, read: true, update: false, delete: false };
const noAccess = { create: false, read: false, update: false, delete: false };

export const seedRoles: CustomRole[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Full system access',
    isSystem: true,
    permissions: {
      projects: fullAccess,
      workflows: fullAccess,
      tasks: fullAccess,
      comments: fullAccess,
      user_management: fullAccess,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role-user',
    name: 'User',
    description: 'Standard user access',
    isSystem: true,
    permissions: {
      projects: fullAccess,
      workflows: fullAccess,
      tasks: fullAccess,
      comments: fullAccess,
      user_management: readOnly,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only access',
    isSystem: true,
    permissions: {
      projects: readOnly,
      workflows: readOnly,
      tasks: readOnly,
      comments: readOnly,
      user_management: noAccess,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const seedUsers: User[] = [
  {
    id: 'user-admin',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    function: 'System Administrator',
    roleId: 'role-admin',
    groupIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-pm',
    firstName: 'Project',
    lastName: 'Manager',
    email: 'pm@example.com',
    function: 'Project Manager',
    roleId: 'role-user',
    groupIds: ['group-managers'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-dev',
    firstName: 'Developer',
    lastName: 'User',
    email: 'dev@example.com',
    function: 'Software Developer',
    roleId: 'role-user',
    groupIds: ['group-managers'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-viewer',
    firstName: 'Guest',
    lastName: 'Viewer',
    email: 'guest@example.com',
    function: 'External Reviewer',
    roleId: 'role-viewer',
    groupIds: ['group-reviewers'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const seedGroups: UserGroup[] = [
  {
    id: 'group-managers',
    name: 'Project Managers',
    description: 'Team leads managing projects',
    memberIds: ['user-pm', 'user-dev'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'group-reviewers',
    name: 'External Reviewers',
    description: 'External stakeholders with limited access',
    memberIds: ['user-viewer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
