import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserGroup, CustomRole, GroupPermissionOverride } from '@/lib/types';
import { resolvePermissions } from '@/lib/permissions/permissionResolver';
import { toast } from 'sonner';

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
      addUser: (user) => {
        const state = useUserStore.getState();

        // Permission check
        if (!state.currentUser) {
          toast.error('You must be logged in to invite users');
          return;
        }

        const permissions = resolvePermissions(
          state.currentUser,
          'user_management',
          undefined,
          state.permissionOverrides,
          state.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to invite users');
          return;
        }

        set((state) => {
          const now = new Date().toISOString();
          const newUser: User = {
            ...user,
            id: crypto.randomUUID(),
            groupIds: user.groupIds || [],
            createdAt: now,
            updatedAt: now,
          };
          return { users: [...state.users, newUser] };
        });
      },

      updateUser: (id, updates) => {
        const state = useUserStore.getState();

        // Permission check
        if (!state.currentUser) {
          toast.error('You must be logged in to update users');
          return;
        }

        const permissions = resolvePermissions(
          state.currentUser,
          'user_management',
          id,
          state.permissionOverrides,
          state.roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update users');
          return;
        }

        set((state) => ({
          users: state.users.map(u =>
            u.id === id
              ? { ...u, ...updates, updatedAt: new Date().toISOString() }
              : u
          )
        }));
      },

      deleteUser: (id) => {
        const state = useUserStore.getState();

        // Permission check
        if (!state.currentUser) {
          toast.error('You must be logged in to delete users');
          return;
        }

        const permissions = resolvePermissions(
          state.currentUser,
          'user_management',
          id,
          state.permissionOverrides,
          state.roles
        );

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete users');
          return;
        }

        set((state) => ({
          users: state.users.filter(u => u.id !== id),
          // CASCADE: Remove user from all groups
          groups: state.groups.map(g => ({
            ...g,
            memberIds: g.memberIds.filter(mid => mid !== id),
            updatedAt: new Date().toISOString()
          })),
          // If deleted user is current user, clear current user
          currentUser: state.currentUser?.id === id ? null : state.currentUser
        }));
      },

      // Group actions
      addGroup: (group) => {
        const state = useUserStore.getState();

        // Permission check
        if (!state.currentUser) {
          toast.error('You must be logged in to create groups');
          return;
        }

        const permissions = resolvePermissions(
          state.currentUser,
          'user_management',
          undefined,
          state.permissionOverrides,
          state.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to create groups');
          return;
        }

        set((state) => {
          const now = new Date().toISOString();
          const newGroup: UserGroup = {
            ...group,
            id: crypto.randomUUID(),
            memberIds: group.memberIds || [],
            createdAt: now,
            updatedAt: now,
          };
          return { groups: [...state.groups, newGroup] };
        });
      },

      updateGroup: (id, updates) => {
        const state = useUserStore.getState();

        // Permission check
        if (!state.currentUser) {
          toast.error('You must be logged in to update groups');
          return;
        }

        const permissions = resolvePermissions(
          state.currentUser,
          'user_management',
          id,
          state.permissionOverrides,
          state.roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update groups');
          return;
        }

        set((state) => ({
          groups: state.groups.map(g =>
            g.id === id
              ? { ...g, ...updates, updatedAt: new Date().toISOString() }
              : g
          )
        }));
      },

      deleteGroup: (id) => {
        const state = useUserStore.getState();

        // Permission check
        if (!state.currentUser) {
          toast.error('You must be logged in to delete groups');
          return;
        }

        const permissions = resolvePermissions(
          state.currentUser,
          'user_management',
          id,
          state.permissionOverrides,
          state.roles
        );

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete groups');
          return;
        }

        set((state) => ({
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
        }));
      },

      // Permission override actions
      addPermissionOverride: (override) => {
        const state = useUserStore.getState();

        // Permission check
        if (!state.currentUser) {
          toast.error('You must be logged in to add permission overrides');
          return;
        }

        const permissions = resolvePermissions(
          state.currentUser,
          'user_management',
          undefined,
          state.permissionOverrides,
          state.roles
        );

        if (!permissions.create) {
          toast.error('Permission denied: You do not have permission to add permission overrides');
          return;
        }

        set((state) => ({
          permissionOverrides: [
            ...state.permissionOverrides,
            { ...override, id: crypto.randomUUID() }
          ]
        }));
      },

      updatePermissionOverride: (id, updates) => {
        const state = useUserStore.getState();

        // Permission check
        if (!state.currentUser) {
          toast.error('You must be logged in to update permission overrides');
          return;
        }

        const permissions = resolvePermissions(
          state.currentUser,
          'user_management',
          id,
          state.permissionOverrides,
          state.roles
        );

        if (!permissions.update) {
          toast.error('Permission denied: You do not have permission to update permission overrides');
          return;
        }

        set((state) => ({
          permissionOverrides: state.permissionOverrides.map(o =>
            o.id === id ? { ...o, ...updates } : o
          )
        }));
      },

      deletePermissionOverride: (id) => {
        const state = useUserStore.getState();

        // Permission check
        if (!state.currentUser) {
          toast.error('You must be logged in to delete permission overrides');
          return;
        }

        const permissions = resolvePermissions(
          state.currentUser,
          'user_management',
          id,
          state.permissionOverrides,
          state.roles
        );

        if (!permissions.delete) {
          toast.error('Permission denied: You do not have permission to delete permission overrides');
          return;
        }

        set((state) => ({
          permissionOverrides: state.permissionOverrides.filter(o => o.id !== id)
        }));
      },

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
