# User Management Integration - Implementation Plan

## Project Context

**Source**: `pv-usermgmt` (React Context + useReducer, CSS Modules + BEM)
**Target**: `pv-projectmgmt` (Zustand + persist, Tailwind CSS)

**Goal**: Port user management, groups, and permission system while adding permission enforcement and user selectors.

---

## Entity Types for Project Management

```typescript
export type EntityType =
  | 'projects'          // Create/read/update/delete projects
  | 'workflows'         // Manage workflow stages and templates
  | 'tasks'             // Manage tasks within projects
  | 'comments'          // Add/edit/delete comments on tasks
  | 'user_management';  // Invite users, manage groups, view roles
```

---

## System Roles & Default Permissions

### Role: Admin
```
projects:         CREATE | READ | UPDATE | DELETE
workflows:        CREATE | READ | UPDATE | DELETE
tasks:            CREATE | READ | UPDATE | DELETE
comments:         CREATE | READ | UPDATE | DELETE
user_management:  CREATE | READ | UPDATE | DELETE
```

### Role: User (Standard)
```
projects:         CREATE | READ | UPDATE | DELETE
workflows:        CREATE | READ | UPDATE | DELETE
tasks:            CREATE | READ | UPDATE | DELETE
comments:         CREATE | READ | UPDATE | DELETE
user_management:  ----   | READ | ----   | ----
```

### Role: Viewer
```
projects:         ----   | READ | ----   | ----
workflows:        ----   | READ | ----   | ----
tasks:            ----   | READ | ----   | ----
comments:         ----   | READ | ----   | ----
user_management:  ----   | ---- | ----   | ----
```

---

## Epic 1: Foundation (Types, Store, Seed Data)

### Story 1.1: Create Type Definitions ⚙️

**Files to Create:**
- `src/lib/types/user.ts`
- `src/lib/types/permission.ts`

**Files to Modify:**
- `src/lib/types.ts` (add exports)

**Implementation:**

```typescript
// src/lib/types/user.ts
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  function: string;        // Job title/role
  roleId: string;          // FK to CustomRole.id
  groupIds: string[];      // Array of group IDs
  createdAt: string;
  updatedAt: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  memberIds: string[];     // Array of user IDs
  createdAt: string;
  updatedAt: string;
}
```

```typescript
// src/lib/types/permission.ts
export type EntityType =
  | 'projects'
  | 'workflows'
  | 'tasks'
  | 'comments'
  | 'user_management';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export interface PermissionSet {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface CustomRole {
  id: string;                    // e.g., 'role-admin'
  name: string;
  description: string;
  isSystem: boolean;             // true = immutable system role
  permissions: Record<EntityType, PermissionSet>;
  createdAt: string;
  updatedAt: string;
}

export interface GroupPermissionOverride {
  id: string;
  groupId: string;               // FK to UserGroup.id
  entityType: EntityType;
  scope: 'all' | 'specific';
  specificEntityIds: string[];   // Only used when scope = 'specific'
  permissions: Partial<PermissionSet>;  // Only overridden actions
}
```

**Acceptance Criteria:**
- [ ] TypeScript compiles without errors
- [ ] Types exported from `src/lib/types.ts`
- [ ] Types match source structure from pv-usermgmt

---

### Story 1.2: Create userStore with Zustand ⚙️

**File to Create:**
- `src/stores/userStore.ts`

**Reference:** `C:\Users\hmmar\GitHub\pv-projectmgmt\src\stores\projectStore.ts`

**Implementation:**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserGroup, CustomRole, GroupPermissionOverride } from '@/lib/types/user';

interface UserState {
  // State
  users: User[];
  groups: UserGroup[];
  roles: CustomRole[];
  permissionOverrides: GroupPermissionOverride[];
  currentUser: User | null;

