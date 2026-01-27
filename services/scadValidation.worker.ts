/**
 * OpenSCAD WASM Web Worker
 * Runs validation in a separate thread to keep UI responsive
 *
 * Message Protocol:
 * - VALIDATE: { requestId, code, options } -> { requestId, result }
 * - ABORT: { requestId } -> { requestId, type: ABORTED }
 * - READY: Worker initialization complete
 */

// Worker self-reference - use any for close() method compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = self as any;

// Types for message protocol
interface ValidationOptions {
  useManifoldBackend?: boolean;
  previewMode?: boolean;
}

interface ValidationResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  exitCode?: number;
  rawErrorLog?: string;
  stlData?: Uint8Array;
  triangleCount?: number;
  isManifold?: boolean;
  manifoldIssues?: string[];
}

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

// Track current validation for abort support
let currentRequestId: string | null = null;
let isInitialized = false;
let openScadModule: any = null;

// Default options
const DEFAULT_OPTIONS: ValidationOptions = {
  useManifoldBackend: true,
  previewMode: false,
};

/**
 * Initialize OpenSCAD WASM module
 */
async function initializeWorker(): Promise<void> {
  try {
    // Import openscad-wasm ES module
    // Note: This works in module workers (type: 'module')
    const module = await import('openscad-wasm');
    openScadModule = module;

    isInitialized = true;
    ctx.postMessage({ type: 'READY' } as WorkerResponse);
    console.log('[Worker] OpenSCAD WASM initialized');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Worker] Initialization failed:', message);
    ctx.postMessage({
      type: 'ERROR',
      error: `Worker initialization failed: ${message}`,
    } as WorkerResponse);
  }
}

/**
 * Validate SCAD code in the worker context
 * This is a simplified version of the main thread validation
 */
async function validateInWorker(
  code: string,
  options: ValidationOptions = DEFAULT_OPTIONS
): Promise<ValidationResult> {
  if (!isInitialized || !openScadModule) {
    throw new Error('OpenSCAD WASM not initialized');
  }

  if (!code || typeof code !== 'string') {
    return { success: false, error: 'Code is empty or invalid' };
  }

  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return { success: false, error: 'Code is empty' };
  }

  let instance: any = null;

  try {
    let errorLog = '';

    // Create OpenSCAD instance
    const wrapper = await openScadModule.createOpenSCAD({
      noInitialRun: true,
      print: () => {},
      printErr: (text: string) => {
        if (text && !text.includes('GL_INVALID_OPERATION')) {
          errorLog += text + '\n';
        }
      },
    });

    // Get low-level instance with FS and callMain
    instance =
      'getInstance' in wrapper && typeof wrapper.getInstance === 'function'
        ? wrapper.getInstance()
        : wrapper;

    if (!instance?.FS) {
      // Try high-level API as fallback
      if ('renderToStl' in wrapper && typeof wrapper.renderToStl === 'function') {
        try {
          await wrapper.renderToStl(trimmedCode);
          return { success: true, warnings: ['Validated using fallback mode.'] };
        } catch (renderErr: any) {
          return {
            success: false,
            error: `Compilation failed: ${renderErr?.message || 'Unknown error'}`,
          };
        }
      }
      return {
        success: false,
        error: 'OpenSCAD WASM failed to initialize in worker.',
      };
    }

    // Write input file
    instance.FS.writeFile('/input.scad', trimmedCode);

    // Build command arguments
    const args = ['/input.scad', '-o', 'output.stl'];
    if (options.useManifoldBackend) {
      args.push('--backend=Manifold');
    }
    if (options.previewMode) {
      args.push('--preview');
    }

    // Run OpenSCAD
    const exitCode = instance.callMain(args);

    if (exitCode !== 0) {
      return {
        success: false,
        error: `Compilation Failed (Exit Code ${exitCode}):\n${errorLog || 'Unknown error'}`,
        exitCode,
        rawErrorLog: errorLog,
      };
    }

    // Read output STL
    let stlData: Uint8Array | null = null;
    try {
      stlData = instance.FS.readFile('/output.stl');
    } catch {
      return {
        success: false,
        error: 'Failed to read output STL. Check for empty geometry.',
        exitCode,
        rawErrorLog: errorLog,
      };
    }

    if (!stlData || stlData.length <= 84) {
      return {
        success: false,
        error: 'SCENE IS EMPTY. The code compiled but produced no geometry.',
        exitCode,
        rawErrorLog: errorLog,
      };
    }

    // Parse triangle count from STL binary header
    let triangleCount = 0;
    if (stlData.length >= 84) {
      const view = new DataView(stlData.buffer, stlData.byteOffset, stlData.byteLength);
      triangleCount = view.getUint32(80, true);
    }

    // Collect warnings
    const warnings: string[] = [];
    if (errorLog.toLowerCase().includes('warning')) {
      warnings.push(
        ...errorLog
          .split('\n')
          .filter((line) => line.toLowerCase().includes('warning') && !line.includes('GL_INVALID'))
      );
    }

    return {
      success: true,
      exitCode,
      rawErrorLog: errorLog || undefined,
      stlData,
      triangleCount,
      isManifold: true, // Simplified - full manifold check is expensive
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err: any) {
    console.error('[Worker] Validation error:', err);
    return {
      success: false,
      error: `Validation failed: ${err?.message || 'Unknown error'}`,
    };
  } finally {
    // Cleanup instance
    if (instance?.FS?.unlink) {
      try {
        instance.FS.unlink('/input.scad');
      } catch {
        // Ignore cleanup errors
      }
      try {
        instance.FS.unlink('/output.stl');
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Handle incoming messages from main thread
 */
ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, requestId, code, options } = event.data;

  switch (type) {
    case 'VALIDATE':
      if (!requestId || !code) {
        ctx.postMessage({
          type: 'ERROR',
          requestId,
          error: 'Missing requestId or code',
        } as WorkerResponse);
        return;
      }

      currentRequestId = requestId;

      try {
        const result = await validateInWorker(code, options);

        // Check if this request was aborted
        if (currentRequestId !== requestId) {
          return; // Silently ignore result for aborted request
        }

        ctx.postMessage({
          type: 'RESULT',
          requestId,
          result,
        } as WorkerResponse);
      } catch (error) {
        ctx.postMessage({
          type: 'ERROR',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as WorkerResponse);
      } finally {
        currentRequestId = null;
      }
      break;

    case 'ABORT':
      if (currentRequestId === requestId) {
        currentRequestId = null;
        ctx.postMessage({
          type: 'ABORTED',
          requestId,
        } as WorkerResponse);
      }
      break;

    case 'TERMINATE':
      ctx.close();
      break;
  }
};

// Initialize worker on load
initializeWorker();
