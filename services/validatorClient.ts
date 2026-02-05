/**
 * Validator Client (Browser-Only / Serverless)
 * Uses openscad-wasm in the browser for all validation
 * Runs in Web Worker to keep UI responsive
 * No backend required - fully client-side
 *
 * SOTA Active Critic: Implements Dimensional Accuracy (Sd) comparison
 * Source: "Code-Level Correction" - triggers retries on >20% dimension mismatch
 */

import type { GeometricStructureTree, GSTBoundingBox, ValidationResult } from '../types';
import { visualCriticService, type VisualCritiqueResult } from './visualCriticService';
import { workerValidationService } from './workerValidationService';

// SOTA Active Critic: Accuracy thresholds
// Sd < 0.8 means >20% mismatch - triggers retry with specific feedback
const DIMENSIONAL_ACCURACY_THRESHOLD = 0.8;
// Sv < 0.8 means >20% volume mismatch - triggers retry with scale feedback
const VOLUMETRIC_ACCURACY_THRESHOLD = 0.8;

/**
 * SOTA Active Critic: Calculate Volumetric Similarity (Sv)
 * Formula: Sv = 1 - |Vgen - Vtarget| / Vtarget
 * Where Vgen = generated volume, Vtarget = target volume
 *
 * Returns: { match: boolean, similarity: number, feedback: string[] }
 */
function _calculateVolumetricSimilarity(
  generatedVolume: number,
  targetVolume: number
): {
  match: boolean;
  similarity: number;
  feedback: string[];
} {
  const feedback: string[] = [];

  // Guard against zero/negative volumes
  if (targetVolume <= 0 || generatedVolume <= 0) {
    return { match: true, similarity: 1, feedback: [] };
  }

  // Calculate Sv: Sv = 1 - |Vgen - Vtarget| / Vtarget
  const sv = 1 - Math.abs(generatedVolume - targetVolume) / targetVolume;
  const match = sv >= VOLUMETRIC_ACCURACY_THRESHOLD;

  if (!match) {
    const pctOff = ((1 - sv) * 100).toFixed(1);
    const scaleFactor = (targetVolume / generatedVolume).toFixed(2);
    const direction = generatedVolume < targetVolume ? 'smaller' : 'larger';

    feedback.push(
      `VOLUMETRIC MISMATCH: Generated ${generatedVolume.toFixed(0)}mm³ vs Target ${targetVolume.toFixed(0)}mm³ (${pctOff}% ${direction}). ` +
        `Scale factor needed: ${scaleFactor}x.`
    );
    console.log(`Active Critic: Volumetric similarity failed. Sv=${sv.toFixed(2)}`);
  }

  return { match, similarity: sv, feedback };
}

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

// SOTA Vision ROI Gating thresholds
// Only trigger expensive Vision checks when outcome is uncertain
const VISION_ROI_LOW_THRESHOLD = 0.8; // Below this = clear fail, skip vision
const VISION_ROI_HIGH_THRESHOLD = 0.95; // Above this = clear pass, skip vision

/**
 * SOTA: Calculate Success Probability (P_succ)
 * Formula: P_succ = M * (0.65 * Sv + 0.35 * Sd)
 *
 * Where:
 * - M = manifold indicator (1 if manifold, 0 otherwise)
 * - Sv = volumetric similarity (0-1)
 * - Sd = dimensional similarity (min of x,y,z accuracies, 0-1)
 *
 * Used for Vision ROI Gating: only call Vision when 0.8 <= P_succ <= 0.95
 */
function calculatePsucc(isManifold: boolean, sv: number, sd: number): number {
  const M = isManifold ? 1 : 0;
  const pSucc = M * (0.65 * sv + 0.35 * sd);
  return Math.max(0, Math.min(1, pSucc)); // Clamp to [0, 1]
}

/**
 * Check if Vision critique is warranted based on P_succ ROI gating
 * Only trigger vision when outcome is uncertain (0.8 <= P_succ <= 0.95)
 */