  // User CRUD
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Group CRUD
  addGroup: (group: Omit<UserGroup, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateGroup: (id: string, updates: Partial<UserGroup>) => void;
  deleteGroup: (id: string) => void;

  // Permission override CRUD
  addPermissionOverride: (override: Omit<GroupPermissionOverride, 'id'>) => void;
  updatePermissionOverride: (id: string, updates: Partial<GroupPermissionOverride>) => void;
  deletePermissionOverride: (id: string) => void;

  // Auth
  setCurrentUser: (user: User | null) => void;
  resetToSeed: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      users: [],
      groups: [],
      roles: [],
      permissionOverrides: [],
      currentUser: null,

      // User actions
      addUser: (user) => set((state) => {
        const now = new Date().toISOString();
        const newUser: User = {
          ...user,
          id: crypto.randomUUID(),
          groupIds: user.groupIds || [],
          createdAt: now,
          updatedAt: now,
        };
        return { users: [...state.users, newUser] };
      }),

      updateUser: (id, updates) => set((state) => ({
        users: state.users.map(u =>
          u.id === id
            ? { ...u, ...updates, updatedAt: new Date().toISOString() }
            : u
        )
      })),

      deleteUser: (id) => set((state) => ({
        users: state.users.filter(u => u.id !== id),
        // CASCADE: Remove user from all groups
        groups: state.groups.map(g => ({
          ...g,
          memberIds: g.memberIds.filter(mid => mid !== id),
          updatedAt: new Date().toISOString()
        }))
      })),

      // Group actions
      addGroup: (group) => set((state) => {
        const now = new Date().toISOString();
        const newGroup: UserGroup = {
          ...group,
          id: crypto.randomUUID(),
          memberIds: group.memberIds || [],
          createdAt: now,
          updatedAt: now,
        };
        return { groups: [...state.groups, newGroup] };
      }),

      updateGroup: (id, updates) => set((state) => ({
        groups: state.groups.map(g =>
          g.id === id
            ? { ...g, ...updates, updatedAt: new Date().toISOString() }
            : g
        )
      })),

      deleteGroup: (id) => set((state) => ({
        groups: state.groups.filter(g => g.id !== id),
        // CASCADE: Remove group from all users
        users: state.users.map(u => ({
          ...u,
          groupIds: u.groupIds.filter(gid => gid !== id),
          updatedAt: new Date().toISOString()
        })),
        // CASCADE: Delete all permission overrides for this group
        permissionOverrides: state.permissionOverrides.filter(
          o => o.groupId !== id
        )
      })),

      // Permission override actions
      addPermissionOverride: (override) => set((state) => ({
        permissionOverrides: [
          ...state.permissionOverrides,
          { ...override, id: crypto.randomUUID() }
        ]
      })),

      updatePermissionOverride: (id, updates) => set((state) => ({
        permissionOverrides: state.permissionOverrides.map(o =>
          o.id === id ? { ...o, ...updates } : o
        )
      })),

      deletePermissionOverride: (id) => set((state) => ({
        permissionOverrides: state.permissionOverrides.filter(o => o.id !== id)
      })),

      // Auth
      setCurrentUser: (user) => set({ currentUser: user }),

      resetToSeed: () => set({
        users: [],
        groups: [],
        roles: [],
        permissionOverrides: [],
        currentUser: null
      })
    }),
    { name: 'user-storage-v1' }
  )
);
```

**Key Patterns:**
- **Bidirectional cascade**: Delete user → remove from groups; Delete group → remove from users
- **Immutable updates**: Use spread operator and map for state updates
- **UUID generation**: Use `crypto.randomUUID()` for IDs
- **Timestamps**: Auto-generate `createdAt` and `updatedAt`

**Acceptance Criteria:**
- [ ] Store compiles without errors
- [ ] Actions mutate state correctly (test in browser console)
- [ ] localStorage persists state with key `user-storage-v1`
- [ ] Cascade deletes work (delete user removes from groups)

---

### Story 1.3: Create Seed Data ⚙️

**File to Create:**
- `src/data/seedUserData.ts`

**File to Modify:**
- `src/lib/initializeStores.ts`

**Reference:** `C:\Users\hmmar\GitHub\pv-usermgmt\src\data\seedRoles.ts`

**Implementation:**

```typescript
// src/data/seedUserData.ts
import type { User, UserGroup, CustomRole } from '@/lib/types/user';

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
```

**Update initializeStores.ts:**

```typescript
import { useUserStore } from '@/stores/userStore';
import { seedUsers, seedGroups, seedRoles } from '@/data/seedUserData';

export function initializeStores() {
  // ... existing project/workflow initialization ...

  // Initialize user store
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
}
```

**Acceptance Criteria:**
- [ ] Seed data includes 3 roles, 4 users, 2 groups
- [ ] initializeStores.ts seeds userStore on first load
- [ ] Opening app in fresh browser shows seed data in userStore
- [ ] currentUser is set to admin user

---

### Story 1.4: Port Permission Resolver ⚙️

**File to Create:**
- `src/lib/permissions/permissionResolver.ts`

**Reference:** `C:\Users\hmmar\GitHub\pv-usermgmt\src\utils\permissionResolver.ts`

**Implementation:**

```typescript
import type { User, CustomRole, GroupPermissionOverride } from '@/lib/types/user';
import type { EntityType, PermissionSet } from '@/lib/types/permission';

