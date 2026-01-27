/**
 * Validator Client (Browser-Only / Serverless)
 * Uses openscad-wasm in the browser for all validation
 * Runs in Web Worker to keep UI responsive
 * No backend required - fully client-side
 *
 * SOTA Active Critic: Implements Dimensional Accuracy (Sd) comparison
 * Source: "Code-Level Correction" - triggers retries on >20% dimension mismatch
 */

import type { GeometricStructureTree, ValidationResult, GSTBoundingBox } from '../types';
import { workerValidationService } from './workerValidationService';

// SOTA Active Critic: Dimensional accuracy threshold
// Sd < 0.8 means >20% mismatch - triggers retry with specific feedback
const DIMENSIONAL_ACCURACY_THRESHOLD = 0.8;

/**
 * SOTA Active Critic: Calculate Dimensional Accuracy (Sd)
 * Formula: Sd = 1 - |Dg - Dt| / Dg
 * Where Dg = generated dimension, Dt = target dimension
 *
 * Returns: { match: boolean, maxDeviation: number, deviations: { x, y, z } }
 */
function calculateDimensionalAccuracy(
  generatedBox: GSTBoundingBox,
  targetBox: GSTBoundingBox
): {
  match: boolean;
  maxDeviation: number;
  deviations: { x: number; y: number; z: number };
  feedback: string[];
} {
  const feedback: string[] = [];

  // Calculate dimensions from bounding boxes
  const genDims = {
    x: generatedBox.max[0] - generatedBox.min[0],
    y: generatedBox.max[1] - generatedBox.min[1],
    z: generatedBox.max[2] - generatedBox.min[2],
  };

  const targetDims = {
    x: targetBox.max[0] - targetBox.min[0],
    y: targetBox.max[1] - targetBox.min[1],
    z: targetBox.max[2] - targetBox.min[2],
  };

  // Calculate Sd for each axis: Sd = 1 - |Dg - Dt| / Dg
  // Guard against division by zero (use target as fallback)
  const calcSd = (gen: number, target: number): number => {
    const denominator = gen > 0 ? gen : target > 0 ? target : 1;
    return 1 - Math.abs(gen - target) / denominator;
  };

  const deviations = {
    x: calcSd(genDims.x, targetDims.x),
    y: calcSd(genDims.y, targetDims.y),
    z: calcSd(genDims.z, targetDims.z),
  };

  // Find worst deviation
  const minSd = Math.min(deviations.x, deviations.y, deviations.z);
  const maxDeviation = (1 - minSd) * 100; // Convert to percentage

  // Generate specific feedback for mismatches
  const dimValues = [
    { axis: 'X', gen: genDims.x, target: targetDims.x, sd: deviations.x },
    { axis: 'Y', gen: genDims.y, target: targetDims.y, sd: deviations.y },
    { axis: 'Z', gen: genDims.z, target: targetDims.z, sd: deviations.z },
  ];

  for (const dim of dimValues) {
    if (dim.sd < DIMENSIONAL_ACCURACY_THRESHOLD) {
      const pct = ((1 - dim.sd) * 100).toFixed(1);
      feedback.push(
        `DIMENSIONAL MISMATCH (${dim.axis}): Generated ${dim.gen.toFixed(1)}mm vs Target ${dim.target.toFixed(1)}mm (${pct}% off). ` +
          `Adjust ${dim.axis.toLowerCase()} dimension by ${(dim.target - dim.gen).toFixed(1)}mm.`
      );
    }
  }

  const match = minSd >= DIMENSIONAL_ACCURACY_THRESHOLD;

  if (!match) {
    console.log(
      `Active Critic: Dimensional accuracy failed. Sd scores: X=${deviations.x.toFixed(2)}, Y=${deviations.y.toFixed(2)}, Z=${deviations.z.toFixed(2)}`
    );
  }

  return { match, maxDeviation, deviations, feedback };
}

/**
 * Auto-inject epsilon if missing from code with boolean operations
 */
