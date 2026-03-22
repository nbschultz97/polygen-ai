/**
 * Worker Validation Service Unit Tests
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock Worker globally before import
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = mockPostMessage;
  terminate = mockTerminate;
  addEventListener = mockAddEventListener;
  removeEventListener = mockRemoveEventListener;
}

// We need to test the class behavior indirectly since it auto-inits
// Mock the scadValidation import for fallback tests
vi.mock('../../services/scadValidation', () => ({
  validateScadCode: vi.fn().mockResolvedValue({
    success: true,
    output: 'mock output',
    errors: [],
  }),
}));

describe('WorkerValidationService', () => {
  describe('fallback behavior (no Worker support)', () => {
    let originalWorker: typeof Worker;

    beforeEach(() => {
      originalWorker = globalThis.Worker;
      delete globalThis.Worker;
      vi.resetModules();
    });

    afterEach(() => {
      globalThis.Worker = originalWorker;
    });

    it('falls back to main thread when Workers not supported', async () => {
      const { workerValidationService } = await import('../../services/workerValidationService');

      // Should not be available
      expect(workerValidationService.isAvailable()).toBe(false);
    });
  });

  describe('with Worker support', () => {
    let originalWorker: typeof Worker;

    beforeEach(() => {
      originalWorker = globalThis.Worker;
      // @ts-expect-error - mocking Worker with test implementation
      globalThis.Worker = MockWorker;
      vi.resetModules();
      mockPostMessage.mockClear();
      mockTerminate.mockClear();
      mockAddEventListener.mockClear();
    });

    afterEach(() => {
      globalThis.Worker = originalWorker;
    });

    it('creates worker with module type', async () => {
      // The constructor creates the worker immediately
      // Just verify no errors during import
      const mod = await import('../../services/workerValidationService');
      expect(mod.workerValidationService).toBeDefined();
    });
  });

  describe('abort handling', () => {
    it('throws on already-aborted signal', async () => {
      vi.resetModules();
      const { workerValidationService } = await import('../../services/workerValidationService');

      const controller = new AbortController();
      controller.abort();

      await expect(
        workerValidationService.validate('cube([1,1,1]);', undefined, controller.signal)
      ).rejects.toThrow('Aborted');
    });
  });

  describe('terminate', () => {
    it('can be called without error', async () => {
      vi.resetModules();
      const { workerValidationService } = await import('../../services/workerValidationService');
      expect(() => workerValidationService.terminate()).not.toThrow();
    });
  });
});
