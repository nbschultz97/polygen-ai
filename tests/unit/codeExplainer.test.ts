/**
 * Code Explainer Service Unit Tests
 */

import { describe, expect, it } from 'vitest';
import {
  explainCode,
  getConceptExplanation,
  getAllConceptExplanations,
} from '../../services/codeExplainer';

describe('Code Explainer Service', () => {
  describe('explainCode', () => {
    it('detects primitive concepts', () => {
      const code = 'cube([10, 10, 10]);\ncylinder(h=20, d=5);';
      const result = explainCode(code);
      expect(result.conceptsUsed).toContain('cube');
      expect(result.conceptsUsed).toContain('cylinder');
    });

    it('detects boolean operation concepts', () => {
      const code = 'difference() { cube([10,10,10]); cylinder(h=12, d=3); }';
      const result = explainCode(code);
      expect(result.conceptsUsed).toContain('difference');
    });

    it('detects transform concepts', () => {
      const code = 'translate([5, 0, 0]) rotate([0, 0, 45]) cube([10, 10, 10]);';
      const result = explainCode(code);
      expect(result.conceptsUsed).toContain('translate');
      expect(result.conceptsUsed).toContain('rotate');
    });

    it('adds header when concepts detected', () => {
      const code = 'cube([10, 10, 10]);';
      const result = explainCode(code, true);
      expect(result.enhancedCode).toContain('OPENSCAD LEARNING GUIDE');
    });

    it('skips header when disabled', () => {
      const code = 'cube([10, 10, 10]);';
      const result = explainCode(code, false);
      expect(result.enhancedCode).not.toContain('OPENSCAD LEARNING GUIDE');
    });

    it('generates transform order tip', () => {
      const code = 'translate([5, 0, 0]) rotate([0, 0, 45]) cube([10, 10, 10]);';
      const result = explainCode(code);
      expect(result.tips.some(t => t.includes('Transform order'))).toBe(true);
    });

    it('generates epsilon tip for boolean ops without eps', () => {
      const code = 'difference() { cube([10,10,10]); cylinder(h=12, d=3); }';
      const result = explainCode(code);
      expect(result.tips.some(t => t.includes('eps'))).toBe(true);
    });

    it('does not generate epsilon tip when eps is present', () => {
      const code = 'eps = 0.01;\ndifference() { cube([10,10,10]); translate([0,0,-eps]) cylinder(h=12+eps*2, d=3); }';
      const result = explainCode(code);
      expect(result.tips.some(t => t.includes('eps = 0.01'))).toBe(false);
    });

    it('generates $fn tip for cylinders without $fn', () => {
      const code = 'cylinder(h=20, d=10);';
      const result = explainCode(code);
      expect(result.tips.some(t => t.includes('$fn'))).toBe(true);
    });

    it('limits tips to 4', () => {
      const code = 'translate([0,0,0]) rotate([0,0,0]) cube([10,10,10]); cylinder(h=5, d=3); difference() { sphere(10); cube(5); }';
      const result = explainCode(code);
      expect(result.tips.length).toBeLessThanOrEqual(4);
    });

    it('adds inline comments for $fn values', () => {
      const code = '$fn = 64;';
      const result = explainCode(code, false);
      expect(result.enhancedCode).toContain('Smooth curves');
    });

    it('annotates difference children', () => {
      const code = 'difference() {\n  cube([10,10,10]);\n  cylinder(h=12, d=3);\n}';
      const result = explainCode(code, false);
      expect(result.enhancedCode).toContain('Base shape');
    });
  });

  describe('getConceptExplanation', () => {
    it('returns explanation for known concept', () => {
      expect(getConceptExplanation('cube')).toContain('rectangular box');
    });

    it('returns undefined for unknown concept', () => {
      expect(getConceptExplanation('nonexistent')).toBeUndefined();
    });

    it('is case-insensitive', () => {
      expect(getConceptExplanation('CUBE')).toContain('rectangular box');
    });
  });

  describe('getAllConceptExplanations', () => {
    it('returns all concepts', () => {
      const all = getAllConceptExplanations();
      expect(Object.keys(all).length).toBeGreaterThan(10);
      expect(all).toHaveProperty('cube');
      expect(all).toHaveProperty('difference');
      expect(all).toHaveProperty('translate');
    });

    it('returns a copy (not mutable reference)', () => {
      const all = getAllConceptExplanations();
      all['cube'] = 'modified';
      expect(getConceptExplanation('cube')).not.toBe('modified');
    });
  });
});
