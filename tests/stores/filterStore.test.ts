import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '@/stores/filterStore';

describe('filterStore', () => {
  beforeEach(() => {
    // Reset filters before each test
    useFilterStore.getState().clearFilters();
  });

  describe('setStageFilter', () => {
    it('should set stage filter', () => {
      useFilterStore.getState().setStageFilter(['stage-1', 'stage-2']);

      const { filters } = useFilterStore.getState();
      expect(filters.stages).toEqual(['stage-1', 'stage-2']);
    });

    it('should replace existing stage filter', () => {
      useFilterStore.getState().setStageFilter(['stage-1']);
      useFilterStore.getState().setStageFilter(['stage-3', 'stage-4']);

      const { filters } = useFilterStore.getState();
      expect(filters.stages).toEqual(['stage-3', 'stage-4']);
    });

    it('should allow empty stage filter', () => {
      useFilterStore.getState().setStageFilter(['stage-1']);
      useFilterStore.getState().setStageFilter([]);

      const { filters } = useFilterStore.getState();
      expect(filters.stages).toEqual([]);
    });
  });

  describe('setPriorityFilter', () => {
    it('should set priority filter', () => {
      useFilterStore.getState().setPriorityFilter([1, 2]);

      const { filters } = useFilterStore.getState();
      expect(filters.priorities).toEqual([1, 2]);
    });

    it('should replace existing priority filter', () => {
      useFilterStore.getState().setPriorityFilter([1]);
      useFilterStore.getState().setPriorityFilter([3, 4]);

      const { filters } = useFilterStore.getState();
      expect(filters.priorities).toEqual([3, 4]);
    });

    it('should allow all priority values', () => {
      useFilterStore.getState().setPriorityFilter([0, 1, 2, 3, 4]);

      const { filters } = useFilterStore.getState();
      expect(filters.priorities).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('setOwnerFilter', () => {
    it('should set owner filter', () => {
      useFilterStore.getState().setOwnerFilter('John Doe');

      const { filters } = useFilterStore.getState();
      expect(filters.owner).toBe('John Doe');
    });

    it('should replace existing owner filter', () => {
      useFilterStore.getState().setOwnerFilter('John Doe');
      useFilterStore.getState().setOwnerFilter('Jane Smith');

      const { filters } = useFilterStore.getState();
      expect(filters.owner).toBe('Jane Smith');
    });

    it('should allow empty owner filter', () => {
      useFilterStore.getState().setOwnerFilter('John Doe');
      useFilterStore.getState().setOwnerFilter('');

      const { filters } = useFilterStore.getState();
      expect(filters.owner).toBe('');
    });
  });

  describe('setSearch', () => {
    it('should set search filter', () => {
      useFilterStore.getState().setSearch('solar farm');

      const { filters } = useFilterStore.getState();
      expect(filters.search).toBe('solar farm');
    });

    it('should replace existing search filter', () => {
      useFilterStore.getState().setSearch('farm');
      useFilterStore.getState().setSearch('project');

      const { filters } = useFilterStore.getState();
      expect(filters.search).toBe('project');
    });

    it('should allow empty search filter', () => {
      useFilterStore.getState().setSearch('test');
      useFilterStore.getState().setSearch('');

      const { filters } = useFilterStore.getState();
      expect(filters.search).toBe('');
    });
  });

  describe('clearFilters', () => {
    it('should clear all filters', () => {
      useFilterStore.getState().setStageFilter(['stage-1']);
      useFilterStore.getState().setPriorityFilter([1, 2]);
      useFilterStore.getState().setOwnerFilter('John Doe');
      useFilterStore.getState().setSearch('test');

      useFilterStore.getState().clearFilters();

      const { filters } = useFilterStore.getState();
      expect(filters.stages).toEqual([]);
      expect(filters.priorities).toEqual([]);
      expect(filters.owner).toBe('');
      expect(filters.search).toBe('');
    });

    it('should reset to default filters', () => {
      useFilterStore.getState().setStageFilter(['stage-1', 'stage-2']);
      useFilterStore.getState().clearFilters();

      const { filters } = useFilterStore.getState();
      expect(filters).toEqual({
        stages: [],
        priorities: [],
        owner: '',
        search: ''
      });
    });
  });

  describe('multiple filters', () => {
    it('should allow setting multiple filters independently', () => {
      useFilterStore.getState().setStageFilter(['stage-1']);
      useFilterStore.getState().setPriorityFilter([1]);
      useFilterStore.getState().setOwnerFilter('John');
      useFilterStore.getState().setSearch('solar');

      const { filters } = useFilterStore.getState();
      expect(filters.stages).toEqual(['stage-1']);
      expect(filters.priorities).toEqual([1]);
      expect(filters.owner).toBe('John');
      expect(filters.search).toBe('solar');
    });

    it('should not affect other filters when updating one', () => {
      useFilterStore.getState().setStageFilter(['stage-1']);
      useFilterStore.getState().setPriorityFilter([1]);

      useFilterStore.getState().setOwnerFilter('John');

      const { filters } = useFilterStore.getState();
      expect(filters.stages).toEqual(['stage-1']);
      expect(filters.priorities).toEqual([1]);
      expect(filters.owner).toBe('John');
    });
  });
});
