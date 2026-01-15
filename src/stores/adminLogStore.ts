import { create } from 'zustand';
import { db } from '@/lib/db';
import type { AdminLogEntry, AdminLogFilters } from '@/lib/types/adminLog';

interface AdminLogState {
  // Filter state
  filters: AdminLogFilters;
  setFilters: (filters: Partial<AdminLogFilters>) => void;
  clearFilters: () => void;

  // Query state
  entries: AdminLogEntry[];
  totalCount: number;
  isLoading: boolean;

  // Pagination
  pageSize: number;
  currentPage: number;
  setPage: (page: number) => void;

  // Actions
  loadEntries: () => Promise<void>;
  getFilteredEntries: (limit?: number) => Promise<AdminLogEntry[]>;
}

const defaultFilters: AdminLogFilters = {};

export const useAdminLogStore = create<AdminLogState>()((set, get) => ({
  filters: defaultFilters,
  entries: [],
  totalCount: 0,
  isLoading: false,
  pageSize: 50,
  currentPage: 1,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      currentPage: 1, // Reset to first page on filter change
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
      // Get all entries first, then filter in memory
      // (Dexie compound filtering with orderBy requires careful handling)
      let allEntries = await db.adminLogs.orderBy('timestamp').reverse().toArray();

      // Apply filters
      if (filters.userId) {
        allEntries = allEntries.filter((e) => e.userId === filters.userId);
      }
      if (filters.action) {
        allEntries = allEntries.filter((e) => e.action === filters.action);
      }
      if (filters.entityType) {
        allEntries = allEntries.filter((e) => e.entityType === filters.entityType);
      }
      if (filters.dateFrom) {
        allEntries = allEntries.filter((e) => e.timestamp >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        // Add a day to dateTo to include the entire day
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        allEntries = allEntries.filter((e) => e.timestamp < endDate.toISOString());
      }

      const totalCount = allEntries.length;
      const entries = allEntries.slice(offset, offset + pageSize);

      set({ entries, totalCount, isLoading: false });
    } catch (error) {
      console.error('Failed to load admin log entries:', error);
      set({ entries: [], totalCount: 0, isLoading: false });
    }
  },

  getFilteredEntries: async (limit = 1000) => {
    const { filters } = get();

    try {
      let allEntries = await db.adminLogs.orderBy('timestamp').reverse().toArray();

      // Apply same filters as loadEntries
      if (filters.userId) {
        allEntries = allEntries.filter((e) => e.userId === filters.userId);
      }
      if (filters.action) {
        allEntries = allEntries.filter((e) => e.action === filters.action);
      }
      if (filters.entityType) {
        allEntries = allEntries.filter((e) => e.entityType === filters.entityType);
      }
      if (filters.dateFrom) {
        allEntries = allEntries.filter((e) => e.timestamp >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        allEntries = allEntries.filter((e) => e.timestamp < endDate.toISOString());
      }

      return allEntries.slice(0, limit);
    } catch (error) {
      console.error('Failed to get filtered admin log entries:', error);
      return [];
    }
  },
}));
