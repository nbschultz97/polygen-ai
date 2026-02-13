/**
 * Refactoring Agent Unit Tests
 */

import { describe, expect, it } from 'vitest';
import {
  extractModules,
  extractFunctions,
  checkCompatibility,
  stripTopLevelGeometry,
  parseModuleSignature,
  validateAsLibrary,
} from '../../services/refactoringAgent';

describe('Refactoring Agent', () => {
  describe('extractModules', () => {
    it('extracts a simple module', () => {
      const code = 'module box(size=10) {\n  cube(size);\n}';
      const modules = extractModules(code);
      expect(modules).toHaveLength(1);
      expect(modules[0]).toContain('module box');
      expect(modules[0]).toContain('cube(size)');
    });

    it('extracts multiple modules', () => {
      const code = `
module part_a() {
  cube(10);
}

module part_b(h=20) {
  cylinder(h=h, d=5);
}
`;
      const modules = extractModules(code);
      expect(modules).toHaveLength(2);
      expect(modules[0]).toContain('part_a');
      expect(modules[1]).toContain('part_b');
    });

    it('handles nested braces correctly', () => {
      const code = `module complex() {
  difference() {
    union() {
      cube(10);
      sphere(5);
    }
    cylinder(h=12, d=3);
  }
}`;
      const modules = extractModules(code);
      expect(modules).toHaveLength(1);
      expect(modules[0]).toContain('difference()');
      expect(modules[0]).toContain('union()');
      expect(modules[0]).toContain('}');
    });

    it('returns empty array when no modules', () => {
      const code = 'cube(10);\ncylinder(h=20, d=5);';
      expect(extractModules(code)).toHaveLength(0);
    });

    it('preserves preceding comments', () => {
      const code = `// This creates a box
// with rounded corners
module rounded_box(size=10, r=2) {
  minkowski() {
    cube(size - r*2, center=true);
    sphere(r);
  }
}`;
      const modules = extractModules(code);
      expect(modules).toHaveLength(1);
      expect(modules[0]).toContain('This creates a box');
    });
  });

  describe('extractFunctions', () => {
    it('extracts a simple function', () => {
      const code = 'function double(x) = x * 2;';
      const fns = extractFunctions(code);
      expect(fns).toHaveLength(1);
      expect(fns[0]).toContain('function double');
    });

    it('extracts functions with default parameters', () => {
      const code = 'function offset(x, margin=5) = x + margin;';
      const fns = extractFunctions(code);
      expect(fns).toHaveLength(1);
      expect(fns[0]).toContain('margin=5');
    });

    it('extracts multiple functions', () => {
      const code = `
function area(w, h) = w * h;
function volume(w, h, d) = w * h * d;
`;
      const fns = extractFunctions(code);
      expect(fns).toHaveLength(2);
    });

    it('returns empty for no functions', () => {
      expect(extractFunctions('cube(10);')).toHaveLength(0);
    });
  });

  describe('checkCompatibility', () => {
    it('flags include statements', () => {
      const issues = checkCompatibility('include <BOSL2/std.scad>\ncube(10);');
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toContain('include');
    });

    it('flags use statements', () => {
      const issues = checkCompatibility('use <MCAD/gears.scad>\ngear();');
      expect(issues.length).toBeGreaterThan(0);
    });

    it('flags import function', () => {
      const issues = checkCompatibility('import("model.stl");');
      expect(issues.length).toBeGreaterThan(0);
    });

    it('flags surface function', () => {
      const issues = checkCompatibility('surface(file="terrain.dat");');
      expect(issues.length).toBeGreaterThan(0);
    });

    it('returns empty for clean code', () => {
      const code = 'module box(s=10) { cube(s); }\nbox();';
      expect(checkCompatibility(code)).toHaveLength(0);
    });
  });

  describe('stripTopLevelGeometry', () => {
    it('preserves modules and removes top-level geometry', () => {
      const code = `
cube(100);
cylinder(h=50, d=20);

module useful_part(size=10) {
  cube(size);
}

sphere(30);
`;
      const result = stripTopLevelGeometry(code);
      expect(result).toContain('module useful_part');
      expect(result).not.toContain('sphere(30)');
    });

    it('preserves functions', () => {
      const code = `
function calc(x) = x * 2;
cube(10);
`;
      const result = stripTopLevelGeometry(code);
      expect(result).toContain('function calc');
    });

    it('preserves global parameter assignments', () => {
      const code = `
wall_thickness = 2;
height = 50;
cube([wall_thickness, wall_thickness, height]);
`;
      const result = stripTopLevelGeometry(code);
      expect(result).toContain('wall_thickness = 2');
      expect(result).toContain('height = 50');
    });
  });

  describe('parseModuleSignature', () => {
    it('parses module with no parameters', () => {
      const result = parseModuleSignature('module box() { cube(10); }');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('box');
      expect(result!.parameters).toHaveLength(0);
    });

    it('parses module with default parameters', () => {
      const result = parseModuleSignature('module box(size=10, wall=2) { cube(size); }');
      expect(result!.name).toBe('box');
      expect(result!.parameters).toHaveLength(2);
      expect(result!.parameters[0].name).toBe('size');
      expect(result!.parameters[0].defaultValue).toBe('10');
      expect(result!.parameters[0].type).toBe('number');
      expect(result!.parameters[1].name).toBe('wall');
    });

    it('detects vector parameter type', () => {
      const result = parseModuleSignature('module box(dims=[10,20,30]) { cube(dims); }');
      expect(result!.parameters[0].type).toBe('vector');
    });

    it('detects boolean parameter type', () => {
      const result = parseModuleSignature('module box(centered=true) { cube(10, center=centered); }');
      expect(result!.parameters[0].type).toBe('boolean');
      expect(result!.parameters[0].defaultValue).toBe('true');
    });

    it('detects string parameter type', () => {
      const result = parseModuleSignature('module label(text="hello") { text(text); }');
      expect(result!.parameters[0].type).toBe('string');
    });

    it('handles required parameters (no default)', () => {
      const result = parseModuleSignature('module hole(diameter) { cylinder(d=diameter, h=10); }');
      expect(result!.parameters[0].name).toBe('diameter');
      expect(result!.parameters[0].defaultValue).toBe('');
      expect(result!.parameters[0].description).toBe('Required parameter');
    });

    it('returns null for non-module code', () => {
      expect(parseModuleSignature('cube(10);')).toBeNull();
    });
  });

  describe('validateAsLibrary', () => {
    it('validates code with modules', () => {
      const result = validateAsLibrary('module box(s=10) { cube(s); }');
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('rejects code without modules', () => {
      const result = validateAsLibrary('cube(10); cylinder(h=20, d=5);');
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No module definitions found');
    });

    it('rejects code with incompatible patterns', () => {
      const result = validateAsLibrary('include <BOSL2/std.scad>\nmodule x() { cube(10); }');
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('include'))).toBe(true);
    });
  });
});
