import { create } from 'zustand';
import { db } from '@/lib/db';
import type { AiLogEntry, AiLogFilters } from '@/lib/types/aiLog';

interface AiLogState {
  filters: AiLogFilters;
  setFilters: (filters: Partial<AiLogFilters>) => void;
  clearFilters: () => void;

  entries: AiLogEntry[];
  totalCount: number;
  isLoading: boolean;

  pageSize: number;
  currentPage: number;
  setPage: (page: number) => void;

  loadEntries: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const defaultFilters: AiLogFilters = {};

export const useAiLogStore = create<AiLogState>()((set, get) => ({
  filters: defaultFilters,
  entries: [],
  totalCount: 0,
  isLoading: false,
  pageSize: 50,
  currentPage: 1,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      currentPage: 1,
    }));
    get().loadEntries();
  },

  clearFilters: () => {
    set({ filters: defaultFilters, currentPage: 1 });
    get().loadEntries();
  },

  setPage: (page) => {
    set({ currentPage: page });
    get().loadEntries();
  },

  loadEntries: async () => {
    set({ isLoading: true });

    const { filters, pageSize, currentPage } = get();
    const offset = (currentPage - 1) * pageSize;

    try {
      let allEntries = await db.aiLogs.orderBy('timestamp').reverse().toArray();

      if (filters.feature) {
        allEntries = allEntries.filter((e) => e.feature === filters.feature);
      }
      if (filters.status) {
        allEntries = allEntries.filter((e) => e.status === filters.status);
      }
      if (filters.dateFrom) {
        allEntries = allEntries.filter((e) => e.timestamp >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        allEntries = allEntries.filter((e) => e.timestamp < endDate.toISOString());
      }

      const totalCount = allEntries.length;
      const entries = allEntries.slice(offset, offset + pageSize);

      set({ entries, totalCount, isLoading: false });
    } catch (error) {
      console.error('Failed to load AI log entries:', error);
      set({ entries: [], totalCount: 0, isLoading: false });
    }
  },

  clearAll: async () => {
    try {
      await db.aiLogs.clear();
      set({ entries: [], totalCount: 0, currentPage: 1 });
    } catch (error) {
      console.error('Failed to clear AI logs:', error);
    }
  },
}));
