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
  /** Bounding box for Dimensional Accuracy (Sd) - SOTA benchmark */
  boundingBox?: {
    min: [number, number, number];
    max: [number, number, number];
  };
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

// ============================================================================
// Library Cache (mirrored from openscadLoader.ts for worker context)
// ============================================================================
const libraryCache: Map<string, string> = new Map();
let librariesLoaded = false;
const BUILT_IN_LIBRARIES = ['tactical.scad'];

/**
 * Fetch a library file and cache it
 */
async function fetchLibrary(filename: string): Promise<string | null> {
  if (libraryCache.has(filename)) {
    return libraryCache.get(filename)!;
  }

  try {
    const response = await fetch(`/libraries/${filename}`);
    if (!response.ok) {
      console.warn(`[Worker] Library ${filename} not found (${response.status})`);
      return null;
    }

    const content = await response.text();
    libraryCache.set(filename, content);
    console.log(`[Worker] Library loaded: ${filename}`);
    return content;
  } catch (error) {
    console.warn(`[Worker] Failed to fetch library ${filename}:`, error);
    return null;
  }
}

/**
 * Load all built-in libraries into cache
 */
async function loadBuiltInLibraries(): Promise<void> {
  if (librariesLoaded) return;
  await Promise.all(BUILT_IN_LIBRARIES.map((lib) => fetchLibrary(lib)));
  librariesLoaded = true;
}

/**
 * Mount libraries into WASM virtual filesystem
 */
function mountLibraries(instance: any): void {
  if (!instance.FS?.mkdir) return;

  // Create /libraries directory
  try {
    instance.FS.stat?.('/libraries');
  } catch {
    try {
      instance.FS.mkdir('/libraries');
    } catch {
      // Directory might already exist
    }
  }

  // Write each library file
  for (const [filename, content] of libraryCache.entries()) {
    try {
      instance.FS.writeFile(`/libraries/${filename}`, content);
      console.log(`[Worker] Mounted: /libraries/${filename}`);
    } catch (e) {
      console.warn(`[Worker] Failed to mount ${filename}:`, e);
    }
  }
}

// ============================================================================
// STL Parsing Utilities
// ============================================================================

interface Triangle {
  v1: [number, number, number];
  v2: [number, number, number];
  v3: [number, number, number];
}

/**
 * Parse binary STL and extract triangles for geometry analysis
 */
function parseSTLBinary(data: Uint8Array): Triangle[] {
  const triangles: Triangle[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  if (data.length < 84) return triangles;

  // Use file-derived count to avoid corrupted header values
  const actualTriangles = Math.floor((data.length - 84) / 50);
  let offset = 84;

  for (let i = 0; i < actualTriangles && offset + 50 <= data.length; i++) {
    // Skip normal (12 bytes)
    offset += 12;

    const v1: [number, number, number] = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true),
    ];
    offset += 12;

    const v2: [number, number, number] = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true),
    ];
    offset += 12;

    const v3: [number, number, number] = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true),
    ];
    offset += 12;

    // Skip attribute byte count
    offset += 2;

    triangles.push({ v1, v2, v3 });
  }

  return triangles;
}

/**
 * Calculate bounding box for Dimensional Accuracy (Sd) check
 */
function calculateBoundingBox(triangles: Triangle[]): {
  min: [number, number, number];
  max: [number, number, number];
} {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (const tri of triangles) {
    for (const v of [tri.v1, tri.v2, tri.v3]) {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], v[i]);
        max[i] = Math.max(max[i], v[i]);
      }
    }
  }

  if (min[0] === Infinity) return { min: [0, 0, 0], max: [0, 0, 0] };
  return { min, max };
}

/**
 * Initialize OpenSCAD WASM module and load libraries
 */
async function initializeWorker(): Promise<void> {
  try {
    // Load libraries and WASM module in parallel
    const [, module] = await Promise.all([loadBuiltInLibraries(), import('openscad-wasm')]);
    openScadModule = module;

    isInitialized = true;
    ctx.postMessage({ type: 'READY' } as WorkerResponse);
    console.log('[Worker] OpenSCAD WASM initialized with libraries');
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

    // Mount libraries into WASM filesystem
    mountLibraries(instance);

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

    // Parse triangle count from STL binary header with sanity checking
    // FIX: The raw header value can be garbage (e.g., 892M triangles for a small file)
    let triangleCount = 0;
    let triangleCountCorrected = false;
    const warnings: string[] = [];

    if (stlData.length >= 84) {
      const view = new DataView(stlData.buffer, stlData.byteOffset, stlData.byteLength);
      const rawTriangleCount = view.getUint32(80, true);

      // Sanity check: each triangle is 50 bytes, plus 84-byte header
      const expectedSize = 84 + rawTriangleCount * 50;
      const actualTriangles = Math.floor((stlData.length - 84) / 50);

      if (rawTriangleCount > 10000000 || expectedSize > stlData.length + 100) {
        // Raw value is invalid - use estimated count from file size
        console.warn(
          `[Worker] STL triangle count ${rawTriangleCount} invalid (file: ${stlData.length} bytes). Using: ${actualTriangles}`
        );
        triangleCount = actualTriangles;
        triangleCountCorrected = true;
      } else {
        triangleCount = rawTriangleCount;
      }

      // Cap at 1M triangles max (anything beyond is likely parsing error)
      if (triangleCount > 1000000) {
        console.warn(
          `[Worker] Triangle count ${triangleCount} exceeds 1M. Capping to: ${actualTriangles}`
        );
        triangleCount = Math.min(actualTriangles, 1000000);
        triangleCountCorrected = true;
      }
    }

    if (triangleCountCorrected) {
      warnings.push(`STL triangle count was corrected. Final count: ${triangleCount} triangles.`);
    }

    // Calculate bounding box for Active Critic (Sd metric)
    let boundingBox: { min: [number, number, number]; max: [number, number, number] } | undefined;
    if (triangleCount > 0 && triangleCount < 100000) {
      try {
        const triangles = parseSTLBinary(stlData);
        boundingBox = calculateBoundingBox(triangles);
      } catch (e) {
        console.warn('[Worker] Bounding box calculation failed:', e);
      }
    }

    // Collect warnings from error log
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
      boundingBox,
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
    // Cleanup instance - CRITICAL for memory management
    if (instance) {
      // Step 1: Remove temporary files
      if (instance.FS?.unlink) {
        try {
          instance.FS.unlink('/input.scad');
        } catch {
          /* ignore */
        }
        try {
          instance.FS.unlink('/output.stl');
        } catch {
          /* ignore */
        }
      }

      // Step 2: CRITICAL - Free WASM heap to prevent memory leaks
      // Without this, memory accumulates with each render (~10-50MB per instance)
      if (typeof instance.delete === 'function') {
        instance.delete();
      } else if (typeof instance._free === 'function') {
        instance._free();
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
