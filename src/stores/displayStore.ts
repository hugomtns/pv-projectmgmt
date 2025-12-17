import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DisplaySettings, ViewType, ListDisplaySettings, BoardDisplaySettings } from '@/lib/types';

interface DisplayState {
  settings: DisplaySettings;
  // Actions
  setView: (view: ViewType) => void;
  updateListSettings: (updates: Partial<ListDisplaySettings>) => void;
  updateBoardSettings: (updates: Partial<BoardDisplaySettings>) => void;
  toggleProperty: (property: string) => void;
}

const defaultSettings: DisplaySettings = {
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
};

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      setView: (view) => set((state) => ({
        settings: { ...state.settings, view }
      })),

      updateListSettings: (updates) => set((state) => ({
        settings: {
          ...state.settings,
          list: { ...state.settings.list, ...updates }
        }
      })),

      updateBoardSettings: (updates) => set((state) => ({
        settings: {
          ...state.settings,
          board: { ...state.settings.board, ...updates }
        }
      })),

      toggleProperty: (property) => set((state) => {
        const currentView = state.settings.view;
        const currentProperties = state.settings[currentView].properties;
        const hasProperty = currentProperties.includes(property);

        return {
          settings: {
            ...state.settings,
            [currentView]: {
              ...state.settings[currentView],
              properties: hasProperty
                ? currentProperties.filter(p => p !== property)
                : [...currentProperties, property]
            }
          }
        };
      })
    }),
    { name: 'display-storage' }
  )
);
