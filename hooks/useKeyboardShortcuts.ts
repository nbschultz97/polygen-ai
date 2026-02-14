/**
 * Global Keyboard Shortcuts Hook
 *
 * Provides app-wide keyboard shortcuts for common actions.
 * Shortcuts are disabled when typing in text inputs (except the main prompt).
 *
 * Shortcuts:
 *   Ctrl+Enter / Cmd+Enter  — Send/generate
 *   Ctrl+E / Cmd+E          — Export STL
 *   Ctrl+Z / Cmd+Z          — Undo
 *   Ctrl+Shift+Z / Cmd+Shift+Z — Redo
 *   Ctrl+Y / Cmd+Y          — Redo (alt)
 *   Escape                   — Cancel generation / close modals
 *   Ctrl+/ / Cmd+/          — Toggle keyboard shortcut help
 */

import { useCallback, useEffect } from 'react';

export interface ShortcutActions {
  onSend?: () => void;
  onExport?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCancel?: () => void;
  onToggleHelp?: () => void;
  /** Whether generation is currently in progress */
  isGenerating?: boolean;
  /** Whether there's an asset to export */
  canExport?: boolean;
  /** Whether undo is available */
  canUndo?: boolean;
  /** Whether redo is available */
  canRedo?: boolean;
}

function isTextInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  // Allow Ctrl shortcuts from textarea (the main prompt)
  if (tag === 'textarea') return false;
  return (
    tag === 'input' ||
    target.isContentEditable ||
    target.closest('.monaco-editor') !== null
  );
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Escape — always works
      if (e.key === 'Escape') {
        actions.onCancel?.();
        return;
      }

      // Don't capture shortcuts when typing in inputs (except textarea)
      if (isTextInput(e.target)) {
        // Still allow Ctrl+Enter from any text input
        if (mod && e.key === 'Enter') {
          e.preventDefault();
          actions.onSend?.();
        }
        return;
      }

      if (mod && e.key === 'Enter') {
        e.preventDefault();
        actions.onSend?.();
      } else if (mod && e.key === 'e') {
        e.preventDefault();
        if (actions.canExport) actions.onExport?.();
      } else if (mod && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (actions.canRedo) actions.onRedo?.();
      } else if (mod && e.key === 'z') {
        e.preventDefault();
        if (actions.canUndo) actions.onUndo?.();
      } else if (mod && e.key === 'y') {
        e.preventDefault();
        if (actions.canRedo) actions.onRedo?.();
      } else if (mod && e.key === '/') {
        e.preventDefault();
        actions.onToggleHelp?.();
      }
    },
    [actions]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/** Shortcut definitions for display in help overlay */
export const SHORTCUT_LIST = [
  { keys: ['Ctrl', 'Enter'], description: 'Send prompt / Generate' },
  { keys: ['Ctrl', 'E'], description: 'Export STL' },
  { keys: ['Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Escape'], description: 'Cancel generation' },
  { keys: ['Ctrl', '/'], description: 'Toggle shortcut help' },
] as const;