/**
 * Resolves the effective permissions for a user on a specific entity type
 *
 * Permission Resolution Logic:
 * 1. Start with ROLE DEFAULTS for the user's role
 * 2. Get all GROUPS the user belongs to
 * 3. For each group, check for OVERRIDES matching the entity type
 * 4. Apply overrides using UNION with HIGHEST PERMISSION WINS:
 *    - If any override grants 'create', user can create
 *    - If any override grants 'read', user can read
 *    - etc.
 * 5. Specific entity overrides take precedence over "all" overrides
 */
export function resolvePermissions(
  user: User,
  entityType: EntityType,
  entityId: string | undefined,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): PermissionSet {
  // Step 1: Get role defaults
  const userRole = roles.find(r => r.id === user.roleId);
  const basePermissions: PermissionSet = userRole?.permissions[entityType] ?? {
    create: false,
    read: false,
    update: false,
    delete: false,
  };

  // Step 2: Get user's groups
  const userGroups = user.groupIds;

  if (userGroups.length === 0) {
    return basePermissions;
  }

  // Step 3 & 4: Find applicable overrides
  const applicableOverrides = permissionOverrides.filter(
    override => userGroups.includes(override.groupId) && override.entityType === entityType
  );

  if (applicableOverrides.length === 0) {
    return basePermissions;
  }

  // Step 5: Separate "all" vs "specific" overrides
  const allOverrides = applicableOverrides.filter(override => override.scope === 'all');
  const specificOverrides = entityId
    ? applicableOverrides.filter(
        override => override.scope === 'specific' && override.specificEntityIds.includes(entityId)
      )
    : [];

  // Start with base permissions
  const effectivePermissions: PermissionSet = { ...basePermissions };

  // Apply "all" overrides with OR logic (union)
  allOverrides.forEach(override => {
    if (override.permissions.create !== undefined) {
      effectivePermissions.create = effectivePermissions.create || override.permissions.create;
    }
    if (override.permissions.read !== undefined) {
      effectivePermissions.read = effectivePermissions.read || override.permissions.read;
    }
    if (override.permissions.update !== undefined) {
      effectivePermissions.update = effectivePermissions.update || override.permissions.update;
    }
    if (override.permissions.delete !== undefined) {
      effectivePermissions.delete = effectivePermissions.delete || override.permissions.delete;
    }
  });

  // Apply specific entity overrides (replace, not OR)
  specificOverrides.forEach(override => {
    if (override.permissions.create !== undefined) {
      effectivePermissions.create = override.permissions.create;
    }
    if (override.permissions.read !== undefined) {
      effectivePermissions.read = override.permissions.read;
    }
    if (override.permissions.update !== undefined) {
      effectivePermissions.update = override.permissions.update;
    }
    if (override.permissions.delete !== undefined) {
      effectivePermissions.delete = override.permissions.delete;
    }
  });

  return effectivePermissions;
}

/**
 * Resolves permissions for all entity types for a user
 */
export function resolveAllPermissions(
  user: User,
  permissionOverrides: GroupPermissionOverride[],
  roles: CustomRole[]
): Record<EntityType, PermissionSet> {
  const entityTypes: EntityType[] = [
    'projects',
    'workflows',
    'tasks',
    'comments',
    'user_management',
  ];

  const permissions: Record<string, PermissionSet> = {};

  entityTypes.forEach(entityType => {
    permissions[entityType] = resolvePermissions(
      user,
      entityType,
      undefined,
      permissionOverrides,
      roles
    );
  });

  return permissions as Record<EntityType, PermissionSet>;
}
```

**Acceptance Criteria:**
- [ ] Functions compile without errors
- [ ] Logic matches source (union-based with precedence)
- [ ] Can be imported and called successfully

---

### Story 1.5: Create Permission Hook ⚙️

**File to Create:**
- `src/hooks/usePermission.ts`

**Implementation:**

```typescript
import { useUserStore } from '@/stores/userStore';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import type { EntityType, PermissionAction } from '@/lib/types/permission';

/**
 * Hook to check if the current user has permission to perform an action
 * on an entity type
 *
 * @param entityType - The entity type to check permissions for
 * @param action - The action to check (create, read, update, delete)
 * @returns true if the user has permission, false otherwise
 *
 * @example
 * const canCreateProjects = usePermission('projects', 'create');
 * const canDeleteTasks = usePermission('tasks', 'delete');
 */