function shouldTriggerVision(pSucc: number): { trigger: boolean; reason: string } {
  if (pSucc < VISION_ROI_LOW_THRESHOLD) {
    return {
      trigger: false,
      reason: `P_succ=${pSucc.toFixed(2)} < 0.8: Clear geometric fail, vision skipped`,
    };
  }
  if (pSucc > VISION_ROI_HIGH_THRESHOLD) {
    return {
      trigger: false,
      reason: `P_succ=${pSucc.toFixed(2)} > 0.95: Clear geometric pass, vision skipped`,
    };
  }
  return {
    trigger: true,
    reason: `P_succ=${pSucc.toFixed(2)} in [0.8, 0.95]: Uncertain, triggering vision`,
  };
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
  /** STL Remix: Binary STL data to mount in WASM FS for import() support */
  uploadedStlData?: Uint8Array;
}): Promise<ValidationResult> {
  try {
    // Preprocess code to fix common issues
    const { code: processedCode, fixes } = preprocessCode(input.scadCode);

    // Use Web Worker for validation (falls back to main thread if needed)
    const result = await workerValidationService.validate(
      processedCode,
      { useManifoldBackend: true, previewMode: false, uploadedStlData: input.uploadedStlData },
      input.abortSignal
    );

    // Validate bounding box data - reject corrupt values
    // WASM heap corruption can produce extreme values (e.g., 8.48e-33 to 1.86e+34)
    let validBoundingBox = result.boundingBox;
    if (validBoundingBox) {
      const allValues = [...validBoundingBox.min, ...validBoundingBox.max];
      const hasCorruptValues = allValues.some(
        (v) => !Number.isFinite(v) || Math.abs(v) > 10000 // 10m sanity limit
      );
      if (hasCorruptValues) {
        console.warn(
          'Active Critic: Bounding box has corrupt values, discarding:',
          validBoundingBox
        );
        validBoundingBox = undefined;
      }
    }

    // Build validation result
    const validationResult: ValidationResult = {
      success: result.success,
      errors: result.error ? [result.error] : [],
      warnings: [...(result.warnings || [])],
      isManifold: result.isManifold ?? result.success,
      triangleCount: result.triangleCount,
      volume: result.volume,
      boundingBox: validBoundingBox,
    };

    // Add preprocessing fixes as informational warnings
    if (fixes.length > 0 && result.success) {
      validationResult.warnings.push(...fixes.map((f) => `Auto-fix applied: ${f}`));
    }

    // Track overall GST match status
    let gstMatch = true;
    const criticFeedback: string[] = [];

    // SOTA P_succ scoring variables
    let sv = 1.0; // Default to perfect if no comparison possible
    let sd = 1.0; // Default to perfect if no comparison possible

    // SOTA Active Critic: Compare generated geometry to GST target dimensions
    // Implements Sd formula: Sd = 1 - |Dg - Dt| / Dg
    // Triggers retry on >20% mismatch (Sd < 0.8)
    if (input.gst?.boundingBox && validBoundingBox && result.success) {
      const dimCritic = calculateDimensionalAccuracy(validBoundingBox, input.gst.boundingBox);

      validationResult.gstDeviationPercent = dimCritic.maxDeviation;

      // Sd is the minimum of all axis accuracies
      sd = Math.min(dimCritic.deviations.x, dimCritic.deviations.y, dimCritic.deviations.z);
      validationResult.sd = sd;

      if (!dimCritic.match) {
        gstMatch = false;
        criticFeedback.push(...dimCritic.feedback);
        console.log('Active Critic: Triggering retry due to dimensional mismatch');
      } else {
        console.log(
          `Active Critic: Dimensions match (max deviation: ${dimCritic.maxDeviation.toFixed(1)}%)`
        );
      }
    }

    // SOTA Active Critic: Calculate Volumetric Similarity (Sv)
    if (input.gst?.boundingBox && validBoundingBox && result.success) {
      // Calculate dimensions for accuracy checks
      const genDims = [
        validBoundingBox.max[0] - validBoundingBox.min[0],
        validBoundingBox.max[1] - validBoundingBox.min[1],
        validBoundingBox.max[2] - validBoundingBox.min[2],
      ];
      const targetDims = [
        input.gst.boundingBox.max[0] - input.gst.boundingBox.min[0],
        input.gst.boundingBox.max[1] - input.gst.boundingBox.min[1],
        input.gst.boundingBox.max[2] - input.gst.boundingBox.min[2],
      ];

      const targetVolumeProxy = targetDims[0] * targetDims[1] * targetDims[2];

      // SOTA: Use mesh volume if available (fixes Hollow Box trap)
      const actualGenVolume = result.volume || genDims[0] * genDims[1] * genDims[2];
      const actualTargetVolume = targetVolumeProxy;

      if (actualTargetVolume > 0) {
        sv = 1 - Math.abs(actualGenVolume - actualTargetVolume) / actualTargetVolume;
        sv = Math.max(0, Math.min(1, sv));
        validationResult.sv = sv;
        console.log(
          `Active Critic: Sv=${sv.toFixed(2)} (gen=${actualGenVolume.toFixed(0)}mm³, target=${actualTargetVolume.toFixed(0)}mm³)`
        );
      }
    }

    // Log actual mesh volume if available
    if (result.volume && result.success) {
      console.log(`Active Critic: Mesh volume = ${result.volume.toFixed(0)}mm³`);
    }

    // SOTA: Calculate P_succ = M * (0.65 * Sv + 0.35 * Sd)
    const pSucc = calculatePsucc(validationResult.isManifold, sv, sd);
    validationResult.pSucc = pSucc;
    console.log(
      `Active Critic: P_succ=${pSucc.toFixed(2)} (M=${validationResult.isManifold ? 1 : 0}, Sv=${sv.toFixed(2)}, Sd=${sd.toFixed(2)})`
    );

    // If any critic failed OR P_succ is too low, mark as failed and add feedback
    const isPsuccFail = pSucc < 0.8 && result.success;

    if ((!gstMatch || isPsuccFail) && result.success) {
      validationResult.success = false;
      if (isPsuccFail) {
        criticFeedback.push(
          `SOTA QUALITY GATE FAILED: P_succ=${pSucc.toFixed(2)} (Required: 0.8). Volumetric similarity (${sv.toFixed(2)}) or dimensional accuracy (${sd.toFixed(2)}) is insufficient.`
        );
      }
      validationResult.errors.push(...criticFeedback);
      console.log(`Active Critic: Quality gate rejected model with P_succ=${pSucc.toFixed(2)}`);
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

/**
 * SOTA Visual Critic: Validate with visual feedback loop
 * Extended validation that includes Claude Vision analysis of rendered model
 *
 * @param input Standard validation input
 * @param renderScreenshot Base64 PNG of rendered model (optional)
 * @param originalRequest User's original request for comparison
 */
export async function validateWithVisualCritic(
  input: {
    scadCode: string;
    gst?: GeometricStructureTree;
    abortSignal?: AbortSignal;
  },
  renderScreenshot?: string,
  originalRequest?: string,
  options?: { forceVision?: boolean } // Allow forcing vision for testing
): Promise<ValidationResult & { visualCritique?: VisualCritiqueResult; visionSkipped?: boolean }> {
  // First, run standard geometric validation
  const geometricResult = await validate(input);

  // If geometric validation failed, return early
  if (!geometricResult.success) {
    return geometricResult;
  }

  // If no screenshot provided, skip visual critique
  if (!renderScreenshot || !originalRequest) {
    return geometricResult;
  }

  // SOTA Vision ROI Gating: Only trigger vision when P_succ is between 0.8 and 0.95
  // This saves expensive VLM calls when the outcome is already clear
  const pSucc = geometricResult.pSucc ?? 1.0;
  const visionDecision = shouldTriggerVision(pSucc);

  if (!visionDecision.trigger && !options?.forceVision) {
    console.log(`Vision ROI Gating: ${visionDecision.reason}`);
    return {
      ...geometricResult,
      visionSkipped: true,
      warnings: [...geometricResult.warnings, `[Vision] ${visionDecision.reason}`],
    };
  }

  // Run visual critique
  console.log(`Running Visual Critic analysis... (P_succ=${pSucc.toFixed(2)})`);
  const visualCritique = await visualCriticService.critiqueRender(
    renderScreenshot,
    originalRequest,
    input.abortSignal
  );

  // If visual critique finds issues, add them as errors
  if (!visualCritique.approved && visualCriticService.needsRegeneration(visualCritique)) {
    const visualErrors = visualCriticService.generateCritiqueFeedback(visualCritique);
    console.log(`Visual Critic found ${visualErrors.length} issues requiring regeneration`);

    return {
      ...geometricResult,
      success: false,
      errors: [...geometricResult.errors, ...visualErrors],
      warnings: [...geometricResult.warnings, ...visualCritique.suggestions],
      visualCritique,
    };
  }

  // Visual critique passed or found only minor issues
  if (visualCritique.issues.length > 0) {
    console.log(`Visual Critic found ${visualCritique.issues.length} minor issues (not blocking)`);
    return {
      ...geometricResult,
      warnings: [
        ...geometricResult.warnings,
        ...visualCritique.issues.map((i) => `[Visual] ${i.description}`),
      ],
      visualCritique,
    };
  }

  console.log('Visual Critic: Model approved');
  return {
    ...geometricResult,
    visualCritique,
  };
}

// Export as object for consistent API
export const validatorClient = {
  validate,
  validateWithVisualCritic,
  isValidatorAvailable,
  isUsingWorker,
  // Re-export visual critic utilities
  captureCanvasScreenshot: visualCriticService.captureCanvasScreenshot,
};

export default validatorClient;
