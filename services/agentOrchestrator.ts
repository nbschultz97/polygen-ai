/**
 * Agent Orchestrator
 * Supports two pipelines:
 * 1. UNIFIED (default): Single Claude call for planning + coding
 * 2. MULTI-AGENT: Separate Gemini (planner) + Claude (coder) calls
 *
 * Unified pipeline is faster and more reliable (no translation loss)
 */

import { plannerService } from './plannerService';
import { coderService } from './coderService';
import { unifiedGeneratorService } from './unifiedGeneratorService';
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

// Use multi-agent pipeline by default for better success rate (75% vs 44%)
// Research shows GST intermediate format significantly improves complex designs
// For Vite builds, use import.meta.env; for Node, use process.env
const USE_UNIFIED_ONLY =
  typeof import.meta !== 'undefined'
    ? (import.meta as any).env?.VITE_USE_UNIFIED_PIPELINE === 'true'
    : process.env.USE_UNIFIED_PIPELINE === 'true';
const USE_UNIFIED_PIPELINE = USE_UNIFIED_ONLY;
const USE_MULTI_AGENT = !USE_UNIFIED_ONLY;

const MAX_RETRY_ATTEMPTS = 3; // Increased from 2 for better error recovery

/**
 * Detect if user is fundamentally unhappy and needs complete redesign
 * These phrases indicate edit mode should be bypassed for full regeneration
 * Exported for testing
 */
export function needsFullRegeneration(prompt: string): boolean {
  const redesignPhrases = [
    /not right/i,
    /completely wrong/i,
    /doesn'?t look right/i,
    /try again/i,
    /start over/i,
    /from scratch/i,
    /redo/i,
    /regenerate/i,
    /wrong (design|shape|model)/i,
    /that'?s not what/i,
    /not what i (asked|wanted|meant)/i,
    /nothing like/i,
    /totally different/i,
    /all wrong/i,
    /way off/i,
  ];
  return redesignPhrases.some((pattern) => pattern.test(prompt));
}

// ============================================================================
// SOTA Interrogator - Force clarification for under-specified complex requests
// ============================================================================

// Complex mechanical part keywords that require detailed specs
const COMPLEX_PART_KEYWORDS = [
  'gear',
  'thread',
  'screw thread',
  'metric thread',
  'hinge',
  'mechanism',
  'rack and pinion',
  'worm',
  'helical',
  'bevel',
  'sprocket',
  'cam',
  'linkage',
  'bearing',
  'bushing',
  'snap fit',
  'living hinge',
  'ball joint',
];

// Minimum word count for complex parts (below this = needs clarification)
const MIN_WORDS_FOR_COMPLEX = 20;

/**
 * SOTA Interrogator: Detect under-specified complex requests
 *
 * Forces clarification when:
 * 1. Prompt is short (< 20 words) AND
 * 2. Contains complex mechanical part keywords
 *
 * Returns clarification questions to ask, or null if no clarification needed
 */
export function interrogatePrompt(prompt: string): {
  needsClarification: boolean;
  partType: string;
  questions: Array<{ question: string; suggestions: string[] }>;
} | null {
  const words = prompt.trim().split(/\s+/).length;

  // Only interrogate short prompts
  if (words >= MIN_WORDS_FOR_COMPLEX) {
    return null;
  }

  // Check for complex part keywords
  const lowerPrompt = prompt.toLowerCase();
  const matchedKeyword = COMPLEX_PART_KEYWORDS.find((kw) => lowerPrompt.includes(kw));

  if (!matchedKeyword) {
    return null;
  }

  console.log(
    `Interrogator: Detected under-specified complex part "${matchedKeyword}" (${words} words < ${MIN_WORDS_FOR_COMPLEX})`
  );

  // Generate context-specific clarification questions
  const questions = generateInterrogatorQuestions(matchedKeyword);

  return {
    needsClarification: true,
    partType: matchedKeyword,
    questions,
  };
}

/**
 * Generate clarification questions based on the type of complex part
 */
