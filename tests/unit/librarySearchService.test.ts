/**
 * Library Search Service Unit Tests
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  needsLibrarySearch,
  extractModuleNames,
  getCachedLibrary,
  clearLibraryCache,
} from '../../services/librarySearchService';

describe('Library Search Service', () => {
  describe('needsLibrarySearch', () => {
    it('returns true for prompts containing complex part keywords', () => {
      expect(needsLibrarySearch('I need a gear for my project')).toBe(true);
      expect(needsLibrarySearch('Create a screw thread')).toBe(true);
      expect(needsLibrarySearch('Make a hinge mechanism')).toBe(true);
      expect(needsLibrarySearch('Design a BEARING housing')).toBe(true);
      expect(needsLibrarySearch('snap fit connector')).toBe(true);
    });

    it('returns false for simple prompts', () => {
      expect(needsLibrarySearch('Make a box')).toBe(false);
      expect(needsLibrarySearch('Create a cylinder')).toBe(false);
      expect(needsLibrarySearch('Design a phone stand')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(needsLibrarySearch('GEAR mechanism')).toBe(true);
      expect(needsLibrarySearch('Helical spring')).toBe(true);
    });

    it('matches multi-word keywords', () => {
      expect(needsLibrarySearch('I need a living hinge')).toBe(true);
      expect(needsLibrarySearch('rack and pinion system')).toBe(true);
      expect(needsLibrarySearch('worm gear drive')).toBe(true);
      expect(needsLibrarySearch('bevel gear set')).toBe(true);
    });
  });

  describe('extractModuleNames', () => {
    it('extracts module names from OpenSCAD code', () => {
      const code = `
module gear(teeth=20, pitch=2) {
  // gear code
}

module shaft(diameter=5, length=20) {
  cylinder(d=diameter, h=length);
}
`;
      const modules = extractModuleNames(code);
      expect(modules).toEqual(['gear', 'shaft']);
    });

    it('returns empty array for code without modules', () => {
      const code = `
cube([10, 10, 10]);
cylinder(d=5, h=20);
`;
      expect(extractModuleNames(code)).toEqual([]);
    });

    it('handles single module', () => {
      const code = `module myPart(size=10) { cube(size); }`;
      expect(extractModuleNames(code)).toEqual(['myPart']);
    });

    it('handles modules with complex parameter lists', () => {
      const code = `
module thread(
  diameter = 6,
  pitch = 1,
  length = 20,
  internal = false
) {
  // thread implementation
}`;
      expect(extractModuleNames(code)).toEqual(['thread']);
    });
  });

  describe('cache management', () => {
    beforeEach(() => {
      clearLibraryCache();
    });

    it('returns null for non-existent cache entries', () => {
      expect(getCachedLibrary('nonexistent')).toBeNull();
    });

    it('clearLibraryCache clears all entries', () => {
      // Cache is internal, but clearLibraryCache should not throw
      clearLibraryCache();
      expect(getCachedLibrary('anything')).toBeNull();
    });
  });
});
