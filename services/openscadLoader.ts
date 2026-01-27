// This service manages the loading and initialization of the OpenSCAD WASM engine.
// It uses a singleton pattern with proper cleanup to prevent memory leaks.
// Uses ES module dynamic import since openscad-wasm is an ES module.

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

// Type for the openscad-wasm ES module export
interface OpenSCADModule {
  createOpenSCAD: (options?: any) => Promise<OpenSCADInstance>;
}

let openScadPromise: Promise<OpenSCADLoader> | null = null;
let isLoading = false;
let _cachedModule: OpenSCADModule | null = null;

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
 */
export const createOpenSCADInstance = async (options: {
  onPrint?: (text: string) => void;
  onPrintErr?: (text: string) => void;
}): Promise<OpenSCADInstance> => {
  const { OpenSCAD } = await loadOpenSCAD();

  // createOpenSCAD returns OpenSCADInstance with high-level API
  // We need getInstance() to access the low-level FS and callMain interface
  const wrapper = await OpenSCAD({
    noInitialRun: true,
    print: options.onPrint || (() => {}),
    printErr: options.onPrintErr || (() => {}),
  });

  // The wrapper has renderToStl() and getInstance()
  // getInstance() returns the low-level OpenSCAD with FS and callMain
  if ('getInstance' in wrapper && typeof wrapper.getInstance === 'function') {
    return wrapper.getInstance() as OpenSCADInstance;
  }

  // Fallback: if it's already the low-level instance
  return wrapper as OpenSCADInstance;
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
      } catch {
        /* file may not exist */
      }
      try {
        instance.FS.unlink('/output.stl');
      } catch {
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
  _cachedModule = null;
};