function generateInterrogatorQuestions(
  partType: string
): Array<{ question: string; suggestions: string[] }> {
  const commonQuestions = [
    {
      question: 'What are the overall dimensions?',
      suggestions: ['Small (< 50mm)', 'Medium (50-100mm)', 'Large (> 100mm)', 'Custom...'],
    },
  ];

  switch (partType) {
    case 'gear':
      return [
        {
          question: 'What type of gear do you need?',
          suggestions: ['Spur gear', 'Helical gear', 'Bevel gear', 'Rack and pinion'],
        },
        {
          question: 'How many teeth?',
          suggestions: ['12 teeth', '24 teeth', '36 teeth', 'Custom...'],
        },
        {
          question: 'What module (tooth size)?',
          suggestions: ['Module 1 (small)', 'Module 2 (medium)', 'Module 3 (large)', 'Custom...'],
        },
        {
          question: 'What is the bore (center hole) diameter?',
          suggestions: ['5mm', '8mm', '10mm', 'No hole'],
        },
      ];

    case 'thread':
    case 'screw thread':
    case 'metric thread':
      return [
        {
          question: 'What thread size?',
          suggestions: ['M3', 'M4', 'M5', 'M6', 'M8', 'Custom...'],
        },
        {
          question: 'Thread type?',
          suggestions: ['External (bolt)', 'Internal (nut)', 'Both (threaded rod)'],
        },
        {
          question: 'Thread length?',
          suggestions: ['10mm', '20mm', '30mm', 'Custom...'],
        },
      ];

    case 'hinge':
    case 'living hinge':
      return [
        {
          question: 'What type of hinge?',
          suggestions: ['Living hinge (flexible)', 'Pin hinge (separate parts)', 'Piano hinge'],
        },
        {
          question: 'How wide should the hinge be?',
          suggestions: ['20mm', '40mm', '60mm', 'Custom...'],
        },
        {
          question: 'What angle range is needed?',
          suggestions: ['90° (door)', '180° (fold flat)', '270° (wrap around)'],
        },
      ];

    case 'mechanism':
    case 'linkage':
      return [
        {
          question: 'What should this mechanism do?',
          suggestions: ['Linear motion', 'Rotary motion', 'Oscillating motion', 'Custom...'],
        },
        {
          question: 'What are the input and output?',
          suggestions: ['Manual input', 'Motor driven', 'Spring loaded'],
        },
        ...commonQuestions,
      ];

    case 'snap fit':
      return [
        {
          question: 'What type of snap fit?',
          suggestions: ['Cantilever (most common)', 'Annular (ring)', 'Torsional'],
        },
        {
          question: 'Should it be permanent or removable?',
          suggestions: ['Permanent', 'Removable (easy release)', 'Semi-permanent'],
        },
        {
          question: 'Wall thickness of mating parts?',
          suggestions: ['1.5mm', '2mm', '3mm', 'Custom...'],
        },
      ];

    case 'bearing':
    case 'bushing':
      return [
        {
          question: 'What shaft diameter?',
          suggestions: ['5mm', '8mm', '10mm', 'Custom...'],
        },
        {
          question: 'Bearing type?',
          suggestions: ['Plain bushing', 'Ball bearing race', 'Flanged'],
        },
        ...commonQuestions,
      ];

    default:
      return [
        {
          question: `What specific features do you need for the ${partType}?`,
          suggestions: ['Standard design', 'Heavy duty', 'Compact', 'Custom...'],
        },
        ...commonQuestions,
        {
          question: 'What material will you print this in?',
          suggestions: ['PLA', 'PETG', 'ABS', 'Nylon'],
        },
      ];
  }
}

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
 * Main orchestration function - uses unified or multi-agent pipeline
 * SOTA Complexity Router: Forces Multi-Agent (GST) pipeline for complex designs
 * SOTA Interrogator: Forces clarification for under-specified complex requests
 * Source: Sadik et al. (2025) - GST improves fidelity from 44.6% to 75.6%
 */
