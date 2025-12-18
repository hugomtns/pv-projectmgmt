import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserGroup, CustomRole, GroupPermissionOverride } from '@/lib/types';

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
        })),
        // If deleted user is current user, clear current user
        currentUser: state.currentUser?.id === id ? null : state.currentUser
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
