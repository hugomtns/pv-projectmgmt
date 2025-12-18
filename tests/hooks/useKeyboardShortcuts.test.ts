import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should call handler when shortcut key is pressed', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'n', handler }],
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'n' });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should respect modifier keys', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'k', ctrlKey: true, handler }],
      })
    );

    // Press 'k' without ctrl - should not trigger
    const event1 = new KeyboardEvent('keydown', { key: 'k' });
    window.dispatchEvent(event1);
    expect(handler).not.toHaveBeenCalled();

    // Press 'k' with ctrl - should trigger
    const event2 = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(event2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle sequence shortcuts', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        sequenceShortcuts: [{ sequence: ['g', 'p'], handler }],
      })
    );

    // Press 'g'
    const event1 = new KeyboardEvent('keydown', { key: 'g' });
    window.dispatchEvent(event1);
    expect(handler).not.toHaveBeenCalled();

    // Press 'p'
    const event2 = new KeyboardEvent('keydown', { key: 'p' });
    window.dispatchEvent(event2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should reset sequence after timeout', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        sequenceShortcuts: [{ sequence: ['g', 'p'], handler }],
      })
    );

    // Press 'g'
    const event1 = new KeyboardEvent('keydown', { key: 'g' });
    window.dispatchEvent(event1);

    // Wait for timeout
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    // Press 'p' - should not trigger because sequence was reset
    const event2 = new KeyboardEvent('keydown', { key: 'p' });
    window.dispatchEvent(event2);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should not trigger when typing in input fields', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'n', handler }],
      })
    );

    // Create and focus an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
    input.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should respect enabled flag', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'n', handler }],
          enabled,
        }),
      { initialProps: { enabled: true } }
    );

    // Should trigger when enabled
    const event1 = new KeyboardEvent('keydown', { key: 'n' });
    window.dispatchEvent(event1);
    expect(handler).toHaveBeenCalledTimes(1);

    // Disable and test again
    rerender({ enabled: false });
    const event2 = new KeyboardEvent('keydown', { key: 'n' });
    window.dispatchEvent(event2);
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
  });

  it('should prevent default when preventDefault is true', () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'n', handler, preventDefault: true }],
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'n' });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'n', handler }],
      })
    );

    unmount();

    const event = new KeyboardEvent('keydown', { key: 'n' });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });
});
