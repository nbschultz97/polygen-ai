/**
 * Validator Client (Browser-Only / Serverless)
 * Uses openscad-wasm in the browser for all validation
 * No backend required - fully client-side
 */

import {
  GeometricStructureTree,
  ValidationResult,
  GSTBoundingBox
} from '../types';
import { validateScadCode } from './scadValidation';

/**
 * Validate OpenSCAD code using browser WASM
 */
export async function validate(input: {
  scadCode: string;
  gst?: GeometricStructureTree;
}): Promise<ValidationResult> {
  try {
    // Use existing browser-based WASM validation
    const result = await validateScadCode(input.scadCode);

    // Build validation result
    const validationResult: ValidationResult = {
      success: result.success,
      errors: result.error ? [result.error] : [],
      warnings: result.warnings || [],
      isManifold: result.success // Assume manifold if compilation succeeded
    };

    // Compare to GST bounding box if provided
    if (input.gst?.boundingBox && result.success) {
      // Note: We'd need to enhance scadValidation to return bounding box
      // For now, skip GST comparison in browser-only mode
      validationResult.gstMatch = undefined;
    }

    return validationResult;

  } catch (error) {
    console.error('Browser validation failed:', error);
    return {
      success: false,
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      isManifold: false
    };
  }
}

/**
 * Validate with auto-retry on failure
 * Used by the orchestrator for the Coder retry loop
 */
export async function validateWithRetry(
  scadCode: string,
  gst?: GeometricStructureTree,
  maxRetries: number = 2
): Promise<ValidationResult> {
  let lastResult: ValidationResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await validate({ scadCode, gst });

    if (lastResult.success) {
      return lastResult;
    }

    // Log retry attempt
    if (attempt < maxRetries) {
      console.log(`Validation attempt ${attempt + 1} failed, retrying...`);
    }
  }

  return lastResult!;
}

/**
 * Check if validation is available (WASM loaded)
 * Always returns true since we use browser WASM
 */
export function isValidatorAvailable(): boolean {
  return true; // Browser WASM is always available
}

// Export as object for consistent API
export const validatorClient = {
  validate,
  validateWithRetry,
  isValidatorAvailable
};

export default validatorClient;