export async function orchestrateGeneration(
  input: OrchestratorInput,
  callbacks: OrchestratorCallbacks,
  abortSignal?: AbortSignal
): Promise<GeneratedAsset> {
  // SOTA Interrogator: Force clarification for under-specified complex requests
  // If prompt is short (< 20 words) AND contains complex part keywords,
  // return clarification questions before attempting generation
  if (!input.isEdit && !input.existingAsset?.scadCode) {
    const interrogation = interrogatePrompt(input.userPrompt);
    if (interrogation) {
      console.log(
        `Orchestrator: Interrogator triggered for under-specified "${interrogation.partType}"`
      );

      // Return asset with clarification questions
      const asset: GeneratedAsset = {
        clarifications: interrogation.questions,
        specSummary: [`Complex ${interrogation.partType} - awaiting specifications`],
      };

      callbacks.onStepChange('spec-review');
      return asset;
    }
  }

  // SOTA Complexity Router: Detect complex requests that need structural planning
  // These keywords indicate designs that benefit from GST intermediate format
  // Semantic complexity detection:
  // - "assembly", "parts": Explicit multi-object request
  // - "mechanism", "gear", "hinge": Functional parts needing precise fit
  // - "housing", "enclosure", "case": Complex internal volumes
  // - "bracket", "mount", "adapter", "joint": Constraint-driven geometry
  // - "picatinny", "molle", "rail": Tactical equipment with MIL-STD specs
  // - "multi": Explicit request for multiple items
  const complexityKeywords =
    /assembly|parts|mechanism|gear|hinge|housing|enclosure|case|bracket|mount|adapter|joint|contact|fit|connect|multi|picatinny|molle|rail/i;
  const isComplexAssembly = complexityKeywords.test(input.userPrompt);

  // Force multi-agent if complex, overriding default unified pipeline
  // RATIONALE: This fixes the "Picatinny Adapter" failure case by ensuring
  // a structural plan (GST) is created before coding
  if (USE_UNIFIED_PIPELINE && isComplexAssembly) {
    console.log(
      'Orchestrator: Complex request detected - switching to high-fidelity Multi-Agent pipeline (GST-enforced)'
    );
    console.log(
      `Orchestrator: Matched complexity keywords in: "${input.userPrompt.slice(0, 100)}..."`
    );
    return orchestrateMultiAgent(input, callbacks, abortSignal);
  }

  // Use unified pipeline by default (faster, more reliable for simple designs)
  if (USE_UNIFIED_PIPELINE) {
    return orchestrateUnified(input, callbacks, abortSignal);
  }

  // Fall back to multi-agent pipeline if configured
  return orchestrateMultiAgent(input, callbacks, abortSignal);
}

/**
 * Unified pipeline - single Claude call for planning + coding
 * Faster and more reliable (no GST translation overhead)
 */
