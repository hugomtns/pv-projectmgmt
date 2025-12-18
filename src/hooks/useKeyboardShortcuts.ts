import { useEffect, useRef, useCallback } from 'react';

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: ShortcutHandler;
  preventDefault?: boolean;
}

interface SequenceShortcut {
  sequence: string[];
  handler: ShortcutHandler;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts?: Shortcut[];
  sequenceShortcuts?: SequenceShortcut[];
  enabled?: boolean;
}

const SEQUENCE_TIMEOUT = 1000; // ms

export function useKeyboardShortcuts({
  shortcuts = [],
  sequenceShortcuts = [],
  enabled = true,
}: UseKeyboardShortcutsOptions = {}) {
  const sequenceRef = useRef<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearSequence = useCallback(() => {
    sequenceRef.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exception: allow "/" to focus search even when not in input
        if (event.key === '/' && !target.matches('input[type="search"], input[type="text"]')) {
          // Allow this to proceed
        } else {
          return;
        }
      }

      // Check single-key shortcuts first
      for (const shortcut of shortcuts) {
        const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatches = shortcut.metaKey ? event.metaKey : !event.metaKey;
        const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.altKey ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler(event);
          return;
        }
      }

      // Check sequence shortcuts
      if (sequenceShortcuts.length > 0) {
        sequenceRef.current.push(event.key.toLowerCase());

        // Check if current sequence matches any shortcut
        for (const seqShortcut of sequenceShortcuts) {
          if (sequenceRef.current.length === seqShortcut.sequence.length) {
            const matches = seqShortcut.sequence.every(
              (key, index) => key.toLowerCase() === sequenceRef.current[index]
            );

            if (matches) {
              if (seqShortcut.preventDefault !== false) {
                event.preventDefault();
              }
              seqShortcut.handler(event);
              clearSequence();
              return;
            }
          }
        }

        // Reset timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(clearSequence, SEQUENCE_TIMEOUT);

        // Clear sequence if it's too long
        const maxSequenceLength = Math.max(
          ...sequenceShortcuts.map((s) => s.sequence.length),
          0
        );
        if (sequenceRef.current.length > maxSequenceLength) {
          clearSequence();
        }
      }
    },
    [enabled, shortcuts, sequenceShortcuts, clearSequence]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearSequence();
    };
  }, [enabled, handleKeyDown, clearSequence]);

  return { clearSequence };
}
