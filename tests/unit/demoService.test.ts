/**
 * Tests for demoService
 * Manages anonymous demo mode with localStorage tracking
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { canDemoGenerate, recordDemoGeneration, hasDemoHistory, resetDemoUsage } from '../../services/demoService';

describe('Demo Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('canDemoGenerate', () => {
    it('should allow generation when no usage recorded', () => {
      const result = canDemoGenerate();
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
      expect(result.limit).toBe(2);
    });

    it('should allow generation after 1 use', () => {
      recordDemoGeneration();
      const result = canDemoGenerate();
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should disallow generation after 2 uses', () => {
      recordDemoGeneration();
      recordDemoGeneration();
      const result = canDemoGenerate();
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('polygen_demo_usage', 'not json');
      const result = canDemoGenerate();
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });
  });

  describe('recordDemoGeneration', () => {
    it('should increment usage count', () => {
      recordDemoGeneration();
      const stored = JSON.parse(localStorage.getItem('polygen_demo_usage')!);
      expect(stored.count).toBe(1);
    });

    it('should preserve createdAt timestamp', () => {
      recordDemoGeneration();
      const first = JSON.parse(localStorage.getItem('polygen_demo_usage')!);
      recordDemoGeneration();
      const second = JSON.parse(localStorage.getItem('polygen_demo_usage')!);
      expect(second.count).toBe(2);
      expect(second.createdAt).toBe(first.createdAt);
    });
  });

  describe('hasDemoHistory', () => {
    it('should return false when no usage', () => {
      expect(hasDemoHistory()).toBe(false);
    });

    it('should return true after a generation', () => {
      recordDemoGeneration();
      expect(hasDemoHistory()).toBe(true);
    });
  });

  describe('resetDemoUsage', () => {
    it('should clear usage data', () => {
      recordDemoGeneration();
      recordDemoGeneration();
      resetDemoUsage();
      const result = canDemoGenerate();
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should make hasDemoHistory return false', () => {
      recordDemoGeneration();
      resetDemoUsage();
      expect(hasDemoHistory()).toBe(false);
    });
  });
});
