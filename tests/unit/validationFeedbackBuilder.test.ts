/**
 * Validation Feedback Builder Unit Tests
 */

import { describe, expect, it } from 'vitest';
import {
  buildValidationFeedback,
  buildRetryPrompt,
} from '../../services/validationFeedbackBuilder';

const mockGST = {
  name: 'phone_stand',
  description: 'A simple phone stand',
  components: [
    {
      name: 'base',
      primitive: 'cube' as const,
      parameters: { width: 80, depth: 60, height: 5 },
      position: { x: 0, y: 0, z: 0 },
    },
  ],
};

describe('Validation Feedback Builder', () => {
  describe('buildValidationFeedback', () => {
    it('builds feedback for first attempt', () => {
      const feedback = buildValidationFeedback(
        ['syntax error at line 10'],
        1,
        'cube([10,10,10);',
        mockGST as any,
        1,
        3
      );
      expect(feedback.attempt).toBe(1);
      expect(feedback.maxAttempts).toBe(3);
      expect(feedback.categorizedErrors).toHaveLength(1);
      expect(feedback.promptGuidance).toContain('Attempt 1/3');
      expect(feedback.promptGuidance).toContain('FIRST RETRY');
    });

    it('includes annotated code on second attempt', () => {
      const feedback = buildValidationFeedback(
        ['syntax error at line 1'],
        1,
        'cube([10,10,10);',
        mockGST as any,
        2,
        3
      );
      expect(feedback.promptGuidance).toContain('FAILED CODE');
      expect(feedback.promptGuidance).toContain('SECOND RETRY');
    });

    it('uses emergency mode on third attempt', () => {
      const feedback = buildValidationFeedback(
        ['syntax error'],
        1,
        'bad code',
        mockGST as any,
        3,
        3
      );
      expect(feedback.promptGuidance).toContain('EMERGENCY MODE');
    });

    it('includes manifold guard for manifold errors', () => {
      const feedback = buildValidationFeedback(
        ['not a valid 2-manifold'],
        1,
        'difference() { cube(10); sphere(5); }',
        mockGST as any,
        1,
        3
      );
      expect(feedback.promptGuidance).toContain('MANIFOLD GUARD');
      expect(feedback.promptGuidance).toContain('epsilon');
    });

    it('always includes critical OpenSCAD rules', () => {
      const feedback = buildValidationFeedback(['syntax error'], 1, 'bad', mockGST as any, 1, 3);
      expect(feedback.promptGuidance).toContain('CRITICAL OPENSCAD RULES');
      expect(feedback.promptGuidance).toContain('IMMUTABLE');
    });

    it('generates error summary', () => {
      const feedback = buildValidationFeedback(
        ['syntax error', 'SCENE IS EMPTY'],
        1,
        'code',
        mockGST as any,
        1,
        3
      );
      expect(feedback.errorSummary).toContain('syntax');
      expect(feedback.errorSummary).toContain('empty_geometry');
    });
  });

  describe('buildRetryPrompt', () => {
    it('includes GST in retry prompt', () => {
      const feedback = buildValidationFeedback(
        ['syntax error'],
        1,
        'bad code',
        mockGST as any,
        1,
        3
      );
      const prompt = buildRetryPrompt(feedback);
      expect(prompt).toContain('phone_stand');
      expect(prompt).toContain('ORIGINAL DESIGN SPECIFICATION');
      expect(prompt).toContain('CORRECTED OpenSCAD code');
    });
  });
});
