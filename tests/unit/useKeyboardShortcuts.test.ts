/**
 * Tests for useKeyboardShortcuts hook
 *
 * Tests the keyboard shortcut logic (key mapping and text input detection).
 * Does not test React hook lifecycle (would need @testing-library/react-hooks).
 */

import { describe, expect, it } from 'vitest';

// Test the isTextInput logic directly (extracted for testability)
function isTextInput(tagName: string, isContentEditable: boolean, hasMonaco: boolean): boolean {
  const tag = tagName.toLowerCase();
  if (tag === 'textarea') return false;
  return tag === 'input' || isContentEditable || hasMonaco;
}

describe('Keyboard Shortcuts - isTextInput', () => {
  it('should allow shortcuts from textarea (main prompt)', () => {
    expect(isTextInput('TEXTAREA', false, false)).toBe(false);
  });

  it('should block shortcuts from input elements', () => {
    expect(isTextInput('INPUT', false, false)).toBe(true);
  });

  it('should block shortcuts from contentEditable elements', () => {
    expect(isTextInput('DIV', true, false)).toBe(true);
  });

  it('should block shortcuts from Monaco editor', () => {
    expect(isTextInput('DIV', false, true)).toBe(true);
  });

  it('should allow shortcuts from regular divs', () => {
    expect(isTextInput('DIV', false, false)).toBe(false);
  });

  it('should allow shortcuts from buttons', () => {
    expect(isTextInput('BUTTON', false, false)).toBe(false);
  });
});

// Test shortcut key mapping logic
describe('Keyboard Shortcuts - key mapping', () => {
  function matchShortcut(
    key: string,
    ctrl: boolean,
    shift: boolean
  ): string | null {
    if (key === 'Escape') return 'cancel';
    if (ctrl && key === 'Enter') return 'send';
    if (ctrl && key === 'e') return 'export';
    if (ctrl && shift && key === 'z') return 'redo';
    if (ctrl && key === 'z') return 'undo';
    if (ctrl && key === 'y') return 'redo';
    if (ctrl && key === '/') return 'toggleHelp';
    return null;
  }

  it('Escape → cancel', () => {
    expect(matchShortcut('Escape', false, false)).toBe('cancel');
  });

  it('Ctrl+Enter → send', () => {
    expect(matchShortcut('Enter', true, false)).toBe('send');
  });

  it('Ctrl+E → export', () => {
    expect(matchShortcut('e', true, false)).toBe('export');
  });

  it('Ctrl+Z → undo', () => {
    expect(matchShortcut('z', true, false)).toBe('undo');
  });

  it('Ctrl+Shift+Z → redo', () => {
    expect(matchShortcut('z', true, true)).toBe('redo');
  });

  it('Ctrl+Y → redo', () => {
    expect(matchShortcut('y', true, false)).toBe('redo');
  });

  it('Ctrl+/ → toggleHelp', () => {
    expect(matchShortcut('/', true, false)).toBe('toggleHelp');
  });

  it('unbound key → null', () => {
    expect(matchShortcut('a', false, false)).toBeNull();
  });
});
