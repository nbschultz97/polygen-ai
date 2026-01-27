// This service manages the loading and initialization of the OpenSCAD WASM engine.
// It uses a singleton pattern with proper cleanup to prevent memory leaks.

interface OpenSCADInstance {
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink?: (path: string) => void;
  };
  callMain: (args: string[]) => number;
  _free?: () => void;
}

interface OpenSCADLoader {
  OpenSCAD: (options: any) => Promise<OpenSCADInstance>;
  baseUrl: string;
}

let openScadPromise: Promise<OpenSCADLoader> | null = null;
let isLoading = false;

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
    const globalScope = window as any;

    // 1. Check if already loaded by another part of the app
    if (globalScope.OpenSCAD) {
      isLoading = false;
      return {
        OpenSCAD: globalScope.OpenSCAD,
        baseUrl: globalScope.OPENSCAD_BASE_URL || 'https://unpkg.com/openscad-wasm@0.0.4/web/',
      };
    }

    // List of CDNs to try with fallbacks
    // Package structure: openscad-wasm@0.0.4 uses ./web/openscad.js for browsers
    const candidates = [
      // Self-hosted (Priority 1)
      { url: '/wasm/', file: 'openscad.js' },
      // Current version with correct paths
      { url: 'https://unpkg.com/openscad-wasm@0.0.4/', file: 'web/openscad.js' },
      { url: 'https://cdn.jsdelivr.net/npm/openscad-wasm@0.0.4/', file: 'web/openscad.js' },
      // Latest tag
      { url: 'https://unpkg.com/openscad-wasm@latest/', file: 'web/openscad.js' },
      { url: 'https://cdn.jsdelivr.net/npm/openscad-wasm@latest/', file: 'web/openscad.js' },
      // Root entry point fallback
      { url: 'https://unpkg.com/openscad-wasm@0.0.4/', file: 'openscad.js' },
      { url: 'https://cdn.jsdelivr.net/npm/openscad-wasm@0.0.4/', file: 'openscad.js' },
      // Older versions
      { url: 'https://unpkg.com/openscad-wasm@0.0.3/', file: 'web/openscad.js' },
      { url: 'https://cdn.jsdelivr.net/npm/openscad-wasm@0.0.3/', file: 'web/openscad.js' },
    ];

    const loadScript = async (baseUrl: string, filename: string): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        // Safe environment cleanup for UMD compatibility
        const props = ['define', 'module', 'exports', 'require'];
        const backup: Record<string, any> = {};

        props.forEach((p) => {
          if (globalScope[p] !== undefined) {
            backup[p] = globalScope[p];
            try {
              globalScope[p] = undefined;
            } catch (e) {
              /* ignore */
            }
          }
        });

        const script = document.createElement('script');
        script.src = `${baseUrl}${filename}?t=${Date.now()}`;
        script.async = true;
        script.crossOrigin = 'anonymous';

        const cleanup = () => {
          props.forEach((p) => {
            if (backup[p] !== undefined) {
              try {
                globalScope[p] = backup[p];
              } catch (e) {
                /* ignore */
              }
            }
          });
        };

        const timeoutId = setTimeout(() => {
          cleanup();
          script.remove();
          reject(new Error(`Timeout loading from ${baseUrl}`));
        }, 15000);

        script.onload = () => {
          clearTimeout(timeoutId);
          cleanup();

          if (globalScope.OpenSCAD) {
            globalScope.OPENSCAD_BASE_URL = baseUrl;
            resolve();
          } else if (globalScope.Module && typeof globalScope.Module === 'function') {
            globalScope.OpenSCAD = globalScope.Module;
            globalScope.OPENSCAD_BASE_URL = baseUrl;
            resolve();
          } else if (window['OpenSCAD']) {
            globalScope.OpenSCAD = window['OpenSCAD'];
            globalScope.OPENSCAD_BASE_URL = baseUrl;
            resolve();
          } else {
            reject(new Error('Script loaded but OpenSCAD factory not found.'));
          }
        };

        script.onerror = () => {
          clearTimeout(timeoutId);
          cleanup();
          script.remove();
          reject(new Error(`Network error at ${baseUrl}`));
        };

        document.head.appendChild(script);
      });
    };

    // Try each CDN candidate
    let lastError: Error | null = null;
    for (const candidate of candidates) {
      try {
        await loadScript(candidate.url, candidate.file);
        isLoading = false;
        // Calculate baseUrl for WASM files - they're in the same folder as the JS file
        const wasmBaseUrl = candidate.file.includes('/')
          ? candidate.url + candidate.file.substring(0, candidate.file.lastIndexOf('/') + 1)
          : candidate.url;
        console.log(
          `OpenSCAD loaded from ${candidate.url}${candidate.file}, WASM base: ${wasmBaseUrl}`
        );
        return { OpenSCAD: globalScope.OpenSCAD, baseUrl: wasmBaseUrl };
      } catch (e) {
        lastError = e as Error;
        console.warn(`Failed to load from ${candidate.url}${candidate.file}`, e);
      }
    }

    // Reset state on failure so it can be retried
    openScadPromise = null;
    isLoading = false;

    throw new Error(`OpenSCAD engine could not be retrieved.

Details: ${lastError?.message || 'Unknown network error'}.

Please check your internet connection. If you are on a strict network (like a corporate VPN), they may be blocking access to 'unpkg.com' or 'jsdelivr.net'.`);
  })();

  return openScadPromise;
};

/**
 * Create a new OpenSCAD instance with proper configuration.
 * Use cleanupInstance() when done to help with memory management.
 */
export const createOpenSCADInstance = async (options: {
  onPrint?: (text: string) => void;
  onPrintErr?: (text: string) => void;
}): Promise<OpenSCADInstance> => {
  const { OpenSCAD, baseUrl } = await loadOpenSCAD();

  const instance = await OpenSCAD({
    noInitialRun: true,
    locateFile: (path: string) => `${baseUrl}${path}`,
    print: options.onPrint || (() => {}),
    printErr: options.onPrintErr || (() => {}),
  });

  return instance;
};

/**
 * Clean up temporary files from an OpenSCAD instance.
 * Call this after each render/validation to prevent memory buildup.
 */
export const cleanupInstance = (instance: OpenSCADInstance): void => {
  if (!instance?.FS) return;

  try {
    // Try to remove temporary files
    if (instance.FS.unlink) {
      try {
        instance.FS.unlink('/input.scad');
      } catch (e) {
        /* file may not exist */
      }
      try {
        instance.FS.unlink('/output.stl');
      } catch (e) {
        /* file may not exist */
      }
    }
  } catch (e) {
    console.warn('Failed to cleanup OpenSCAD instance files:', e);
  }
};

/**
 * Reset the loader state - useful for error recovery
 */
export const resetLoader = (): void => {
  openScadPromise = null;
  isLoading = false;

  // Clean up global references
  const globalScope = window as any;
  if (globalScope.OpenSCAD) {
    delete globalScope.OpenSCAD;
  }
  if (globalScope.OPENSCAD_BASE_URL) {
    delete globalScope.OPENSCAD_BASE_URL;
  }
};