export function usePermission(
  entityType: EntityType,
  action: PermissionAction
): boolean {
  const currentUser = useUserStore(state => state.currentUser);
  const roles = useUserStore(state => state.roles);
  const overrides = useUserStore(state => state.permissionOverrides);

  if (!currentUser) {
    return false;
  }

  const permissions = resolvePermissions(
    currentUser,
    entityType,
    undefined,
    overrides,
    roles
  );

  return permissions[action];
}
```

**Acceptance Criteria:**
- [ ] Hook compiles without errors
- [ ] Returns boolean based on permission resolution
- [ ] Can be used in components

---

## Epic 2: User Management UI

### Story 2.1: Port UserInviteForm 🎨

**File to Create:**
- `src/components/users/UserInviteForm.tsx`

**Reference:** `C:\Users\hmmar\GitHub\pv-usermgmt\src\components\users\UserInviteForm.tsx`

**shadcn Components Needed:**
- Card, CardHeader, CardTitle, CardContent (already installed)
- Input, Label (already installed)
- Button (already installed)
- Select (need to install via MCP)

**Key Conversions:**
- CSS Modules → Tailwind classes
- `useApp()` → `useUserStore()`
- `dispatch({ type: 'ADD_USER' })` → `addUser()`

**Acceptance Criteria:**
- [ ] Form renders with all fields (First Name, Last Name, Email, Function, Role)
- [ ] Email validation works (regex pattern)
- [ ] Form validation prevents submission with empty required fields
- [ ] Submitting form adds user to userStore
- [ ] Toast notification shows on success
- [ ] Form clears after successful submission

---

### Story 2.2: Port UserList 🎨

**File to Create:**
- `src/components/users/UserList.tsx`

**Reference:** `C:\Users\hmmar\GitHub\pv-usermgmt\src\components\users\UserList.tsx`

**shadcn Components Needed:**
- Table (already installed)
- Button (already installed)

**Features:**
- Search by name or email
- Sort by columns
- Edit and Delete actions
- Display role name (lookup from roles)
- Display group names (lookup from groups)

**Acceptance Criteria:**
- [ ] Table displays all users from userStore
- [ ] Search filters users in real-time
- [ ] Sort by name/email/role works
- [ ] Delete button removes user and shows confirmation
- [ ] Edit button calls callback to open dialog

---

### Story 2.3: Port UserEditDialog 🎨

**File to Create:**
- `src/components/users/UserEditDialog.tsx`

**Reference:** `C:\Users\hmmar\GitHub\pv-usermgmt\src\components\users\UserEditDialog.tsx`

**shadcn Components Needed:**
- Dialog (already installed)

**Acceptance Criteria:**
- [ ] Dialog opens when Edit clicked
- [ ] Form pre-populates with selected user data
- [ ] Save button updates user in userStore
- [ ] Cancel button closes without saving
- [ ] Dialog closes after successful save

---

### Story 2.4: Create Users Page 🎨

**File to Create:**
- `src/pages/Users.tsx`

**Reference Layout:** `C:\Users\hmmar\GitHub\pv-projectmgmt\src\pages\Projects.tsx`

**Acceptance Criteria:**
- [ ] Page renders with UserInviteForm and UserList
- [ ] Layout matches pv-projectmgmt page patterns
- [ ] Dialog states managed at page level
- [ ] Edit and delete workflows work end-to-end

---

### Story 2.5: Add Navigation 🎨

**Files to Modify:**
- `src/components/layout/Sidebar.tsx`
- `src/App.tsx`

**Changes:**
- Add "Users" nav item to Sidebar
- Add 'users' page type to App.tsx
- Add keyboard shortcut `g+u`

**Acceptance Criteria:**
- [ ] Clicking "Users" in sidebar navigates to Users page
- [ ] Keyboard shortcut `g+u` navigates to Users page
- [ ] Active state highlights Users nav item when on Users page

---

## Epic 3: Group Management UI

*(Similar structure: Stories 3.1-3.7 covering GroupList, GroupForm, GroupMembersDialog, GroupPermissionsDialog, EntitySelector, Groups page, navigation)*

---

## Epic 4: Permissions Viewing UI

*(Stories 4.1-4.4 covering PermissionMatrix, RoleDefaults, Permissions page, navigation)*

---

## Epic 5: Permission Enforcement & User Selectors

### Story 5.5: Add Permission Checks to projectStore 🔒

**File to Modify:**
- `src/stores/projectStore.ts`

**Pattern:**

```typescript
addProject: (project) => {
  // Permission check
  const currentUser = useUserStore.getState().currentUser;
  const roles = useUserStore.getState().roles;
  const overrides = useUserStore.getState().permissionOverrides;

  if (!currentUser) {
    toast.error('You must be logged in to create projects');
    return;
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
    return;
  }

  // Proceed with existing logic...
  set((state) => {
    // ... existing implementation
  });
}
```

**Apply to:**
- `addProject` - check 'create' on 'projects'
- `updateProject` - check 'update' on 'projects'
- `deleteProject` - check 'delete' on 'projects'
- `addTask` - check 'create' on 'tasks'
- `updateTask` - check 'update' on 'tasks'
- `deleteTask` - check 'delete' on 'tasks'
- `addComment` - check 'create' on 'comments'

**Acceptance Criteria:**
- [ ] Viewer user cannot create projects (toast shows)
- [ ] Admin user can create projects
- [ ] User user can create projects
- [ ] Permissions checked for all CRUD operations

---

## Epic 6: Polish & Testing

### Story 6.5: End-to-End Testing 🧪

**Test Scenarios:**

1. **User Management Flow:**
   - [ ] Create user → appears in list
   - [ ] Edit user → changes save
   - [ ] Delete user → removed from groups
   - [ ] Search users → filters correctly

2. **Group Management Flow:**
   - [ ] Create group → appears in list
   - [ ] Add members → bidirectional sync works
   - [ ] Delete group → removed from users

3. **Permission Override Flow:**
   - [ ] Create override → saves to store
   - [ ] Override grants permission → user can perform action
   - [ ] Delete override → permission reverts to role default

4. **Permission Enforcement:**
   - [ ] Set current user to Viewer
   - [ ] Try to create project → blocked with toast
   - [ ] Set current user to Admin
   - [ ] Try to create project → succeeds

5. **User Selectors:**
   - [ ] Project creation shows user selector for owner
   - [ ] Task edit shows user selector for assignee
   - [ ] Selected users save correctly

---

## File Structure Summary

```
pv-projectmgmt/
├── src/
│   ├── lib/
│   │   ├── types/
│   │   │   ├── user.ts           [NEW]
│   │   │   └── permission.ts     [NEW]
│   │   ├── permissions/
│   │   │   └── permissionResolver.ts  [NEW]
│   │   ├── types.ts              [MODIFY - add exports]
│   │   └── initializeStores.ts   [MODIFY - add user seed]
│   ├── stores/
│   │   ├── userStore.ts          [NEW]
│   │   ├── projectStore.ts       [MODIFY - add permission checks]
│   │   └── workflowStore.ts      [MODIFY - add permission checks]
│   ├── hooks/
│   │   └── usePermission.ts      [NEW]
│   ├── data/
│   │   └── seedUserData.ts       [NEW]
│   ├── components/
│   │   ├── users/
│   │   │   ├── UserInviteForm.tsx     [NEW]
│   │   │   ├── UserList.tsx           [NEW]
│   │   │   ├── UserEditDialog.tsx     [NEW]
│   │   │   └── UserSelector.tsx       [NEW]
│   │   ├── groups/
│   │   │   ├── GroupList.tsx          [NEW]
│   │   │   ├── GroupForm.tsx          [NEW]
│   │   │   ├── GroupMembersDialog.tsx [NEW]
│   │   │   └── GroupPermissionsDialog.tsx [NEW]
│   │   ├── permissions/
│   │   │   ├── PermissionMatrix.tsx   [NEW]
│   │   │   ├── RoleDefaults.tsx       [NEW]
│   │   │   └── EntitySelector.tsx     [NEW]
│   │   ├── layout/
│   │   │   └── Sidebar.tsx       [MODIFY - add nav items]
│   │   └── projects/
│   │       └── CreateProjectDialog.tsx [MODIFY - add UserSelector]
│   ├── pages/
│   │   ├── Users.tsx             [NEW]
│   │   ├── Groups.tsx            [NEW]
│   │   └── Permissions.tsx       [NEW]
│   └── App.tsx                   [MODIFY - add routing]
└── IMPLEMENTATION_PLAN_USER_MANAGEMENT.md [THIS FILE]
```

---

## Development Workflow

1. **Per Story:**
   - Implement feature
   - Test manually in browser
   - Verify acceptance criteria
   - Commit with message: `feat(story-X.Y): Description`

2. **Per Epic:**
   - Complete all stories
   - Test epic integration
   - Get user confirmation before proceeding to next epic

3. **Testing:**
   - Manual testing in browser (check localStorage, UI interactions)
   - Console tests for store actions
   - Visual regression for UI components

---

## Dependencies to Install (via shadcn MCP)

- `Select` component (for dropdowns)
- `AlertDialog` component (for confirmations)
- (All other components already installed)

---

## Success Metrics

- ✅ 30+ files created/modified
- ✅ All 6 epics implemented
- ✅ Permission enforcement working
- ✅ User selectors integrated
- ✅ Data persists across refreshes
- ✅ Responsive design
- ✅ No TypeScript errors
- ✅ All acceptance criteria passed
