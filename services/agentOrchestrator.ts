/**
 * Agent Orchestrator
 * Coordinates the multi-agent pipeline: Planner -> Coder -> Validator
 */

import { plannerService } from './plannerService';
import { coderService } from './coderService';
import { validatorClient } from './validatorClient';
import { analyzeForQuickFixes } from './quickFixAnalyzer';
import {
  GeneratedAsset,
  GeometricStructureTree,
  ValidationResult,
  WorkflowStep,
  SmartQuickFix,
  ImageData,
  OrchestratorCallbacks
} from '../types';

const MAX_RETRY_ATTEMPTS = 2;

export interface OrchestratorInput {
  userPrompt: string;
  imageData?: ImageData;
  existingAsset?: GeneratedAsset;
  conversationHistory?: string[];
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

      const coderOutput = await coderService.editCode({
        existingGST: asset.gst,
        existingCode: asset.scadCode,
        editRequest: input.userPrompt
      }, abortSignal);

      if (abortSignal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      asset.scadCode = coderOutput.scadCode;
      callbacks.onCodeGenerated(coderOutput.scadCode);

      // Validate the edited code
      callbacks.onStepChange('validating');
      const validation = await validatorClient.validate({
        scadCode: coderOutput.scadCode,
        gst: asset.gst
      });

      asset.validationResult = validation;
      callbacks.onValidationComplete(validation);

      // Generate smart fixes based on new state
      const smartFixes = analyzeForQuickFixes(asset.gst, validation, coderOutput.scadCode);
      asset.smartFixes = smartFixes;
      callbacks.onSmartFixesGenerated(smartFixes);

      callbacks.onStepChange('complete');
      return asset;
    }

    // ============================================
    // NEW GENERATION: Full Pipeline
    // ============================================

    // Step 1: Planner Agent generates GST
    console.log('Orchestrator: Starting Planner agent');
    callbacks.onStepChange('planning');

    const plannerOutput = await plannerService.generateGST({
      userPrompt: input.userPrompt,
      imageData: input.imageData,
      conversationHistory: input.conversationHistory
    }, abortSignal);

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
    callbacks.onGSTGenerated(plannerOutput.gst!);

    // Step 2: Coder Agent generates SCAD
    console.log('Orchestrator: Starting Coder agent');
    callbacks.onStepChange('coding');

    while (attempts < MAX_RETRY_ATTEMPTS) {
      try {
        const coderOutput = await coderService.generateCode({
          gst: asset.gst!,
          validationErrors: attempts > 0 ? asset.validationResult?.errors : undefined
        }, abortSignal);

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
          gst: asset.gst
        });

        asset.validationResult = validation;
        callbacks.onValidationComplete(validation);

        // Success!
        if (validation.success) {
          console.log('Orchestrator: Validation passed');

          // Generate smart fixes
          const smartFixes = analyzeForQuickFixes(asset.gst!, validation, coderOutput.scadCode);
          asset.smartFixes = smartFixes;
          callbacks.onSmartFixesGenerated(smartFixes);

          callbacks.onStepChange('complete');
          return asset;
        }

        // Validation failed - retry with error context
        console.log(`Orchestrator: Validation failed (attempt ${attempts + 1}), retrying...`);
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
 * Requires both Gemini and Anthropic API keys
 */
export function isMultiAgentAvailable(): boolean {
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.API_KEY);
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;

  return hasGemini && hasClaude;
}

/**
 * Get status of all agents (serverless - all browser-based)
 */
export function getAgentStatus(): {
  planner: { available: boolean; model: string };
  coder: { available: boolean; model: string };
  validator: { available: boolean };
} {
  return {
    planner: {
      available: !!(process.env.GEMINI_API_KEY || process.env.API_KEY),
      model: process.env.GEMINI_MODEL || 'gemini-3-pro-preview'
    },
    coder: {
      available: coderService.isCoderAvailable(),
      model: process.env.CODER_MODEL || 'claude-sonnet-4-20250514'
    },
    validator: {
      available: true // Browser WASM always available
    }
  };
}

// Export as object
export const agentOrchestrator = {
  orchestrateGeneration,
  isMultiAgentAvailable,
  getAgentStatus
};

export default agentOrchestrator;
