// This service manages the loading and initialization of the OpenSCAD WASM engine.
// It uses a singleton pattern with proper cleanup to prevent memory leaks.
// Uses ES module dynamic import since openscad-wasm is an ES module.
//
// SOTA 3-Tier Library System:
// 1. Built-in libraries (tactical.scad) - loaded into WASM FS at /libraries/
// 2. User can reference with: use <libraries/tactical.scad>
// 3. Libraries are fetched from /public/libraries/ and cached

interface OpenSCADInstance {
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink?: (path: string) => void;
    mkdir?: (path: string) => void;
    stat?: (path: string) => { mode: number };
  };
  callMain: (args: string[]) => number;
  _free?: () => void;
  // SOTA Memory Leak Fix: Explicit C++ destructor for WASM heap cleanup
  delete?: () => void;
}

interface OpenSCADLoader {
  OpenSCAD: (options: any) => Promise<OpenSCADInstance>;
  baseUrl: string;
}

// Type for the openscad-wasm ES module export
interface OpenSCADModule {
  createOpenSCAD: (options?: any) => Promise<OpenSCADInstance>;
}

let openScadPromise: Promise<OpenSCADLoader> | null = null;
let isLoading = false;
let _cachedModule: OpenSCADModule | null = null;

// ============================================================================
// SOTA 3-Tier Library System
// ============================================================================

// Cache for library file contents (fetched once, reused across instances)
const libraryCache: Map<string, string> = new Map();
let librariesLoaded = false;

// List of built-in libraries to mount in WASM FS
const BUILT_IN_LIBRARIES = ['tactical.scad'];

/**
 * Fetch a library file from the public folder and cache it
 */
async function fetchLibrary(filename: string): Promise<string | null> {
  // Return cached version if available
  if (libraryCache.has(filename)) {
    return libraryCache.get(filename)!;
  }

  try {
    const response = await fetch(`/libraries/${filename}`);
    if (!response.ok) {
      console.warn(`Library ${filename} not found (${response.status})`);
      return null;
    }

    const content = await response.text();
    libraryCache.set(filename, content);
    console.log(`Library loaded: ${filename} (${content.length} bytes)`);
    return content;
  } catch (error) {
    console.warn(`Failed to fetch library ${filename}:`, error);
    return null;
  }
}

/**
 * Load all built-in libraries into cache
 */
async function loadBuiltInLibraries(): Promise<void> {
  if (librariesLoaded) return;

  console.log('Loading built-in OpenSCAD libraries...');
  await Promise.all(BUILT_IN_LIBRARIES.map((lib) => fetchLibrary(lib)));
  librariesLoaded = true;
}

/**
 * Mount all cached libraries into WASM virtual filesystem
 * Creates /libraries/ directory and writes all library files
 */
function mountLibraries(instance: OpenSCADInstance): void {
  if (!instance.FS?.mkdir) {
    console.warn('FS.mkdir not available - libraries will not be mounted');
    return;
  }

  // Create /libraries directory if it doesn't exist
  try {
    instance.FS.stat?.('/libraries');
  } catch {
    try {
      instance.FS.mkdir('/libraries');
      console.log('Created /libraries directory in WASM FS');
    } catch (mkdirError) {
      console.warn('Failed to create /libraries directory:', mkdirError);
    }
  }

  // Write each cached library to the WASM FS
  for (const [filename, content] of libraryCache.entries()) {
    try {
      instance.FS.writeFile(`/libraries/${filename}`, content);
      console.log(`Mounted library: /libraries/${filename}`);
    } catch (writeError) {
      console.warn(`Failed to mount library ${filename}:`, writeError);
    }
  }
}

// ============================================================================
// SOTA Projection Guard
// ============================================================================

