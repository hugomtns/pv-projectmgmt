import { create } from 'zustand';
import type { Filters, Priority } from '@/lib/types';

interface FilterState {
  filters: Filters;
  // Actions
  setStageFilter: (stages: string[]) => void;
  setPriorityFilter: (priorities: Priority[]) => void;
  setOwnerFilter: (owner: string) => void;
  setSearch: (search: string) => void;
  clearFilters: () => void;
}

const defaultFilters: Filters = {
  stages: [],
  priorities: [],
  owner: '',
  search: ''
};

export const useFilterStore = create<FilterState>()((set) => ({
  filters: defaultFilters,

  setStageFilter: (stages) => set((state) => ({
    filters: { ...state.filters, stages }
  })),

  setPriorityFilter: (priorities) => set((state) => ({
    filters: { ...state.filters, priorities }
  })),

  setOwnerFilter: (owner) => set((state) => ({
    filters: { ...state.filters, owner }
  })),

  setSearch: (search) => set((state) => ({
    filters: { ...state.filters, search }
  })),

  clearFilters: () => set({ filters: defaultFilters })
}));
