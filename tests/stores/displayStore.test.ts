import { describe, it, expect, beforeEach } from 'vitest';
import { useDisplayStore } from '@/stores/displayStore';

describe('displayStore', () => {
  beforeEach(() => {
    // Reset to default settings
    useDisplayStore.setState({
      settings: {
        view: 'list',
        list: {
          grouping: 'none',
          ordering: { field: 'updatedAt', direction: 'desc' },
          showEmptyGroups: false,
          properties: ['stage', 'priority', 'owner', 'location', 'updated', 'tasks']
        },
        board: {
          columns: 'stage',
          rows: 'none',
          ordering: { field: 'priority', direction: 'asc' },
          showEmptyColumns: true,
          properties: ['priority', 'owner', 'tasks']
        }
      }
    });
  });

  describe('setView', () => {
    it('should switch to board view', () => {
      useDisplayStore.getState().setView('board');

      const { settings } = useDisplayStore.getState();
      expect(settings.view).toBe('board');
    });

    it('should switch to list view', () => {
      useDisplayStore.getState().setView('board');
      useDisplayStore.getState().setView('list');

      const { settings } = useDisplayStore.getState();
      expect(settings.view).toBe('list');
    });
  });

  describe('updateListSettings', () => {
    it('should update list grouping', () => {
      useDisplayStore.getState().updateListSettings({ grouping: 'stage' });

      const { settings } = useDisplayStore.getState();
      expect(settings.list.grouping).toBe('stage');
    });

    it('should update list ordering', () => {
      useDisplayStore.getState().updateListSettings({
        ordering: { field: 'name', direction: 'asc' }
      });

      const { settings } = useDisplayStore.getState();
      expect(settings.list.ordering.field).toBe('name');
      expect(settings.list.ordering.direction).toBe('asc');
    });

    it('should update showEmptyGroups flag', () => {
      useDisplayStore.getState().updateListSettings({ showEmptyGroups: true });

      const { settings } = useDisplayStore.getState();
      expect(settings.list.showEmptyGroups).toBe(true);
    });

    it('should update multiple list settings at once', () => {
      useDisplayStore.getState().updateListSettings({
        grouping: 'priority',
        showEmptyGroups: true,
        ordering: { field: 'priority', direction: 'asc' }
      });

      const { settings } = useDisplayStore.getState();
      expect(settings.list.grouping).toBe('priority');
      expect(settings.list.showEmptyGroups).toBe(true);
      expect(settings.list.ordering.field).toBe('priority');
    });
  });

  describe('updateBoardSettings', () => {
    it('should update board columns', () => {
      useDisplayStore.getState().updateBoardSettings({ columns: 'priority' });

      const { settings } = useDisplayStore.getState();
      expect(settings.board.columns).toBe('priority');
    });

    it('should update board rows', () => {
      useDisplayStore.getState().updateBoardSettings({ rows: 'priority' });

      const { settings } = useDisplayStore.getState();
      expect(settings.board.rows).toBe('priority');
    });

    it('should update showEmptyColumns flag', () => {
      useDisplayStore.getState().updateBoardSettings({ showEmptyColumns: false });

      const { settings } = useDisplayStore.getState();
      expect(settings.board.showEmptyColumns).toBe(false);
    });

    it('should update board ordering', () => {
      useDisplayStore.getState().updateBoardSettings({
        ordering: { field: 'name', direction: 'desc' }
      });

      const { settings } = useDisplayStore.getState();
      expect(settings.board.ordering.field).toBe('name');
      expect(settings.board.ordering.direction).toBe('desc');
    });
  });

  describe('toggleProperty', () => {
    it('should remove property from list when already present', () => {
      const { settings: initial } = useDisplayStore.getState();
      expect(initial.list.properties).toContain('priority');

      useDisplayStore.getState().toggleProperty('priority');

      const { settings } = useDisplayStore.getState();
      expect(settings.list.properties).not.toContain('priority');
    });

    it('should add property to list when not present', () => {
      const { settings: initial } = useDisplayStore.getState();
      expect(initial.list.properties).not.toContain('customField');

      useDisplayStore.getState().toggleProperty('customField');

      const { settings } = useDisplayStore.getState();
      expect(settings.list.properties).toContain('customField');
    });

    it('should toggle property for board view when in board mode', () => {
      useDisplayStore.getState().setView('board');

      const { settings: initial } = useDisplayStore.getState();
      expect(initial.board.properties).toContain('priority');

      useDisplayStore.getState().toggleProperty('priority');

      const { settings } = useDisplayStore.getState();
      expect(settings.board.properties).not.toContain('priority');
    });

    it('should toggle property for list view when in list mode', () => {
      const { settings: initial } = useDisplayStore.getState();
      expect(initial.list.properties).toContain('stage');

      useDisplayStore.getState().toggleProperty('stage');

      const { settings } = useDisplayStore.getState();
      expect(settings.list.properties).not.toContain('stage');
    });
  });

  describe('persistence', () => {
    it('should maintain default settings structure', () => {
      const { settings } = useDisplayStore.getState();

      expect(settings.view).toBeDefined();
      expect(settings.list).toBeDefined();
      expect(settings.board).toBeDefined();
      expect(settings.list.grouping).toBeDefined();
      expect(settings.list.ordering).toBeDefined();
      expect(settings.list.properties).toBeInstanceOf(Array);
      expect(settings.board.columns).toBeDefined();
      expect(settings.board.rows).toBeDefined();
      expect(settings.board.properties).toBeInstanceOf(Array);
    });
  });
});
