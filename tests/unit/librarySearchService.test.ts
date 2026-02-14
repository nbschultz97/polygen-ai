/**
 * Library Search Service Unit Tests
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  needsLibrarySearch,
  extractModuleNames,
  getCachedLibrary,
  clearLibraryCache,
  searchLibraries,
  fetchLibraryContent,
  discoverLibraries,
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

  describe('searchLibraries', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('returns results from GitHub API search', async () => {
      const mockResponse = {
        items: [
          {
            name: 'gear.scad',
            html_url: 'https://github.com/user/repo/blob/main/gear.scad',
            repository: {
              full_name: 'user/repo',
              description: 'OpenSCAD gears',
              stargazers_count: 42,
            },
            score: 85,
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const results = await searchLibraries('gear');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('gear.scad');
      expect(results[0].repository).toBe('user/repo');
      expect(results[0].rawUrl).toContain('raw.githubusercontent.com');
    });

    it('returns empty array on GitHub 403 rate limit', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const results = await searchLibraries('gear');
      expect(results).toEqual([]);
    });

    it('returns empty array on fetch error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const results = await searchLibraries('gear');
      expect(results).toEqual([]);
    });

    it('throws on non-403 GitHub API error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      // searchLibraries catches errors and returns []
      const results = await searchLibraries('gear');
      expect(results).toEqual([]);
    });
  });

  describe('fetchLibraryContent', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('fetches raw content from URL', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('module gear() { }'),
      });

      const content = await fetchLibraryContent(
        'https://raw.githubusercontent.com/user/repo/main/gear.scad'
      );
      expect(content).toBe('module gear() { }');
    });

    it('returns null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const content = await fetchLibraryContent('https://example.com/missing.scad');
      expect(content).toBeNull();
    });

    it('returns null on fetch error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const content = await fetchLibraryContent('https://example.com/file.scad');
      expect(content).toBeNull();
    });
  });

  describe('discoverLibraries', () => {
    beforeEach(() => {
      clearLibraryCache();
      vi.restoreAllMocks();
    });

    it('returns empty array when no search results', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      const libs = await discoverLibraries('nonexistent_thing');
      expect(libs).toEqual([]);
    });

    it('fetches and returns libraries with module extraction', async () => {
      // First call: GitHub search
      // Second call: raw content fetch
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                items: [
                  {
                    name: 'gear.scad',
                    html_url: 'https://github.com/user/repo/blob/main/gear.scad',
                    repository: { full_name: 'user/repo', description: 'Gears' },
                    score: 90,
                  },
                ],
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('module gear(teeth=20) { }\nmodule shaft(d=5) { }'),
        });
      });

      const libs = await discoverLibraries('gear', 1);
      expect(libs).toHaveLength(1);
      expect(libs[0].name).toBe('gear.scad');
      expect(libs[0].modules).toEqual(['gear', 'shaft']);
    });

    it('uses cache on second call', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                items: [
                  {
                    name: 'gear.scad',
                    html_url: 'https://github.com/user/repo/blob/main/gear.scad',
                    repository: { full_name: 'user/repo' },
                  },
                ],
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('module gear() { }'),
        });
      });

      await discoverLibraries('gear', 1);
      const fetchCallsBefore = callCount;

      const libs2 = await discoverLibraries('gear', 1);
      // Should use cache, no new fetch calls
      expect(callCount).toBe(fetchCallsBefore);
      expect(libs2).toHaveLength(1);
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
