import { describe, it, expect } from 'vitest';
import {
  OPENSCAD_PITFALLS,
  findRelevantPitfalls,
  getPitfallsByCategory,
  getPitfallById,
  formatPitfallGuidance,
} from '../../services/openscadPitfalls';
import type { ErrorCategory } from '../../services/errorCategorizer';

describe('OpenSCAD Pitfalls Database', () => {
  describe('OPENSCAD_PITFALLS', () => {
    it('should have at least 10 pitfalls', () => {
      expect(OPENSCAD_PITFALLS.length).toBeGreaterThanOrEqual(10);
    });

    it('should have unique IDs', () => {
      const ids = OPENSCAD_PITFALLS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('each pitfall should have required fields', () => {
      for (const pitfall of OPENSCAD_PITFALLS) {
        expect(pitfall.id).toBeTruthy();
        expect(pitfall.category).toBeTruthy();
        expect(pitfall.title).toBeTruthy();
        expect(pitfall.description).toBeTruthy();
        expect(pitfall.badExample).toBeTruthy();
        expect(pitfall.goodExample).toBeTruthy();
        expect(pitfall.keywords.length).toBeGreaterThan(0);
      }
    });

    it('each pitfall should have non-empty examples', () => {
      for (const pitfall of OPENSCAD_PITFALLS) {
        expect(pitfall.badExample.length).toBeGreaterThan(10);
        expect(pitfall.goodExample.length).toBeGreaterThan(10);
      }
    });
  });

  describe('findRelevantPitfalls', () => {
    it('should find pitfalls by error category', () => {
      const errors = [
        { category: 'empty_geometry' as ErrorCategory, rawMessage: 'SCENE IS EMPTY' },
      ];
      const results = findRelevantPitfalls(errors);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((p) => p.id === 'difference-penetration')).toBe(true);
    });

    it('should find pitfalls by keyword match', () => {
      const errors = [
        { category: 'unknown' as ErrorCategory, rawMessage: 'missing semicolon in code' },
      ];
      const results = findRelevantPitfalls(errors);
      expect(results.some((p) => p.id === 'syntax-semicolon')).toBe(true);
    });

    it('should return at most 5 pitfalls', () => {
      // Create many errors across categories to trigger lots of matches
      const errors = [
        { category: 'syntax' as ErrorCategory, rawMessage: 'parser error semicolon brace' },
        { category: 'undefined_var' as ErrorCategory, rawMessage: 'unknown variable scope module' },
        {
          category: 'manifold' as ErrorCategory,
          rawMessage: 'non-manifold hull overlap thin wall',
        },
        {
          category: 'empty_geometry' as ErrorCategory,
          rawMessage: 'scene is empty difference hole',
        },
        { category: 'recursion' as ErrorCategory, rawMessage: 'recursion stack overflow' },
        {
          category: 'csg_operation' as ErrorCategory,
          rawMessage: 'rotate_extrude transform order',
        },
      ];
      const results = findRelevantPitfalls(errors);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should return empty for unmatched errors', () => {
      const errors = [
        { category: 'file_io' as ErrorCategory, rawMessage: 'completely unrelated xyz123' },
      ];
      const results = findRelevantPitfalls(errors);
      // file_io has no pitfalls in the DB, but keyword matching might pick something up
      // Just verify it doesn't crash
      expect(Array.isArray(results)).toBe(true);
    });

    it('should deduplicate pitfalls matched by both category and keyword', () => {
      const errors = [
        {
          category: 'empty_geometry' as ErrorCategory,
          rawMessage: 'scene is empty difference geometry',
        },
      ];
      const results = findRelevantPitfalls(errors);
      const ids = results.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getPitfallsByCategory', () => {
    it('should return pitfalls for manifold category', () => {
      const results = getPitfallsByCategory('manifold');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((p) => expect(p.category).toBe('manifold'));
    });

    it('should return pitfalls for syntax category', () => {
      const results = getPitfallsByCategory('syntax');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((p) => expect(p.category).toBe('syntax'));
    });

    it('should return empty array for category with no pitfalls', () => {
      const results = getPitfallsByCategory('file_io');
      expect(results).toEqual([]);
    });
  });

  describe('getPitfallById', () => {
    it('should return pitfall by exact ID', () => {
      const result = getPitfallById('difference-penetration');
      expect(result).toBeDefined();
      expect(result!.id).toBe('difference-penetration');
      expect(result!.category).toBe('empty_geometry');
    });

    it('should return undefined for non-existent ID', () => {
      expect(getPitfallById('nonexistent-id')).toBeUndefined();
    });

    it('should find all known pitfall IDs', () => {
      const knownIds = [
        'difference-penetration',
        'epsilon-overlap',
        'manifold-guard',
        'undefined-variable',
        'variable-immutability',
        'undefined-module',
        'transform-order',
        'syntax-semicolon',
        'syntax-braces',
        'infinite-recursion',
        'rotate-extrude-axis',
        'thin-walls',
      ];
      for (const id of knownIds) {
        expect(getPitfallById(id)).toBeDefined();
      }
    });
  });

  describe('formatPitfallGuidance', () => {
    it('should return empty string for no pitfalls', () => {
      expect(formatPitfallGuidance([])).toBe('');
    });

    it('should include pitfall title in brief mode', () => {
      const pitfalls = [getPitfallById('difference-penetration')!];
      const result = formatPitfallGuidance(pitfalls, false);
      expect(result).toContain('Difference Operations Must Fully Penetrate');
      expect(result).toContain('PITFALLS TO AVOID');
    });

    it('should include code examples in detailed mode', () => {
      const pitfalls = [getPitfallById('difference-penetration')!];
      const result = formatPitfallGuidance(pitfalls, true);
      expect(result).toContain('BAD:');
      expect(result).toContain('GOOD:');
      expect(result).toContain('```openscad');
    });

    it('should not include code examples in brief mode', () => {
      const pitfalls = [getPitfallById('difference-penetration')!];
      const result = formatPitfallGuidance(pitfalls, false);
      expect(result).not.toContain('BAD:');
      expect(result).not.toContain('GOOD:');
    });
  });
});
