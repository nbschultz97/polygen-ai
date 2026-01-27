/**
 * Agent Orchestrator Unit Tests
 * Tests the multi-agent pipeline orchestration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrchestratorInput } from '../../services/agentOrchestrator';
import {
  getAgentStatus,
  isMultiAgentAvailable,
  orchestrateGeneration,
} from '../../services/agentOrchestrator';
import {
  createMockCallbacks,
  mockGST,
  mockScadCode,
  mockValidationFailure,
  mockValidationSuccess,
} from '../mocks/types';

// Mock all dependent services
vi.mock('../../services/plannerService', () => ({
  plannerService: {
    generateGST: vi.fn(),
  },
}));

vi.mock('../../services/coderService', () => ({
  coderService: {
    generateCode: vi.fn(),
    editCode: vi.fn(),
    isCoderAvailable: vi.fn().mockReturnValue(true),
  },
}));

// Mock unified generator service (default pipeline)
vi.mock('../../services/unifiedGeneratorService', () => ({
  unifiedGeneratorService: {
    generate: vi.fn(),
  },
}));

vi.mock('../../services/validatorClient', () => ({
  validatorClient: {
    validate: vi.fn(),
  },
}));

vi.mock('../../services/quickFixAnalyzer', () => ({
  analyzeForQuickFixes: vi.fn().mockReturnValue([]),
}));

vi.mock('../../services/previewImageService', () => ({
  previewImageService: {
    generatePreviewImage: vi.fn().mockResolvedValue(null),
  },
}));

import { coderService } from '../../services/coderService';
import { plannerService } from '../../services/plannerService';
import { previewImageService } from '../../services/previewImageService';
import { analyzeForQuickFixes } from '../../services/quickFixAnalyzer';
import { unifiedGeneratorService } from '../../services/unifiedGeneratorService';
import { validatorClient } from '../../services/validatorClient';

describe('Agent Orchestrator', () => {
  let mockCallbacks: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallbacks = createMockCallbacks();

    // Default mock for multi-agent pipeline (now the default)
    // Planner returns GST
    vi.mocked(plannerService.generateGST).mockResolvedValue({
      needsClarification: false,
      gst: mockGST,
    });

    // Coder returns SCAD code
    vi.mocked(coderService.generateCode).mockResolvedValue({
      scadCode: mockScadCode,
    });

    // Edit mode uses editCode
    vi.mocked(coderService.editCode).mockResolvedValue({
      scadCode: mockScadCode,
    });

    // Also mock unified generator for fallback tests
    vi.mocked(unifiedGeneratorService.generate).mockResolvedValue({
      gst: mockGST,
      scadCode: mockScadCode,
      needsClarification: false,
    });

    // Default mock for validation
    vi.mocked(validatorClient.validate).mockResolvedValue(mockValidationSuccess);
  });

  describe('orchestrateGeneration - New Generation Flow', () => {
    it('should complete full pipeline successfully', async () => {
      // Uses default mocks from beforeEach (multi-agent pipeline)
      const input: OrchestratorInput = {
        userPrompt: 'Create a simple box',
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      // Multi-agent pipeline: planner → coder → validator
      expect(result.scadCode).toBe(mockScadCode);
      expect(result.validationResult?.success).toBe(true);
      expect(plannerService.generateGST).toHaveBeenCalled();
      expect(coderService.generateCode).toHaveBeenCalled();
    });

    it('should call callbacks in correct order', async () => {
      // Uses default mocks from beforeEach
      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
      };

      await orchestrateGeneration(input, mockCallbacks);

      // Multi-agent pipeline calls onCodeGenerated and onValidationComplete
      expect(mockCallbacks.onCodeGenerated).toHaveBeenCalledWith(mockScadCode);
      expect(mockCallbacks.onValidationComplete).toHaveBeenCalledWith(mockValidationSuccess);
    });

    it('should handle clarification needed', async () => {
      // Mock planner to return clarification needed
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: true,
        clarifications: [{ question: 'What size?', suggestions: ['Small', 'Medium', 'Large'] }],
      });

      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      expect(result.clarifications).toBeDefined();
      expect(result.clarifications!.length).toBe(1);
    });

    it('should start preview image generation asynchronously', async () => {
      // Provide an existing asset with GST so preview can be generated
      const input: OrchestratorInput = {
        userPrompt: 'Create a model',
        existingAsset: { gst: mockGST },
      };

      await orchestrateGeneration(input, mockCallbacks);

      // Preview image generation should be called with the GST
      expect(previewImageService.generatePreviewImage).toHaveBeenCalled();
    });
  });

  describe('orchestrateGeneration - Edit Mode', () => {
    it('should handle edit mode with existing asset', async () => {
      const input: OrchestratorInput = {
        userPrompt: 'Make it bigger',
        isEdit: true,
        existingAsset: {
          gst: mockGST,
          scadCode: 'cube([10, 10, 10]);',
        },
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      // Edit mode uses coderService.editCode
      expect(coderService.editCode).toHaveBeenCalledWith(
        expect.objectContaining({
          existingCode: 'cube([10, 10, 10]);',
        }),
        undefined
      );
      expect(result.scadCode).toBe(mockScadCode);
    });

    it('should fall back to new generation if edit mode but no existing asset', async () => {
      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
        isEdit: true,
        // No existingAsset
      };

      await orchestrateGeneration(input, mockCallbacks);

      // Should fall back to normal generation flow
      expect(plannerService.generateGST).toHaveBeenCalled();
    });
  });

  describe('orchestrateGeneration - Retry Logic', () => {
    it('should retry on validation failure', async () => {
      // First attempt fails validation, second succeeds
      vi.mocked(coderService.generateCode)
        .mockResolvedValueOnce({ scadCode: 'invalid code' })
        .mockResolvedValueOnce({ scadCode: mockScadCode });

      vi.mocked(validatorClient.validate)
        .mockResolvedValueOnce(mockValidationFailure)
        .mockResolvedValueOnce(mockValidationSuccess);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      expect(coderService.generateCode).toHaveBeenCalledTimes(2);
      expect(result.validationResult?.success).toBe(true);
    });

    it('should pass validation errors on retry', async () => {
      vi.mocked(coderService.generateCode)
        .mockResolvedValueOnce({ scadCode: 'invalid' })
        .mockResolvedValueOnce({ scadCode: mockScadCode });

      vi.mocked(validatorClient.validate)
        .mockResolvedValueOnce(mockValidationFailure)
        .mockResolvedValueOnce(mockValidationSuccess);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
      };

      await orchestrateGeneration(input, mockCallbacks);

      // Second call should include validation errors
      expect(coderService.generateCode).toHaveBeenLastCalledWith(
        expect.objectContaining({
          validationErrors: expect.arrayContaining([expect.stringMatching(/Compilation Failed/i)]),
        }),
        undefined
      );
    });

    it('should stop after MAX_RETRY_ATTEMPTS', async () => {
      vi.mocked(coderService.generateCode).mockResolvedValue({ scadCode: 'bad code' });
      vi.mocked(validatorClient.validate).mockResolvedValue(mockValidationFailure);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      expect(coderService.generateCode).toHaveBeenCalled();
      expect(result.validationResult?.success).toBe(false);
    });
  });

  describe('orchestrateGeneration - Abort Handling', () => {
    it('should throw on abort during generation', async () => {
      const controller = new AbortController();

      vi.mocked(plannerService.generateGST).mockImplementation(async () => {
        controller.abort();
        throw new DOMException('Aborted', 'AbortError');
      });

      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
      };

      await expect(orchestrateGeneration(input, mockCallbacks, controller.signal)).rejects.toThrow(
        /Abort/
      );
    });

    it('should not continue after abort signal is set', async () => {
      const controller = new AbortController();
      controller.abort();

      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
      };

      await expect(
        orchestrateGeneration(input, mockCallbacks, controller.signal)
      ).rejects.toThrow();
    });
  });

  describe('orchestrateGeneration - Error Handling', () => {
    it('should call onError callback on generation failure', async () => {
      const error = new Error('Generation failed');
      // Reject for all retry attempts
      vi.mocked(plannerService.generateGST).mockRejectedValue(error);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
      };

      await expect(orchestrateGeneration(input, mockCallbacks)).rejects.toThrow(
        /Generation failed/
      );

      expect(mockCallbacks.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isMultiAgentAvailable', () => {
    it('should return true when both keys are available', () => {
      // Note: process.env is mocked in setup.ts
      const result = isMultiAgentAvailable();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('getAgentStatus', () => {
    it('should return status for all agents', () => {
      const status = getAgentStatus();

      expect(status).toHaveProperty('planner');
      expect(status).toHaveProperty('coder');
      expect(status).toHaveProperty('validator');

      expect(status.planner).toHaveProperty('available');
      expect(status.planner).toHaveProperty('model');
      expect(status.coder).toHaveProperty('available');
      expect(status.coder).toHaveProperty('model');
      expect(status.validator).toHaveProperty('available');
    });

    it('should report validator as always available', () => {
      const status = getAgentStatus();

      expect(status.validator.available).toBe(true);
    });
  });

  describe('orchestrateGeneration - Smart Fixes', () => {
    it('should generate smart fixes after successful validation', async () => {
      // Uses default mocks from beforeEach
      vi.mocked(analyzeForQuickFixes).mockReturnValueOnce([
        {
          id: 'test-fix',
          label: 'Test',
          description: 'Test fix',
          prompt: 'Fix it',
          category: 'dimension',
          relevance: 0.5,
        },
      ]);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      expect(analyzeForQuickFixes).toHaveBeenCalledWith(
        mockGST,
        mockValidationSuccess,
        mockScadCode
      );
      expect(result.smartFixes).toBeDefined();
      expect(mockCallbacks.onSmartFixesGenerated).toHaveBeenCalled();
    });

    it('should generate smart fixes in edit mode', async () => {
      const input: OrchestratorInput = {
        userPrompt: 'Make it bigger',
        isEdit: true,
        existingAsset: {
          gst: mockGST,
          scadCode: 'cube([10, 10, 10]);',
        },
      };

      await orchestrateGeneration(input, mockCallbacks);

      expect(analyzeForQuickFixes).toHaveBeenCalled();
    });
  });

  describe('orchestrateGeneration - Image Data', () => {
    it('should pass image data to generator', async () => {
      const imageData = {
        base64: 'base64encodedimage',
        mimeType: 'image/png',
      };

      const input: OrchestratorInput = {
        userPrompt: 'Create this model',
        imageData,
      };

      await orchestrateGeneration(input, mockCallbacks);

      // Multi-agent passes image data to planner
      expect(plannerService.generateGST).toHaveBeenCalledWith(
        expect.objectContaining({
          imageData,
        }),
        undefined
      );
    });
  });

  describe('orchestrateGeneration - Conversation History', () => {
    it('should pass conversation history to generator', async () => {
      const history = ['User: Make a box', 'Assistant: I created a box'];

      const input: OrchestratorInput = {
        userPrompt: 'Now add holes',
        conversationHistory: history,
      };

      await orchestrateGeneration(input, mockCallbacks);

      // Multi-agent passes conversation history to planner
      expect(plannerService.generateGST).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationHistory: history,
        }),
        undefined
      );
    });
  });
});
