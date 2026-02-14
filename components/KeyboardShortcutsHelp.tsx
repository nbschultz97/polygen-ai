/**
 * Keyboard Shortcuts Help Overlay
 *
 * Displays available keyboard shortcuts in a modal overlay.
 * Triggered by Ctrl+/ or the help button.
 */

import { Keyboard, X } from 'lucide-react';
import React from 'react';
import { SHORTCUT_LIST } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? '⌘' : 'Ctrl';

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-700 transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="px-5 py-4 space-y-3">
          {SHORTCUT_LIST.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{description}</span>
              <div className="flex items-center gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-600 rounded text-gray-200 min-w-[28px] text-center"
                  >
                    {key === 'Ctrl' ? modKey : key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-700 bg-zinc-800/50">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1 py-0.5 text-xs bg-zinc-700 border border-zinc-600 rounded">{modKey}</kbd>{' '}
            <kbd className="px-1 py-0.5 text-xs bg-zinc-700 border border-zinc-600 rounded">/</kbd>{' '}
            to toggle this help
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
