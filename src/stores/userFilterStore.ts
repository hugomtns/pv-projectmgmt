import { create } from 'zustand';

export interface UserFilters {
  roles: string[];      // Filter by role IDs
  groups: string[];     // Filter by group IDs
  function: string;     // Filter by function (text search)
  search: string;       // Global search (name, email)
}

interface UserFilterState {
  filters: UserFilters;
  // Actions
  setRoleFilter: (roles: string[]) => void;
  setGroupFilter: (groups: string[]) => void;
  setFunctionFilter: (func: string) => void;
  setSearch: (search: string) => void;
  clearFilters: () => void;
}

const defaultFilters: UserFilters = {
  roles: [],
  groups: [],
  function: '',
  search: ''
};

export const useUserFilterStore = create<UserFilterState>()((set) => ({
  filters: defaultFilters,

  setRoleFilter: (roles) => set((state) => ({
    filters: { ...state.filters, roles }
  })),

  setGroupFilter: (groups) => set((state) => ({
    filters: { ...state.filters, groups }
  })),

  setFunctionFilter: (func) => set((state) => ({
    filters: { ...state.filters, function: func }
  })),

  setSearch: (search) => set((state) => ({
    filters: { ...state.filters, search }
  })),

  clearFilters: () => set({ filters: defaultFilters })
}));
