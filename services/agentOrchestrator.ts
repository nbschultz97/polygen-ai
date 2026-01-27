/**
 * Agent Orchestrator
 * Coordinates the multi-agent pipeline: Planner -> Coder -> Validator
 * Enhanced with closed-loop validation feedback for reliable code generation
 */

import { plannerService } from './plannerService';
import { coderService } from './coderService';
import { validatorClient } from './validatorClient';
import { analyzeForQuickFixes } from './quickFixAnalyzer';
import { previewImageService } from './previewImageService';
import { buildValidationFeedback } from './validationFeedbackBuilder';
import { getErrorSummary, categorizeErrors } from './errorCategorizer';
import { explainCode } from './codeExplainer';
import type {
  GeneratedAsset,
  GeometricStructureTree,
  ImageData,
  OrchestratorCallbacks,
  CodeHistoryEntry,
} from '../types';

const MAX_RETRY_ATTEMPTS = 3; // Increased from 2 for better error recovery

/**
 * Helper to add a history entry to an asset
 * Maintains undo/redo capability by tracking code versions
 */
function pushHistory(asset: GeneratedAsset, prompt: string): GeneratedAsset {
  if (!asset.scadCode) return asset;

  const entry: CodeHistoryEntry = {
    code: asset.scadCode,
    gst: asset.gst,
    prompt,
    timestamp: Date.now(),
  };

  const history = asset.history || [];
  const currentIndex = asset.currentHistoryIndex ?? -1;

  // If we're not at the end of history, truncate forward history (standard undo behavior)
  const newHistory =
    currentIndex >= 0 && currentIndex < history.length - 1
      ? [...history.slice(0, currentIndex + 1), entry]
      : [...history, entry];

  // Limit history to last 20 entries to prevent memory bloat
  const trimmedHistory = newHistory.slice(-20);

  return {
    ...asset,
    history: trimmedHistory,
    currentHistoryIndex: trimmedHistory.length - 1,
  };
}

/**
 * Navigate to a specific history index (for undo/redo)
 */
export function navigateHistory(asset: GeneratedAsset, index: number): GeneratedAsset | null {
  if (!asset.history || index < 0 || index >= asset.history.length) {
    return null;
  }

  const entry = asset.history[index];
  return {
    ...asset,
    scadCode: entry.code,
    gst: entry.gst,
    currentHistoryIndex: index,
  };
}

/**
 * Undo to previous history state
 */
export function undoHistory(asset: GeneratedAsset): GeneratedAsset | null {
  const currentIndex = asset.currentHistoryIndex ?? -1;
  if (currentIndex <= 0) return null;
  return navigateHistory(asset, currentIndex - 1);
}

/**
 * Redo to next history state
 */
export function redoHistory(asset: GeneratedAsset): GeneratedAsset | null {
  const currentIndex = asset.currentHistoryIndex ?? -1;
  const historyLength = asset.history?.length ?? 0;
  if (currentIndex >= historyLength - 1) return null;
  return navigateHistory(asset, currentIndex + 1);
}

export interface OrchestratorInput {
  userPrompt: string;
  imageData?: ImageData;
  existingAsset?: GeneratedAsset;
  conversationHistory?: string[];
  enableTeachingMode?: boolean; // Enable educational annotations
  isEdit?: boolean;
}

/**
 * Main orchestration function - runs the full multi-agent pipeline
 */
