/**
 * Worker Validation Service
 * Manages Web Worker lifecycle for OpenSCAD WASM validation
 * Provides Promise-based API with fallback to main thread
 */

import type { ValidationResult } from './scadValidation';

// Validation options interface
interface ValidationOptions {
  useManifoldBackend?: boolean;
  previewMode?: boolean;
}

// Message types for Worker communication
interface WorkerRequest {
  type: 'VALIDATE' | 'ABORT' | 'TERMINATE';
  requestId: string;
  code?: string;
  options?: ValidationOptions;
}

interface WorkerResponse {
  type: 'RESULT' | 'ERROR' | 'READY' | 'ABORTED';
  requestId?: string;
  result?: ValidationResult;
  error?: string;
}

// Pending request tracking
interface PendingRequest {
  resolve: (result: ValidationResult) => void;
  reject: (error: Error) => void;
  abortHandler?: () => void;
}

// Worker initialization timeout (30 seconds)
const INIT_TIMEOUT = 30000;

// Validation timeout (60 seconds)
const VALIDATION_TIMEOUT = 60000;

/**
 * Worker Validation Service Class
 * Singleton pattern for managing a single Web Worker instance
 */
class WorkerValidationService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private isReady = false;
  private initPromise: Promise<void> | null = null;
  private fallbackToMainThread = false;

  constructor() {
    this.initWorker();
  }

  /**
   * Initialize the Web Worker
   */
  private async initWorker(): Promise<void> {
    // Check for Worker support
    if (typeof Worker === 'undefined') {
      console.warn('[WorkerValidation] Web Workers not supported, using main thread');
      this.fallbackToMainThread = true;
      return;
    }

    try {
      // Create module worker using Vite's URL import pattern
      // This works with Vite's build system for proper bundling
      this.worker = new Worker(new URL('./scadValidation.worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);

      // Wait for READY message with timeout
      this.initPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('[WorkerValidation] Worker init timeout, using main thread');
          this.fallbackToMainThread = true;
          this.worker?.terminate();
          this.worker = null;
          reject(new Error('Worker initialization timeout'));
        }, INIT_TIMEOUT);

        const readyHandler = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.type === 'READY') {
            clearTimeout(timeout);
            this.isReady = true;
            this.worker?.removeEventListener('message', readyHandler);
            console.log('[WorkerValidation] Worker ready');
            resolve();
          } else if (event.data.type === 'ERROR' && !event.data.requestId) {
            // Initialization error
            clearTimeout(timeout);
            this.fallbackToMainThread = true;
            this.worker?.terminate();
            this.worker = null;
            reject(new Error(event.data.error || 'Worker initialization failed'));
          }
        };

        this.worker?.addEventListener('message', readyHandler);
      });

      await this.initPromise;
    } catch (error) {
      console.warn('[WorkerValidation] Worker init failed, using main thread:', error);
      this.fallbackToMainThread = true;
      this.worker?.terminate();
      this.worker = null;
    }
  }

  /**
   * Handle messages from Worker
   */
  private handleMessage(event: MessageEvent<WorkerResponse>): void {
    const { type, requestId, result, error } = event.data;

    // Skip messages without requestId (handled in initWorker)
    if (!requestId) return;

    const pending = this.pendingRequests.get(requestId);
    if (!pending) return;

    this.pendingRequests.delete(requestId);

    switch (type) {
      case 'RESULT':
        if (result) {
          pending.resolve(result);
        } else {
          pending.reject(new Error('Empty result from worker'));
        }
        break;

      case 'ERROR':
        pending.reject(new Error(error || 'Worker validation error'));
        break;

      case 'ABORTED':
        pending.reject(new DOMException('Aborted', 'AbortError'));
        break;
    }
  }

  /**
   * Handle Worker errors
   */
  private handleError(event: ErrorEvent): void {
    console.error('[WorkerValidation] Worker error:', event.message);

    // Reject all pending requests
    for (const [requestId, pending] of this.pendingRequests) {
      pending.reject(new Error(`Worker error: ${event.message}`));
      this.pendingRequests.delete(requestId);
    }

    // Mark for fallback on next validation
    this.fallbackToMainThread = true;
    this.isReady = false;
  }

  /**
   * Validate SCAD code using Web Worker (or main thread fallback)
   */
  async validate(
    code: string,
    options?: ValidationOptions,
    abortSignal?: AbortSignal
  ): Promise<ValidationResult> {
    // Check abort before starting
    if (abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Fallback to main thread if Workers not available
    if (this.fallbackToMainThread) {
      console.log('[WorkerValidation] Using main thread fallback');
      const { validateScadCode } = await import('./scadValidation');
      return validateScadCode(code, options);
    }

    // Ensure worker is ready
    if (!this.isReady && this.initPromise) {
      try {
        await this.initPromise;
      } catch {
        // Init failed, use fallback
        const { validateScadCode } = await import('./scadValidation');
        return validateScadCode(code, options);
      }
    }

    // Double-check worker availability
    if (!this.worker || !this.isReady) {
      const { validateScadCode } = await import('./scadValidation');
      return validateScadCode(code, options);
    }

    // Create unique request ID
    const requestId = crypto.randomUUID();

    return new Promise<ValidationResult>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        this.worker?.postMessage({ type: 'ABORT', requestId } as WorkerRequest);
        reject(new Error('Validation timeout'));
      }, VALIDATION_TIMEOUT);

      // Set up abort handler
      const abortHandler = () => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(requestId);
        this.worker?.postMessage({ type: 'ABORT', requestId } as WorkerRequest);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      abortSignal?.addEventListener('abort', abortHandler);

      // Track pending request
      this.pendingRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          abortSignal?.removeEventListener('abort', abortHandler);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          abortSignal?.removeEventListener('abort', abortHandler);
          reject(error);
        },
        abortHandler,
      });

      // Send validation request to worker
      this.worker!.postMessage({
        type: 'VALIDATE',
        requestId,
        code,
        options,
      } as WorkerRequest);
    });
  }

  /**
   * Check if Worker validation is available
   */
  isAvailable(): boolean {
    return !this.fallbackToMainThread && this.isReady;
  }

  /**
   * Terminate the Worker
   */
  terminate(): void {
    // Reject all pending requests
    for (const [requestId, pending] of this.pendingRequests) {
      pending.reject(new Error('Worker terminated'));
      this.pendingRequests.delete(requestId);
    }

    this.worker?.postMessage({ type: 'TERMINATE' } as WorkerRequest);
    this.worker?.terminate();
    this.worker = null;
    this.isReady = false;
  }

  /**
   * Reset and reinitialize Worker (useful for error recovery)
   */
  async reset(): Promise<void> {
    this.terminate();
    this.fallbackToMainThread = false;
    this.initPromise = null;
    await this.initWorker();
  }
}

// Singleton instance
export const workerValidationService = new WorkerValidationService();

export default workerValidationService;
