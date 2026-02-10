/**
 * Preferences Service Unit Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadPreferences,
  savePreferences,
  updatePreference,
  addRecentDesign,
  getPreferencesForPrompt,
} from '../../services/preferencesService';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('Preferences Service', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('loadPreferences', () => {
    it('returns defaults when nothing stored', () => {
      const prefs = loadPreferences();
      expect(prefs.printer.nozzle_diameter).toBe(0.4);
      expect(prefs.defaultMaterial).toBe('PLA');
      expect(prefs.enableTeachingMode).toBe(true);
    });

    it('loads stored preferences', () => {
      localStorageMock.setItem('polygen_preferences', JSON.stringify({
        defaultMaterial: 'PETG',
      }));
      const prefs = loadPreferences();
      expect(prefs.defaultMaterial).toBe('PETG');
      // Should merge with defaults
      expect(prefs.printer.nozzle_diameter).toBe(0.4);
    });

    it('handles corrupted storage gracefully', () => {
      localStorageMock.setItem('polygen_preferences', 'not json');
      const prefs = loadPreferences();
      expect(prefs.defaultMaterial).toBe('PLA');
    });
  });

  describe('savePreferences', () => {
    it('saves to localStorage', () => {
      const prefs = loadPreferences();
      prefs.defaultMaterial = 'ABS';
      savePreferences(prefs);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'polygen_preferences',
        expect.stringContaining('ABS')
      );
    });
  });

  describe('updatePreference', () => {
    it('updates a single preference', () => {
      const updated = updatePreference('defaultMaterial', 'TPU');
      expect(updated.defaultMaterial).toBe('TPU');
      // Verify persisted
      const loaded = loadPreferences();
      expect(loaded.defaultMaterial).toBe('TPU');
    });
  });

  describe('addRecentDesign', () => {
    it('adds design to front of list', () => {
      addRecentDesign('phone stand');
      addRecentDesign('gear box');
      const prefs = loadPreferences();
      expect(prefs.recentDesigns[0]).toBe('gear box');
      expect(prefs.recentDesigns[1]).toBe('phone stand');
    });

    it('deduplicates designs', () => {
      addRecentDesign('phone stand');
      addRecentDesign('gear box');
      addRecentDesign('phone stand');
      const prefs = loadPreferences();
      expect(prefs.recentDesigns.filter(d => d === 'phone stand')).toHaveLength(1);
      expect(prefs.recentDesigns[0]).toBe('phone stand');
    });

    it('limits to 10 recent designs', () => {
      for (let i = 0; i < 15; i++) {
        addRecentDesign(`design ${i}`);
      }
      const prefs = loadPreferences();
      expect(prefs.recentDesigns).toHaveLength(10);
    });
  });

  describe('getPreferencesForPrompt', () => {
    it('returns formatted string with printer settings', () => {
      const prompt = getPreferencesForPrompt();
      expect(prompt).toContain('Nozzle: 0.4mm');
      expect(prompt).toContain('Material:');
      expect(prompt).toContain('220x220x250mm');
      expect(prompt).toContain('Loose Fit: 0.4mm');
    });
  });
});