export async function orchestrateGeneration(
  input: OrchestratorInput,
  callbacks: OrchestratorCallbacks,
  abortSignal?: AbortSignal
): Promise<GeneratedAsset> {
  let asset: GeneratedAsset = input.existingAsset ? { ...input.existingAsset } : {};
  let attempts = 0;

  try {
    // ============================================
    // EDIT MODE: Skip Planner, go directly to Coder
    // ============================================
    if (input.isEdit && asset.gst && asset.scadCode) {
      console.log('Orchestrator: Edit mode - using symbolic correction');
      callbacks.onStepChange('coding');

      const coderOutput = await coderService.editCode(
        {
          existingGST: asset.gst,
          existingCode: asset.scadCode,
          editRequest: input.userPrompt,
        },
        abortSignal
      );

      if (abortSignal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      asset.scadCode = coderOutput.scadCode;
      callbacks.onCodeGenerated(coderOutput.scadCode);

      // Validate the edited code
      callbacks.onStepChange('validating');
      const validation = await validatorClient.validate({
        scadCode: coderOutput.scadCode,
        gst: asset.gst,
      });

      asset.validationResult = validation;
      callbacks.onValidationComplete(validation);

      // Generate smart fixes based on new state
      const smartFixes = analyzeForQuickFixes(asset.gst, validation, coderOutput.scadCode);
      asset.smartFixes = smartFixes;
      callbacks.onSmartFixesGenerated(smartFixes);

      // Apply teaching mode if enabled
      if (input.enableTeachingMode) {
        const explanation = explainCode(coderOutput.scadCode, true);
        asset.conceptsUsed = explanation.conceptsUsed;
        asset.learningTips = explanation.tips;
        asset.annotatedCode = explanation.enhancedCode;
      }

      // Track in history for undo capability
      asset = pushHistory(asset, input.userPrompt);

      callbacks.onStepChange('complete');
      return asset;
    }

    // ============================================
    // NEW GENERATION: Full Pipeline
    // ============================================

    // Step 1: Planner Agent generates GST
    console.log('Orchestrator: Starting Planner agent');
    callbacks.onStepChange('planning');

    const plannerOutput = await plannerService.generateGST(
      {
        userPrompt: input.userPrompt,
        imageData: input.imageData,
        conversationHistory: input.conversationHistory,
      },
      abortSignal
    );

    if (abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Handle clarification needed
    if (plannerOutput.needsClarification) {
      console.log('Orchestrator: Planner needs clarification');
      asset.clarifications = plannerOutput.clarifications;
      asset.spec = plannerOutput.partialSpec;
      callbacks.onStepChange('spec-review');
      return asset;
    }

    // Store GST and spec
    asset.gst = plannerOutput.gst;
    asset.spec = plannerOutput.spec;

    // Notify GST generated (with null check)
    if (plannerOutput.gst) {
      callbacks.onGSTGenerated(plannerOutput.gst);

      // Start preview image generation in parallel (non-blocking)
      previewImageService
        .generatePreviewImage(plannerOutput.gst, abortSignal)
        .then((imageUrl) => {
          if (imageUrl && !abortSignal?.aborted) {
            asset.previewImageUrl = imageUrl;
            callbacks.onPreviewImageGenerated?.(imageUrl);
            console.log('Orchestrator: Preview image generated');
          }
        })
        .catch((err) => {
          console.log('Orchestrator: Preview image skipped:', err.message);
        });
    }

    // Step 2: Coder Agent generates SCAD with enhanced error recovery
    console.log('Orchestrator: Starting Coder agent');
    callbacks.onStepChange('coding');

    while (attempts < MAX_RETRY_ATTEMPTS) {
      try {
        // Build coder input with enhanced feedback on retries
        const coderInput: { gst: GeometricStructureTree; validationErrors?: string[] } = {
          gst: asset.gst!,
        };

        // On retry, build comprehensive validation feedback
        if (attempts > 0 && asset.validationResult && asset.scadCode) {
          const feedback = buildValidationFeedback(
            asset.validationResult.errors,
            0, // exitCode - we don't have this currently, default to 0
            asset.scadCode,
            asset.gst!,
            attempts,
            MAX_RETRY_ATTEMPTS
          );

          // Log error categories for debugging
          console.log(
            `Orchestrator: Retry ${attempts} - Error categories: ${feedback.errorSummary}`
          );
          console.log(`Orchestrator: Applying pitfalls: ${feedback.pitfallsIncluded.join(', ')}`);

          // Pass the full prompt guidance as validation errors for now
          // The coder service will use this enhanced context
          coderInput.validationErrors = [feedback.promptGuidance];
        }

        const coderOutput = await coderService.generateCode(coderInput, abortSignal);

        if (abortSignal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        asset.scadCode = coderOutput.scadCode;
        callbacks.onCodeGenerated(coderOutput.scadCode);

        // Step 3: Validate
        console.log('Orchestrator: Validating code');
        callbacks.onStepChange('validating');

        const validation = await validatorClient.validate({
          scadCode: coderOutput.scadCode,
          gst: asset.gst,
        });

        asset.validationResult = validation;
        callbacks.onValidationComplete(validation);

        // Success!
        if (validation.success) {
          console.log(`Orchestrator: Validation passed on attempt ${attempts + 1}`);

          // Generate smart fixes
          const smartFixes = analyzeForQuickFixes(asset.gst!, validation, coderOutput.scadCode);
          asset.smartFixes = smartFixes;
          callbacks.onSmartFixesGenerated(smartFixes);

          // Apply teaching mode if enabled
          if (input.enableTeachingMode) {
            console.log('Orchestrator: Generating educational annotations');
            const explanation = explainCode(coderOutput.scadCode, true);
            asset.conceptsUsed = explanation.conceptsUsed;
            asset.learningTips = explanation.tips;
            asset.annotatedCode = explanation.enhancedCode;
          }

          // Track in history for undo capability
          asset = pushHistory(asset, input.userPrompt);

          callbacks.onStepChange('complete');
          return asset;
        }

        // Validation failed - analyze errors and retry
        const errorCategories = categorizeErrors(validation.errors, 0, coderOutput.scadCode);
        console.log(
          `Orchestrator: Validation failed (attempt ${attempts + 1}/${MAX_RETRY_ATTEMPTS})`
        );
        console.log(`Orchestrator: Errors: ${getErrorSummary(errorCategories)}`);

        attempts++;

        if (attempts < MAX_RETRY_ATTEMPTS) {
          callbacks.onStepChange('coding');
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }

        attempts++;
        console.error(`Orchestrator: Coder error (attempt ${attempts}):`, error);

        if (attempts >= MAX_RETRY_ATTEMPTS) {
          throw error;
        }

        callbacks.onStepChange('coding');
      }
    }

    // All retries exhausted - return with errors
    console.log('Orchestrator: Max retries reached');
    callbacks.onStepChange('complete');
    return asset;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    const step = asset.gst ? 'coding' : 'planning';
    callbacks.onError(error instanceof Error ? error : new Error(String(error)), step);
    throw error;
  }
}

/**
 * Check if the multi-agent pipeline is available
 * API keys are server-side only; availability determined by USE_MULTI_AGENT flag
 */
export function isMultiAgentAvailable(): boolean {
  // API keys are checked server-side in /api/gemini and /api/claude
  // Frontend just checks if multi-agent mode is enabled
  return process.env.USE_MULTI_AGENT === 'true';
}

/**
 * Get status of all agents (serverless - API keys are server-side)
 */
export function getAgentStatus(): {
  planner: { available: boolean; model: string };
  coder: { available: boolean; model: string };
  validator: { available: boolean };
} {
  return {
    planner: {
      available: true, // Actual availability checked server-side
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    },
    coder: {
      available: process.env.USE_MULTI_AGENT === 'true',
      model: process.env.CODER_MODEL || 'claude-sonnet-4-20250514',
    },
    validator: {
      available: true, // Browser WASM always available
    },
  };
}

// Export as object
export const agentOrchestrator = {
  orchestrateGeneration,
  isMultiAgentAvailable,
  getAgentStatus,
  undoHistory,
  redoHistory,
  navigateHistory,
};

export default agentOrchestrator;
