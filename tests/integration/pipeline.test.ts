/**
 * Integration Tests for PolyGen AI Pipeline
 * Tests the full code generation and validation workflow
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { validateScadCode } from '../../services/scadValidation';
import { categorizeErrors, getErrorSummary } from '../../services/errorCategorizer';
import { findRelevantPitfalls, formatPitfallGuidance } from '../../services/openscadPitfalls';
import { buildValidationFeedback } from '../../services/validationFeedbackBuilder';
import { explainCode } from '../../services/codeExplainer';

// Sample GST for testing
const sampleGST = {
  version: '1.0' as const,
  name: 'test_box_with_hole',
  description: 'A simple box with a screw hole',
  globalParameters: [
    { name: 'box_size', value: 30, unit: 'mm' as const }
  ],
  root: {
    id: 'main',
    name: 'assembly',
    type: 'difference',
    children: [
      {
        id: 'base',
        name: 'box',
        type: 'cuboid',
        parameters: [
          { name: 'width', value: 30, unit: 'mm' as const },
          { name: 'depth', value: 30, unit: 'mm' as const },
          { name: 'height', value: 10, unit: 'mm' as const }
        ]
      },
      {
        id: 'hole1',
        name: 'screw_hole',
        type: 'screw_hole',
        booleanOp: 'subtract' as const,
        parameters: [
          { name: 'diameter', value: 3.4, unit: 'mm' as const },
          { name: 'depth', value: 10, unit: 'mm' as const }
        ]
      }
    ]
  }
};

// Sample valid OpenSCAD code
const validOpenSCAD = `
// Test Box with Hole
// Parameters
box_width = 30;
box_depth = 30;
box_height = 10;
hole_diameter = 3.4;

// Settings
$fn = 64;
eps = 0.01;

// Main geometry
difference() {
    cube([box_width, box_depth, box_height], center=true);
    translate([0, 0, -eps])
        cylinder(h=box_height + eps*2, d=hole_diameter, center=true);
}
`;

// Sample invalid OpenSCAD code (missing variable)
const invalidOpenSCAD = `
// Invalid code - uses undefined variable
cube([width, depth, height]);
`;

// Sample empty geometry code
const emptyGeometryCode = `
// Code that produces empty geometry
eps = 0.01;
difference() {
    cube([10, 10, 10]);
    cube([20, 20, 20]);  // Bigger than base, removes everything
}
`;

describe('Error Categorizer', () => {
  it('should categorize undefined variable errors', () => {
    const errors = ['Unknown variable "width" in line 2'];
    const categorized = categorizeErrors(errors, 1, invalidOpenSCAD);

    expect(categorized.length).toBeGreaterThan(0);
    expect(categorized[0].category).toBe('undefined_var');
    expect(categorized[0].severity).toBe('critical');
    expect(categorized[0].suggestedFix).toContain('width');
  });

  it('should categorize syntax errors', () => {
    const errors = ['Parser error: syntax error in line 5'];
    const categorized = categorizeErrors(errors, 1);

    expect(categorized[0].category).toBe('syntax');
    expect(categorized[0].lineNumber).toBe(5);
  });

  it('should categorize empty geometry errors', () => {
    const errors = ['SCENE IS EMPTY'];
    const categorized = categorizeErrors(errors, 0);

    expect(categorized[0].category).toBe('empty_geometry');
    expect(categorized[0].pitfallReference).toBe('difference-penetration');
  });

  it('should generate error summaries', () => {
    const errors = ['Unknown variable "x"', 'SCENE IS EMPTY'];
    const categorized = categorizeErrors(errors, 1);
    const summary = getErrorSummary(categorized);

    expect(summary).toContain('undefined_var');
    expect(summary).toContain('empty_geometry');
  });
});

describe('OpenSCAD Pitfalls', () => {
  it('should find relevant pitfalls for undefined variable errors', () => {
    const errors = [{ category: 'undefined_var' as const, rawMessage: 'Unknown variable "width"' }];
    const pitfalls = findRelevantPitfalls(errors);

    expect(pitfalls.length).toBeGreaterThan(0);
    expect(pitfalls.some(p => p.id === 'undefined-variable')).toBe(true);
  });

  it('should find pitfalls for empty geometry errors', () => {
    const errors = [{ category: 'empty_geometry' as const, rawMessage: 'SCENE IS EMPTY' }];
    const pitfalls = findRelevantPitfalls(errors);

    expect(pitfalls.some(p => p.id === 'difference-penetration')).toBe(true);
  });

  it('should format pitfall guidance', () => {
    const errors = [{ category: 'empty_geometry' as const, rawMessage: 'SCENE IS EMPTY' }];
    const pitfalls = findRelevantPitfalls(errors);
    const guidance = formatPitfallGuidance(pitfalls, true);

    expect(guidance).toContain('OPENSCAD PITFALLS');
    expect(guidance).toContain('BAD:');
    expect(guidance).toContain('GOOD:');
  });
});

describe('Validation Feedback Builder', () => {
  it('should build comprehensive feedback for retry attempts', () => {
    const errors = ['Unknown variable "width"'];
    const feedback = buildValidationFeedback(
      errors,
      1,
      invalidOpenSCAD,
      sampleGST,
      1,
      3
    );

    expect(feedback.attempt).toBe(1);
    expect(feedback.maxAttempts).toBe(3);
    expect(feedback.categorizedErrors.length).toBeGreaterThan(0);
    expect(feedback.promptGuidance).toContain('VALIDATION FAILED');
    expect(feedback.promptGuidance).toContain('CRITICAL OPENSCAD RULES');
  });

  it('should include code annotations on second attempt', () => {
    const errors = ['Unknown variable "width"'];
    const feedback = buildValidationFeedback(
      errors,
      1,
      invalidOpenSCAD,
      sampleGST,
      2,
      3
    );

    expect(feedback.promptGuidance).toContain('FAILED CODE');
    expect(feedback.promptGuidance).toContain('error locations');
  });

  it('should use emergency mode on third attempt', () => {
    const errors = ['Unknown variable "width"'];
    const feedback = buildValidationFeedback(
      errors,
      1,
      invalidOpenSCAD,
      sampleGST,
      3,
      3
    );

    expect(feedback.promptGuidance).toContain('EMERGENCY MODE');
    expect(feedback.promptGuidance).toContain('SIMPLEST possible');
  });
});

describe('Code Explainer', () => {
  it('should detect OpenSCAD concepts', () => {
    const explanation = explainCode(validOpenSCAD, false);

    expect(explanation.conceptsUsed).toContain('cube');
    expect(explanation.conceptsUsed).toContain('cylinder');
    expect(explanation.conceptsUsed).toContain('difference');
    expect(explanation.conceptsUsed).toContain('translate');
  });

  it('should generate educational tips', () => {
    const explanation = explainCode(validOpenSCAD, false);

    // Should have tips about transforms and/or epsilon
    expect(explanation.tips.length).toBeGreaterThan(0);
  });

  it('should add explanatory header when requested', () => {
    const explanation = explainCode(validOpenSCAD, true);

    expect(explanation.enhancedCode).toContain('OPENSCAD LEARNING GUIDE');
    expect(explanation.enhancedCode).toContain('This code uses the following');
  });

  it('should add inline comments', () => {
    const explanation = explainCode(validOpenSCAD, false);

    // Should have comments about base shape or cutting shape
    expect(explanation.enhancedCode).toMatch(/\/\/.*(?:Base|Cutting|kept|subtracted)/i);
  });
});

// Note: These tests require the OpenSCAD WASM to be loaded
// They are marked as skipped for CI environments without WASM
describe.skip('SCAD Validation (requires WASM)', () => {
  it('should validate correct OpenSCAD code', async () => {
    const result = await validateScadCode(validOpenSCAD);

    expect(result.success).toBe(true);
    expect(result.triangleCount).toBeGreaterThan(0);
  });

  it('should detect empty geometry', async () => {
    const result = await validateScadCode(emptyGeometryCode);

    expect(result.success).toBe(false);
    expect(result.error).toContain('EMPTY');
  });

  it('should add pre-validation warnings', async () => {
    const codeWithoutEps = `
difference() {
  cube(10);
  cylinder(h=10, d=5);
}
`;
    const result = await validateScadCode(codeWithoutEps);

    // Should warn about missing epsilon
    expect(result.warnings?.some(w => w.includes('epsilon'))).toBe(true);
  });
});
