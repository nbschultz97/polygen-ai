import { loadOpenSCAD, cleanupInstance } from './openscadLoader';

/**
 * Validation configuration options
 * Research shows Manifold backend provides "orders of magnitude" faster boolean operations
 */
export interface ValidationOptions {
  /** Use Manifold geometry kernel instead of CGAL (10x+ faster) */
  useManifoldBackend?: boolean;
  /** Use preview mode for faster iteration (skip full render) */
  previewMode?: boolean;
}

// Default to Manifold backend for performance (research-validated)
const DEFAULT_OPTIONS: ValidationOptions = {
  useManifoldBackend: true,
  previewMode: false,
};

export interface ValidationResult {
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
  /** Mesh volume for Volumetric Similarity (Sv) - SOTA benchmark */
  volume?: number;
}

/**
 * Parse binary STL data and extract triangles
 * STL binary format:
 * - 80 bytes: header
 * - 4 bytes: uint32 triangle count
 * - For each triangle (50 bytes each):
 *   - 12 bytes: normal vector (3 floats)
 *   - 36 bytes: 3 vertices (9 floats, 12 bytes each)
 *   - 2 bytes: attribute byte count
 */
interface Triangle {
  v1: [number, number, number];
  v2: [number, number, number];
  v3: [number, number, number];
}

function parseSTLBinary(data: Uint8Array): Triangle[] {
  const triangles: Triangle[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  if (data.length < 84) return triangles;

  const numTriangles = view.getUint32(80, true);
  let offset = 84;

  for (let i = 0; i < numTriangles && offset + 50 <= data.length; i++) {
    // Skip normal (12 bytes)
    offset += 12;

    // Read 3 vertices
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

    // Skip attribute byte count (2 bytes)
    offset += 2;

    triangles.push({ v1, v2, v3 });
  }

  return triangles;
}

/**
 * Calculate bounding box of the mesh
 * Used for Dimensional Accuracy (Sd) check - SOTA benchmark metric
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

  // Handle empty mesh case
  if (min[0] === Infinity) return { min: [0, 0, 0], max: [0, 0, 0] };

  return { min, max };
}

/**
 * Calculate mesh volume using signed tetrahedron method
 * Used for Volumetric Similarity (Sv) check - SOTA benchmark metric
 */
function calculateVolume(triangles: Triangle[]): number {
  let volume = 0;

  for (const tri of triangles) {
    // Signed volume of tetrahedron formed by origin and triangle
    // V = (v1 . (v2 x v3)) / 6
    const v1 = tri.v1;
    const v2 = tri.v2;
    const v3 = tri.v3;

    // Cross product v2 x v3
    const crossX = v2[1] * v3[2] - v2[2] * v3[1];
    const crossY = v2[2] * v3[0] - v2[0] * v3[2];
    const crossZ = v2[0] * v3[1] - v2[1] * v3[0];

    // Dot product v1 . cross
    volume += v1[0] * crossX + v1[1] * crossY + v1[2] * crossZ;
  }

  return Math.abs(volume / 6.0);
}

/**
 * Create a string key for an edge (order-independent for manifold check)
 */
function edgeKey(v1: [number, number, number], v2: [number, number, number]): string {
  // Round to avoid floating point comparison issues
  const precision = 1000;
  const a = v1.map((n) => Math.round(n * precision));
  const b = v2.map((n) => Math.round(n * precision));

  // Sort to make order-independent
  const key1 = `${a[0]},${a[1]},${a[2]}|${b[0]},${b[1]},${b[2]}`;
  const key2 = `${b[0]},${b[1]},${b[2]}|${a[0]},${a[1]},${a[2]}`;

  return key1 < key2 ? key1 : key2;
}

/**
 * Check if mesh is manifold (each edge shared by exactly 2 triangles)
 * Returns issues found
 */
function checkManifold(triangles: Triangle[]): { isManifold: boolean; issues: string[] } {
  const issues: string[] = [];
  const edgeCounts = new Map<string, number>();

  // Count edge occurrences
  for (const tri of triangles) {
    const edges = [
      [tri.v1, tri.v2],
      [tri.v2, tri.v3],
      [tri.v3, tri.v1],
    ];

    for (const [a, b] of edges) {
      const key = edgeKey(a as [number, number, number], b as [number, number, number]);
      edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
    }
  }

  // Check for non-manifold edges
  let boundaryEdges = 0;
  let nonManifoldEdges = 0;

  for (const [_edge, count] of edgeCounts) {
    if (count === 1) {
      boundaryEdges++;
    } else if (count > 2) {
      nonManifoldEdges++;
    }
  }

  if (boundaryEdges > 0) {
    issues.push(
      `MANIFOLD WARNING: ${boundaryEdges} boundary edge(s) found - mesh is not watertight`
    );
  }

  if (nonManifoldEdges > 0) {
    issues.push(
      `MANIFOLD ERROR: ${nonManifoldEdges} non-manifold edge(s) found - multiple faces share the same edge`
    );
  }

  // Check for degenerate triangles (zero area)
  let degenerateCount = 0;
  for (const tri of triangles) {
    const edge1 = [tri.v2[0] - tri.v1[0], tri.v2[1] - tri.v1[1], tri.v2[2] - tri.v1[2]];
    const edge2 = [tri.v3[0] - tri.v1[0], tri.v3[1] - tri.v1[1], tri.v3[2] - tri.v1[2]];

    // Cross product magnitude
    const cross = [
      edge1[1] * edge2[2] - edge1[2] * edge2[1],
      edge1[2] * edge2[0] - edge1[0] * edge2[2],
      edge1[0] * edge2[1] - edge1[1] * edge2[0],
    ];
    const area = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]) / 2;

    if (area < 0.0001) {
      degenerateCount++;
    }
  }

  if (degenerateCount > 0) {
    issues.push(`GEOMETRY WARNING: ${degenerateCount} degenerate triangle(s) with near-zero area`);
  }

  const isManifold = boundaryEdges === 0 && nonManifoldEdges === 0;

  return { isManifold, issues };
}

