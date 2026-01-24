
import { loadOpenSCAD, cleanupInstance } from './openscadLoader';

export interface ValidationResult {
  success: boolean;
  error?: string;
  warnings?: string[];
}

export const validateScadCode = async (code: string): Promise<ValidationResult> => {
  if (!code || typeof code !== 'string') {
    return { success: false, error: "Code is empty or invalid" };
  }

  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return { success: false, error: "Code is empty" };
  }

  let instance: any = null;

  try {
    let OpenSCAD;
    let baseUrl;

    try {
      const result = await loadOpenSCAD();
      OpenSCAD = result.OpenSCAD;
      baseUrl = result.baseUrl;
    } catch (loadErr) {
      console.warn("Validation Service Warning: OpenSCAD engine failed to load. Skipping validation.", loadErr);
      return {
        success: true,
        warnings: ["Validation skipped due to engine load failure. Code may still work in OpenSCAD Desktop."]
      };
    }

    if (!OpenSCAD || typeof OpenSCAD !== 'function') {
      return {
        success: true,
        warnings: ["Validation skipped: OpenSCAD factory not available."]
      };
    }

    let errorLog = "";

    instance = await OpenSCAD({
      noInitialRun: true,
      locateFile: (path: string) => `${baseUrl}${path}`,
      print: () => {},
      printErr: (text: string) => {
        if (text && text.toLowerCase().includes('error') && !text.includes("GL_INVALID_OPERATION")) {
          errorLog += text + "\n";
        }
      }
    });

    if (!instance?.FS) {
      return {
        success: false,
        error: "OpenSCAD instance failed to initialize properly"
      };
    }

    instance.FS.writeFile('/input.scad', trimmedCode);
    const exitCode = instance.callMain(['/input.scad', '-o', 'output.stl']);

    if (exitCode !== 0) {
      return {
        success: false,
        error: `Compilation Failed (Exit Code ${exitCode}):\n${errorLog || "Unknown error - check your SCAD syntax"}`
      };
    }

    // Safely attempt to read the output file
    let stlData: Uint8Array | null = null;
    try {
      stlData = instance.FS.readFile('/output.stl');
    } catch (readError) {
      return {
        success: false,
        error: "Failed to read output STL. The compilation may have succeeded but produced no output. Check for infinite recursion or empty geometry."
      };
    }

    if (!stlData) {
      return {
        success: false,
        error: "No STL data was generated. Check your SCAD code for errors."
      };
    }

    // STL binary header is 84 bytes minimum (80 byte header + 4 byte triangle count)
    // If the file is only 84 bytes, it means 0 triangles = empty geometry
    if (stlData.length <= 84) {
      return {
        success: false,
        error: "SCENE IS EMPTY. The code compiled, but resulted in 0 geometry. Check your difference() logic or ensure your main() module produces visible geometry."
      };
    }

    return { success: true };

  } catch (err: any) {
    const errorMessage = err?.message || "Unknown Validation Error";
    console.error("SCAD Validation Error:", errorMessage);
    return {
      success: false,
      error: `Validation failed: ${errorMessage}`
    };
  } finally {
    // Clean up instance to prevent memory leaks
    if (instance) {
      cleanupInstance(instance);
    }
  }
};