// Keywords that indicate 2D/laser cutting operations (not supported in browser)
const PROJECTION_KEYWORDS = [
  /\bprojection\s*\(/i,
  /\blaser\s*cut/i,
  /\b2d\s*(cut|pattern|design)/i,
  /\bflatten/i,
  /\bdxf\b/i,
];

/**
 * Check if code contains unsupported 2D projection operations
 * Returns error message if projection detected, null otherwise
 */
export function checkForProjection(code: string): string | null {
  for (const pattern of PROJECTION_KEYWORDS) {
    if (pattern.test(code)) {
      return (
        '2D projection/laser cutting operations are not supported in the browser. ' +
        'Please use desktop OpenSCAD for projection() and DXF export.'
      );
    }
  }
  return null;
}

export const loadOpenSCAD = (): Promise<OpenSCADLoader> => {
  // Return existing promise if loading or loaded
  if (openScadPromise) return openScadPromise;

  // Prevent race conditions during initialization
  if (isLoading) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (openScadPromise) {
          clearInterval(checkInterval);
          resolve(openScadPromise);
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('OpenSCAD loader timed out waiting for initialization'));
      }, 30000);
    });
  }

  isLoading = true;

  openScadPromise = (async () => {
    try {
      // Use ES module dynamic import - Vite handles this properly
      // This imports from node_modules/openscad-wasm which is bundled by Vite
      const module = (await import('openscad-wasm')) as unknown as OpenSCADModule;
      _cachedModule = module;

      // Wrap createOpenSCAD to match expected interface
      const OpenSCAD = async (options: any): Promise<OpenSCADInstance> => {
        return module.createOpenSCAD(options);
      };

      isLoading = false;
      console.log('OpenSCAD loaded via ES module import');

      return {
        OpenSCAD,
        baseUrl: '', // Not needed for ES module import - Vite handles asset paths
      };
    } catch (importError) {
      console.warn('ES module import failed, trying CDN fallback:', importError);

      // Fallback: Try loading via CDN with script type="module"
      const cdnUrls = [
        'https://esm.sh/openscad-wasm@0.0.4',
        'https://cdn.skypack.dev/openscad-wasm@0.0.4',
      ];

      for (const url of cdnUrls) {
        try {
          const module = (await import(/* @vite-ignore */ url)) as OpenSCADModule;
          _cachedModule = module;

          const OpenSCAD = async (options: any): Promise<OpenSCADInstance> => {
            return module.createOpenSCAD(options);
          };

          isLoading = false;
          console.log(`OpenSCAD loaded from CDN: ${url}`);

          return {
            OpenSCAD,
            baseUrl: url.substring(0, url.lastIndexOf('/') + 1),
          };
        } catch (cdnError) {
          console.warn(`Failed to load from ${url}:`, cdnError);
        }
      }

      // Reset state on failure so it can be retried
      openScadPromise = null;
      isLoading = false;

      throw new Error(`OpenSCAD engine could not be loaded.

The ES module import failed. This may be due to:
- Missing openscad-wasm package (run: npm install openscad-wasm)
- Build/bundling issues with Vite
- Network restrictions blocking ESM CDNs

Original error: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
    }
  })();

  return openScadPromise;
};

/**
 * Create a new OpenSCAD instance with proper configuration.
 * Use cleanupInstance() when done to help with memory management.
 *
 * SOTA Library System: Automatically loads and mounts built-in libraries
 * into the WASM virtual filesystem at /libraries/
 */
export const createOpenSCADInstance = async (options: {
  onPrint?: (text: string) => void;
  onPrintErr?: (text: string) => void;
}): Promise<OpenSCADInstance> => {
  // Pre-load libraries in parallel with WASM initialization
  const libraryLoadPromise = loadBuiltInLibraries();

  const { OpenSCAD } = await loadOpenSCAD();

  // createOpenSCAD returns OpenSCADInstance with high-level API
  // We need getInstance() to access the low-level FS and callMain interface
  console.log('[openscadLoader] Calling createOpenSCAD...');
  const wrapper = await OpenSCAD({
    noInitialRun: true,
    print: options.onPrint || (() => {}),
    printErr: options.onPrintErr || (() => {}),
  });
  console.log(
    '[openscadLoader] createOpenSCAD returned:',
    typeof wrapper,
    Object.keys(wrapper || {})
  );

  // The wrapper has renderToStl() and getInstance()
  // getInstance() returns the low-level OpenSCAD with FS and callMain
  let instance: OpenSCADInstance;
  if ('getInstance' in wrapper && typeof wrapper.getInstance === 'function') {
    instance = wrapper.getInstance() as OpenSCADInstance;
    console.log('[openscadLoader] Got low-level instance via getInstance()');
  } else if (wrapper?.FS && wrapper?.callMain) {
    // Already the low-level instance
    instance = wrapper as OpenSCADInstance;
    console.log('[openscadLoader] Wrapper is already low-level instance');
  } else {
    console.error('[openscadLoader] Unexpected wrapper shape:', wrapper);
    throw new Error(
      'OpenSCAD WASM initialized but returned unexpected object. ' +
        `Has getInstance: ${'getInstance' in wrapper}, Has FS: ${!!wrapper?.FS}, Has callMain: ${!!wrapper?.callMain}`
    );
  }

  // Validate the instance has required methods
  if (
    !instance.FS?.writeFile ||
    !instance.FS?.readFile ||
    typeof instance.callMain !== 'function'
  ) {
    console.error('[openscadLoader] Instance missing required methods:', {
      hasWriteFile: !!instance.FS?.writeFile,
      hasReadFile: !!instance.FS?.readFile,
      hasCallMain: typeof instance.callMain,
    });
    throw new Error('OpenSCAD WASM instance is missing required FS or callMain methods');
  }

  // Wait for libraries to finish loading, then mount them
  await libraryLoadPromise;
  mountLibraries(instance);

  // Verify libraries were actually mounted
  const mountedLibs: string[] = [];
  for (const filename of BUILT_IN_LIBRARIES) {
    try {
      instance.FS.stat?.(`/libraries/${filename}`);
      mountedLibs.push(filename);
    } catch {
      console.error(`[openscadLoader] CRITICAL: Library /libraries/${filename} NOT mounted`);
    }
  }
  console.log(`[openscadLoader] Libraries mounted: ${mountedLibs.join(', ') || 'NONE'}`);

  return instance;
};

/**
 * Clean up OpenSCAD instance to prevent memory leaks.
 * SOTA Memory Leak Fix: Explicitly calls instance.delete() to free WASM heap.
 * Critical for mobile stability - prevents heap exhaustion on repeated renders.
 * Source: "The Noble Effort To Put OpenSCAD In The Browser" - standard SOTA requirement.
 */
export const cleanupInstance = (instance: OpenSCADInstance): void => {
  if (!instance) return;

  try {
    // Step 1: Remove temporary files from virtual filesystem
    if (instance.FS?.unlink) {
      try {
        instance.FS.unlink('/input.scad');
      } catch {
        /* file may not exist */
      }
      try {
        instance.FS.unlink('/output.stl');
      } catch {
        /* file may not exist */
      }
    }

    // Step 2: CRITICAL - Explicitly delete C++ objects on WASM heap
    // Without this, memory accumulates with each render (~10-50MB per instance)
    // On mobile devices, this causes heap exhaustion after 5-10 renders
    if (typeof instance.delete === 'function') {
      instance.delete();
      console.log('OpenSCAD instance deleted (WASM heap freed)');
    } else if (typeof instance._free === 'function') {
      // Fallback for older versions that use _free
      instance._free();
      console.log('OpenSCAD instance freed via _free()');
    }
  } catch (e) {
    console.warn('Failed to cleanup OpenSCAD instance:', e);
  }
};

/**
 * Reset the loader state - useful for error recovery
 */
export const resetLoader = (): void => {
  openScadPromise = null;
  isLoading = false;
  _cachedModule = null;
};
