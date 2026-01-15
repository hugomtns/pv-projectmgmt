import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StyleMode = 'dark' | 'light' | 'corporate';

interface ThemeState {
  styleMode: StyleMode;
  setStyleMode: (mode: StyleMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      styleMode: 'dark',

      setStyleMode: (mode) => {
        const html = document.documentElement;
        html.classList.remove('dark', 'corporate');

        // Light mode uses :root defaults (no class needed)
        // Dark and corporate modes need their respective classes
        if (mode !== 'light') {
          html.classList.add(mode);
        }

        set({ styleMode: mode });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const html = document.documentElement;
          html.classList.remove('dark', 'corporate');
          if (state.styleMode !== 'light') {
            html.classList.add(state.styleMode);
          }
        }
      }
    }
  )
);

/**
 * Apply stored theme immediately before React renders.
 * Prevents flash of wrong theme on page load.
 */
export function applyStoredTheme() {
  try {
    const stored = localStorage.getItem('theme-storage');
    if (stored) {
      const { state } = JSON.parse(stored);
      const mode: StyleMode = state?.styleMode || 'dark';
      const html = document.documentElement;
      html.classList.remove('dark', 'corporate');
      if (mode !== 'light') {
        html.classList.add(mode);
      }
    } else {
      // Default to dark for new users
      document.documentElement.classList.add('dark');
    }
  } catch {
    // Default to dark on error
    document.documentElement.classList.add('dark');
  }
}