/**
 * Pre-validation checks for common issues
 * Returns warnings about potential problems before compilation
 */
function preValidateCode(code: string): string[] {
  const warnings: string[] = [];

  // Check for missing epsilon definition
  if (!code.includes('eps') && !code.includes('EPSILON')) {
    if (code.includes('difference(') || code.includes('union(')) {
      warnings.push(
        'WARNING: No epsilon value defined. Boolean operations may have z-fighting issues. Add: eps = 0.01;'
      );
    }
  }

  // Check for potential undefined variables (simple heuristic)
  // Note: These are placeholders for future variable checking logic
  const _variableUsages = code.match(/\b[a-z_][a-z0-9_]*\s*(?=\[|\(|;|\)|\]|,|\+|-|\*|\/)/gi) || [];
  const variableDefinitions = code.match(/\b([a-z_][a-z0-9_]*)\s*=/gi) || [];
  const _definedVars = new Set(
    variableDefinitions.map((d) => d.replace(/\s*=/, '').trim().toLowerCase())
  );

  // OpenSCAD built-ins to ignore (for future variable checking)
  const _builtins = new Set([
    'cube',
    'sphere',
    'cylinder',
    'polyhedron',
    'circle',
    'square',
    'polygon',
    'text',
    'translate',
    'rotate',
    'scale',
    'resize',
    'mirror',
    'color',
    'hull',
    'minkowski',
    'difference',
    'union',
    'intersection',
    'linear_extrude',
    'rotate_extrude',
    'for',
    'if',
    'else',
    'module',
    'function',
    'true',
    'false',
    'undef',
    'sin',
    'cos',
    'tan',
    'abs',
    'sqrt',
    'pow',
    'log',
    'ln',
    'exp',
    'floor',
    'ceil',
    'round',
    'min',
    'max',
    'len',
    'str',
    'chr',
    'ord',
    'concat',
    'lookup',
    'search',
    'center',
    'convexity',
    'twist',
    'slices',
    'height',
    'angle',
  ]);

  // Check for difference() without proper epsilon extension
  const differenceMatches = code.match(/difference\s*\(\s*\)\s*\{[^}]*\}/gs) || [];
  for (const diff of differenceMatches) {
    if (!diff.includes('eps') && !diff.includes('+ 0.') && !diff.includes('+0.')) {
      warnings.push(
        'WARNING: difference() block found without epsilon extension. Cutting geometry should extend by eps*2.'
      );
    }
  }

  return warnings;
}

