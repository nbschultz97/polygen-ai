/**
 * Validator Client (Browser-Only / Serverless)
 * Uses openscad-wasm in the browser for all validation
 * Runs in Web Worker to keep UI responsive
 * No backend required - fully client-side
 */

import type { GeometricStructureTree, ValidationResult } from '../types';
import { workerValidationService } from './workerValidationService';

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

    // Compare to GST bounding box if provided
    if (input.gst?.boundingBox && result.success) {
      // Note: We'd need to enhance scadValidation to return bounding box
      // For now, skip GST comparison in browser-only mode
      validationResult.gstMatch = undefined;
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