async function orchestrateUnified(
  input: OrchestratorInput,
  callbacks: OrchestratorCallbacks,
  abortSignal?: AbortSignal
): Promise<GeneratedAsset> {
  let asset: GeneratedAsset = input.existingAsset ? { ...input.existingAsset } : {};
  let attempts = 0;

  try {
    console.log('Orchestrator: Using unified Claude pipeline');
    callbacks.onStepChange('coding');

    // Detect if user needs full redesign instead of edit
    const forceFullRegeneration = needsFullRegeneration(input.userPrompt);
    if (forceFullRegeneration && input.isEdit) {
      console.log('Orchestrator: Detected fundamental dissatisfaction - forcing full regeneration');
    }

    while (attempts < MAX_RETRY_ATTEMPTS) {
      try {
        const result = await unifiedGeneratorService.generate(
          {
            userPrompt: input.userPrompt,
            imageData: input.imageData,
            existingCode: forceFullRegeneration ? undefined : asset.scadCode,
            existingGST: forceFullRegeneration ? undefined : asset.gst,
            conversationHistory: input.conversationHistory,
            validationErrors: attempts > 0 ? asset.validationResult?.errors : undefined,
            isEdit: input.isEdit && !!asset.scadCode && !forceFullRegeneration,
            // Enable streaming if callback is provided
            onChunk: callbacks.onCodeChunk,
            useStreaming: !!callbacks.onCodeChunk,
          },
          abortSignal
        );

        if (abortSignal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        // Handle clarification needed
        if (result.needsClarification) {
          console.log('Orchestrator: Needs clarification');
          asset.clarifications = result.clarifications;
          callbacks.onStepChange('spec-review');
          return asset;
        }

        // Store generated GST if returned
        if (result.gst) {
          asset.gst = result.gst;
        }

        // Store generated code
        if (result.scadCode) {
          asset.scadCode = result.scadCode;
          callbacks.onCodeGenerated(result.scadCode);
        }

        // Validate
        console.log('Orchestrator: Validating code');
        callbacks.onStepChange('validating');

        const validation = await validatorClient.validate({
          scadCode: asset.scadCode!,
          gst: asset.gst,
        });

        asset.validationResult = validation;
        callbacks.onValidationComplete(validation);

        // Success!
        if (validation.success) {
          console.log(`Orchestrator: Validation passed on attempt ${attempts + 1}`);

          // Generate smart fixes
          if (asset.gst) {
            const smartFixes = analyzeForQuickFixes(asset.gst, validation, asset.scadCode!);
            asset.smartFixes = smartFixes;
            callbacks.onSmartFixesGenerated(smartFixes);

            // Start preview image generation in parallel (non-blocking)
            previewImageService
              .generatePreviewImage(asset.gst, abortSignal)
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

          // Apply teaching mode if enabled
          if (input.enableTeachingMode && asset.scadCode) {
            console.log('Orchestrator: Generating educational annotations');
            const explanation = explainCode(asset.scadCode, true);
            asset.conceptsUsed = explanation.conceptsUsed;
            asset.learningTips = explanation.tips;
            asset.annotatedCode = explanation.enhancedCode;
          }

          // Track in history
          asset = pushHistory(asset, input.userPrompt);

          callbacks.onStepChange('complete');
          return asset;
        }

        // Validation failed - retry
        const errorCategories = categorizeErrors(validation.errors, 0, asset.scadCode!);
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
        console.error(`Orchestrator: Error (attempt ${attempts}):`, error);

        if (attempts >= MAX_RETRY_ATTEMPTS) {
          throw error;
        }

        callbacks.onStepChange('coding');
      }
    }

    // All retries exhausted
    console.log('Orchestrator: Max retries reached');
    callbacks.onStepChange('complete');
    return asset;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    callbacks.onError(error instanceof Error ? error : new Error(String(error)), 'coding');
    throw error;
  }
}

/**
 * Multi-agent pipeline - Gemini (planner) + Claude (coder)
 * Legacy mode, used when USE_MULTI_AGENT=true
 */
async function orchestrateMultiAgent(
  input: OrchestratorInput,
  callbacks: OrchestratorCallbacks,
  abortSignal?: AbortSignal
): Promise<GeneratedAsset> {
  let asset: GeneratedAsset = input.existingAsset ? { ...input.existingAsset } : {};
  let attempts = 0;

  try {
    // ============================================
    // EDIT MODE: Skip Planner, go directly to Coder
    // UNLESS user is fundamentally unhappy (needs full redesign)
    // ============================================
    const forceFullRegeneration = needsFullRegeneration(input.userPrompt);
    if (forceFullRegeneration && input.isEdit) {
      console.log('Orchestrator: Detected fundamental dissatisfaction - bypassing edit mode');
    }

    if (input.isEdit && asset.gst && asset.scadCode && !forceFullRegeneration) {
      console.log('Orchestrator: Edit mode - using symbolic correction');
      callbacks.onStepChange('coding');

      // Pass previous validation errors if available to help the coder fix issues
      const validationErrors =
        asset.validationResult && !asset.validationResult.success
          ? asset.validationResult.errors
          : undefined;

      const coderOutput = await coderService.editCode(
        {
          existingGST: asset.gst,
          existingCode: asset.scadCode,
          editRequest: input.userPrompt,
          validationErrors,
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
  // Multi-agent is now the default for better success rate
  return USE_MULTI_AGENT;
}

/**
 * Check if using unified pipeline
 */
export function isUnifiedPipeline(): boolean {
  return USE_UNIFIED_PIPELINE;
}

/**
 * Get status of all agents (serverless - API keys are server-side)
 */
export function getAgentStatus(): {
  pipeline: 'unified' | 'multi-agent';
  planner: { available: boolean; model: string };
  coder: { available: boolean; model: string };
  validator: { available: boolean };
} {
  return {
    pipeline: USE_UNIFIED_PIPELINE ? 'unified' : 'multi-agent',
    planner: {
      available: !USE_UNIFIED_PIPELINE, // Only used in multi-agent mode
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    },
    coder: {
      available: true, // Claude is always the coder
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
  isUnifiedPipeline,
  getAgentStatus,
  undoHistory,
  redoHistory,
  navigateHistory,
  needsFullRegeneration,
  interrogatePrompt,
};

export default agentOrchestrator;