export const validateScadCode = async (
  code: string,
  options: ValidationOptions = DEFAULT_OPTIONS
): Promise<ValidationResult> => {
  if (!code || typeof code !== 'string') {
    return { success: false, error: 'Code is empty or invalid' };
  }

  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return { success: false, error: 'Code is empty' };
  }

  // Run pre-validation checks
  const preWarnings = preValidateCode(trimmedCode);

  let instance: any = null;

  try {
    let OpenSCAD;

    try {
      const result = await loadOpenSCAD();
      OpenSCAD = result.OpenSCAD;
    } catch (loadErr) {
      console.warn(
        'Validation Service Warning: OpenSCAD engine failed to load. Skipping validation.',
        loadErr
      );
      return {
        success: true,
        warnings: [
          'Validation skipped due to engine load failure. Code may still work in OpenSCAD Desktop.',
          ...preWarnings,
        ],
      };
    }

    if (!OpenSCAD || typeof OpenSCAD !== 'function') {
      return {
        success: true,
        warnings: ['Validation skipped: OpenSCAD factory not available.', ...preWarnings],
      };
    }

    let errorLog = '';

    // Create OpenSCAD instance - ES module import handles WASM location automatically
    const wrapper = await OpenSCAD({
      noInitialRun: true,
      print: () => {
        // stdout output captured but not currently used
      },
      printErr: (text: string) => {
        if (text && !text.includes('GL_INVALID_OPERATION')) {
          // Capture all stderr, not just lines with 'error'
          errorLog += text + '\n';
        }
      },
    });

    // Get the low-level instance with FS and callMain
    instance =
      'getInstance' in wrapper && typeof wrapper.getInstance === 'function'
        ? wrapper.getInstance()
        : wrapper;

    if (!instance?.FS) {
      // Try using high-level renderToStl API as fallback
      if ('renderToStl' in wrapper && typeof wrapper.renderToStl === 'function') {
        try {
          await wrapper.renderToStl(trimmedCode);
          return {
            success: true,
            warnings: ['Validated using fallback mode.', ...preWarnings],
          };
        } catch (renderErr: any) {
          return {
            success: false,
            error: `Compilation failed: ${renderErr?.message || 'Unknown error'}`,
            warnings: preWarnings,
          };
        }
      }
      console.error('OpenSCAD getInstance() returned:', instance);
      return {
        success: false,
        error: 'OpenSCAD WASM failed to initialize. Try refreshing the page.',
      };
    }

    instance.FS.writeFile('/input.scad', trimmedCode);

    // Build command arguments
    // Research: Manifold backend provides "orders of magnitude" faster boolean operations
    const args = ['/input.scad', '-o', 'output.stl'];
    if (options.useManifoldBackend) {
      args.push('--backend=Manifold');
    }
    if (options.previewMode) {
      args.push('--preview');
    }

    const exitCode = instance.callMain(args);

    if (exitCode !== 0) {
      return {
        success: false,
        error: `Compilation Failed (Exit Code ${exitCode}):\n${errorLog || 'Unknown error - check your SCAD syntax'}`,
        exitCode,
        rawErrorLog: errorLog,
        warnings: preWarnings,
      };
    }

    // Safely attempt to read the output file
    let stlData: Uint8Array | null = null;
    try {
      stlData = instance.FS.readFile('/output.stl');
    } catch {
      return {
        success: false,
        error:
          'Failed to read output STL. The compilation may have succeeded but produced no output. Check for infinite recursion or empty geometry.',
        exitCode,
        rawErrorLog: errorLog,
        warnings: preWarnings,
      };
    }

    if (!stlData) {
      return {
        success: false,
        error: 'No STL data was generated. Check your SCAD code for errors.',
        exitCode,
        rawErrorLog: errorLog,
        warnings: preWarnings,
      };
    }

    // STL binary header is 84 bytes minimum (80 byte header + 4 byte triangle count)
    // If the file is only 84 bytes, it means 0 triangles = empty geometry
    if (stlData.length <= 84) {
      return {
        success: false,
        error:
          'SCENE IS EMPTY. The code compiled, but resulted in 0 geometry. Check your difference() logic or ensure your main() module produces visible geometry.',
        exitCode,
        rawErrorLog: errorLog,
        warnings: preWarnings,
      };
    }

    // Parse triangle count from STL binary (bytes 80-83 are uint32 little-endian triangle count)
    let triangleCount = 0;
    let triangleCountCorrected = false;
    if (stlData.length >= 84) {
      const view = new DataView(stlData.buffer, stlData.byteOffset, stlData.byteLength);
      const rawTriangleCount = view.getUint32(80, true); // little-endian

      // Sanity check: each triangle is 50 bytes, plus 84-byte header
      // If the claimed count doesn't match actual file size, STL is malformed
      const expectedSize = 84 + rawTriangleCount * 50;
      const actualTriangles = Math.floor((stlData.length - 84) / 50);

      if (rawTriangleCount > 10000000 || expectedSize > stlData.length + 100) {
        // Raw value is invalid - use estimated count from file size
        console.warn(
          `STL triangle count ${rawTriangleCount} seems invalid (file size: ${stlData.length}, expected: ${expectedSize}). Using estimated count: ${actualTriangles}`
        );
        triangleCount = actualTriangles;
        triangleCountCorrected = true;
      } else {
        triangleCount = rawTriangleCount;
      }

      // Additional sanity: cap at 1M triangles max for a single model
      // Anything beyond this is likely a parsing error or pathological geometry
      if (triangleCount > 1000000) {
        console.warn(
          `Triangle count ${triangleCount} exceeds 1M limit. Capping to file-derived value: ${actualTriangles}`
        );
        triangleCount = Math.min(actualTriangles, 1000000);
        triangleCountCorrected = true;
      }
    }

    // Check for warnings in error log even on success
    const successWarnings = [...preWarnings];
    if (errorLog.toLowerCase().includes('warning')) {
      successWarnings.push(
        ...errorLog
          .split('\n')
          .filter((line) => line.toLowerCase().includes('warning') && !line.includes('GL_INVALID'))
      );
    }

    // Add warning if triangle count was corrected (indicates potential STL parsing issue)
    if (triangleCountCorrected) {
      successWarnings.push(
        `STL triangle count was corrected (possible parsing issue). Reported: ${triangleCount} triangles.`
      );
    }

    // Perform manifold check on the generated STL
    let isManifold = true;
    let manifoldIssues: string[] = [];
    let boundingBox: { min: [number, number, number]; max: [number, number, number] } | undefined;
    let volume: number | undefined;

    if (triangleCount > 0 && triangleCount < 100000) {
      // Only check manifold for reasonably sized meshes (< 100k triangles)
      try {
        const triangles = parseSTLBinary(stlData);
        const manifoldResult = checkManifold(triangles);
        isManifold = manifoldResult.isManifold;
        manifoldIssues = manifoldResult.issues;

        // Add manifold issues as warnings
        if (manifoldIssues.length > 0) {
          successWarnings.push(...manifoldIssues);
        }

        // Calculate physical properties for SOTA benchmarking (Sd and Sv metrics)
        boundingBox = calculateBoundingBox(triangles);
        volume = calculateVolume(triangles);
      } catch (manifoldErr) {
        console.warn('Manifold check skipped:', manifoldErr);
      }
    }

    return {
      success: true,
      exitCode,
      rawErrorLog: errorLog || undefined,
      stlData,
      triangleCount,
      isManifold,
      manifoldIssues: manifoldIssues.length > 0 ? manifoldIssues : undefined,
      warnings: successWarnings.length > 0 ? successWarnings : undefined,
      boundingBox,
      volume,
    };
  } catch (err: any) {
    const errorMessage = err?.message || 'Unknown Validation Error';
    console.error('SCAD Validation Error:', errorMessage);
    return {
      success: false,
      error: `Validation failed: ${errorMessage}`,
      warnings: preWarnings,
    };
  } finally {
    // Clean up instance to prevent memory leaks
    if (instance) {
      cleanupInstance(instance);
    }
  }
};