function injectEpsilonIfMissing(code: string): string {
  // Check if epsilon is already defined
  const hasEps = /\beps\s*=/.test(code) || /\bEPSILON\s*=/.test(code);

  // Check if boolean operations are used
  const hasBooleans = /\b(difference|union|intersection)\s*\(/.test(code);

  if (!hasEps && hasBooleans) {
    // Inject epsilon at the beginning of the code
    const epsDeclaration = '// Auto-injected epsilon for clean boolean operations\neps = 0.01;\n\n';
    return epsDeclaration + code;
  }

  return code;
}

/**
 * Auto-fix common issues in generated code before validation
 */
function preprocessCode(code: string): { code: string; fixes: string[] } {
  const fixes: string[] = [];
  let processedCode = code;

  // 1. Inject epsilon if missing
  const withEps = injectEpsilonIfMissing(processedCode);
  if (withEps !== processedCode) {
    processedCode = withEps;
    fixes.push('Added epsilon (eps = 0.01) for boolean operations');
  }

  // 2. Ensure $fn is set for curved surfaces
  const hasCurves = /\b(sphere|cylinder|circle|rotate_extrude)\s*\(/.test(processedCode);
  const hasFn = /\$fn\s*=/.test(processedCode);

  if (hasCurves && !hasFn) {
    // Insert $fn after eps declaration or at the beginning
    if (processedCode.includes('eps = 0.01;')) {
      processedCode = processedCode.replace(
        'eps = 0.01;',
        'eps = 0.01;\n$fn = 64; // Smooth curves'
      );
    } else {
      processedCode = '// Auto-injected quality setting\n$fn = 64;\n\n' + processedCode;
    }
    fixes.push('Added $fn = 64 for smooth curved surfaces');
  }

  return { code: processedCode, fixes };
}

/**
 * Validate OpenSCAD code using Web Worker (or main thread fallback)
 * Keeps UI responsive during 1-5s WASM compilation
 */
export async function validate(input: {
  scadCode: string;
  gst?: GeometricStructureTree;
  abortSignal?: AbortSignal;
}): Promise<ValidationResult> {
  try {
    // Preprocess code to fix common issues
    const { code: processedCode, fixes } = preprocessCode(input.scadCode);

    // Use Web Worker for validation (falls back to main thread if needed)
    const result = await workerValidationService.validate(
      processedCode,
      { useManifoldBackend: true, previewMode: false },
      input.abortSignal
    );

    // Build validation result
    const validationResult: ValidationResult = {
      success: result.success,
      errors: result.error ? [result.error] : [],
      warnings: [...(result.warnings || [])],
      isManifold: result.isManifold ?? result.success,
      triangleCount: result.triangleCount,
    };

    // Add preprocessing fixes as informational warnings
    if (fixes.length > 0 && result.success) {
      validationResult.warnings.push(...fixes.map((f) => `Auto-fix applied: ${f}`));
    }

    // SOTA Active Critic: Compare generated geometry to GST target dimensions
    // Implements Sd formula: Sd = 1 - |Dg - Dt| / Dg
    // Triggers retry on >20% mismatch (Sd < 0.8)
    if (input.gst?.boundingBox && result.boundingBox && result.success) {
      const critic = calculateDimensionalAccuracy(result.boundingBox, input.gst.boundingBox);

      validationResult.gstMatch = critic.match;
      validationResult.gstDeviationPercent = critic.maxDeviation;
      validationResult.boundingBox = result.boundingBox;

      if (!critic.match) {
        // Add dimensional mismatch as errors to trigger retry
        // This enables "Code-Level Correction" - the coder will receive
        // specific feedback about which dimensions need adjustment
        validationResult.success = false;
        validationResult.errors.push(...critic.feedback);
        console.log('Active Critic: Triggering retry due to dimensional mismatch');
      } else {
        console.log(
          `Active Critic: Dimensions match (max deviation: ${critic.maxDeviation.toFixed(1)}%)`
        );
      }
    } else if (result.boundingBox) {
      // No target to compare, just store the generated bounding box
      validationResult.boundingBox = result.boundingBox;
    }

    return validationResult;
  } catch (error) {
    // Re-throw abort errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    console.error('Browser validation failed:', error);
    return {
      success: false,
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      isManifold: false,
    };
  }
}

/**
 * Check if validation is available
 * Returns true if Worker is available or fallback is possible
 */
export function isValidatorAvailable(): boolean {
  return true; // Worker or main thread fallback always available
}

/**
 * Check if Worker validation is being used (vs main thread fallback)
 */
export function isUsingWorker(): boolean {
  return workerValidationService.isAvailable();
}

// Export as object for consistent API
export const validatorClient = {
  validate,
  isValidatorAvailable,
  isUsingWorker,
};

export default validatorClient;
