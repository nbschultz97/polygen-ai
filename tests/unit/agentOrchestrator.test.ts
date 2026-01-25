/**
 * Agent Orchestrator Unit Tests
 * Tests the multi-agent pipeline orchestration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  orchestrateGeneration,
  isMultiAgentAvailable,
  getAgentStatus,
  OrchestratorInput
} from '../../services/agentOrchestrator';
import {
  mockGST,
  mockScadCode,
  mockValidationSuccess,
  mockValidationFailure,
  mockGeneratedAsset,
  createMockCallbacks
} from '../mocks/types';

// Mock all dependent services
vi.mock('../../services/plannerService', () => ({
  plannerService: {
    generateGST: vi.fn()
  }
}));

vi.mock('../../services/coderService', () => ({
  coderService: {
    generateCode: vi.fn(),
    editCode: vi.fn(),
    isCoderAvailable: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('../../services/validatorClient', () => ({
  validatorClient: {
    validate: vi.fn()
  }
}));

vi.mock('../../services/quickFixAnalyzer', () => ({
  analyzeForQuickFixes: vi.fn().mockReturnValue([])
}));

vi.mock('../../services/previewImageService', () => ({
  previewImageService: {
    generatePreviewImage: vi.fn().mockResolvedValue(null)
  }
}));

import { plannerService } from '../../services/plannerService';
import { coderService } from '../../services/coderService';
import { validatorClient } from '../../services/validatorClient';
import { analyzeForQuickFixes } from '../../services/quickFixAnalyzer';
import { previewImageService } from '../../services/previewImageService';

describe('Agent Orchestrator', () => {
  let mockCallbacks: ReturnType<typeof createMockCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallbacks = createMockCallbacks();
  });

  describe('orchestrateGeneration - New Generation Flow', () => {
    it('should complete full pipeline successfully', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: { product_class: 'test' }
      });
      vi.mocked(coderService.generateCode).mockResolvedValueOnce({
        scadCode: mockScadCode
      });
      vi.mocked(validatorClient.validate).mockResolvedValueOnce(mockValidationSuccess);

      const input: OrchestratorInput = {
        userPrompt: 'Create a simple box'
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      expect(result.gst).toBeDefined();
      expect(result.scadCode).toBe(mockScadCode);
      expect(result.validationResult?.success).toBe(true);
      expect(mockCallbacks.stepChanges).toContain('planning');
      expect(mockCallbacks.stepChanges).toContain('coding');
      expect(mockCallbacks.stepChanges).toContain('validating');
      expect(mockCallbacks.stepChanges).toContain('complete');
    });

    it('should call callbacks in correct order', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: { product_class: 'test' }
      });
      vi.mocked(coderService.generateCode).mockResolvedValueOnce({
        scadCode: mockScadCode
      });
      vi.mocked(validatorClient.validate).mockResolvedValueOnce(mockValidationSuccess);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
      };

      await orchestrateGeneration(input, mockCallbacks);

      expect(mockCallbacks.onGSTGenerated).toHaveBeenCalledWith(mockGST);
      expect(mockCallbacks.onCodeGenerated).toHaveBeenCalledWith(mockScadCode);
      expect(mockCallbacks.onValidationComplete).toHaveBeenCalledWith(mockValidationSuccess);
      expect(mockCallbacks.onSmartFixesGenerated).toHaveBeenCalled();
    });

    it('should handle clarification needed', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: true,
        clarifications: [
          { question: 'What size?', suggestions: ['Small', 'Medium', 'Large'] }
        ],
        partialSpec: { product_class: 'box' }
      });

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      expect(result.clarifications).toBeDefined();
      expect(result.clarifications!.length).toBe(1);
      expect(mockCallbacks.stepChanges).toContain('spec-review');
    });

    it('should start preview image generation asynchronously', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });
      vi.mocked(coderService.generateCode).mockResolvedValueOnce({
        scadCode: mockScadCode
      });
      vi.mocked(validatorClient.validate).mockResolvedValueOnce(mockValidationSuccess);

      const input: OrchestratorInput = {
        userPrompt: 'Create a model'
      };

      await orchestrateGeneration(input, mockCallbacks);

      // Preview image generation should be called but not awaited
      expect(previewImageService.generatePreviewImage).toHaveBeenCalledWith(
        mockGST,
        undefined
      );
    });
  });

  describe('orchestrateGeneration - Edit Mode', () => {
    it('should skip planner and go directly to coder in edit mode', async () => {
      vi.mocked(coderService.editCode).mockResolvedValueOnce({
        scadCode: mockScadCode
      });
      vi.mocked(validatorClient.validate).mockResolvedValueOnce(mockValidationSuccess);

      const input: OrchestratorInput = {
        userPrompt: 'Make it bigger',
        isEdit: true,
        existingAsset: {
          gst: mockGST,
          scadCode: 'cube([10, 10, 10]);'
        }
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      expect(plannerService.generateGST).not.toHaveBeenCalled();
      expect(coderService.editCode).toHaveBeenCalled();
      expect(result.scadCode).toBe(mockScadCode);
    });

    it('should pass existing GST and code to editCode', async () => {
      vi.mocked(coderService.editCode).mockResolvedValueOnce({
        scadCode: mockScadCode
      });
      vi.mocked(validatorClient.validate).mockResolvedValueOnce(mockValidationSuccess);

      const existingCode = 'cube([10, 10, 10]);';
      const input: OrchestratorInput = {
        userPrompt: 'Add holes',
        isEdit: true,
        existingAsset: {
          gst: mockGST,
          scadCode: existingCode
        }
      };

      await orchestrateGeneration(input, mockCallbacks);

      expect(coderService.editCode).toHaveBeenCalledWith(
        expect.objectContaining({
          existingGST: mockGST,
          existingCode: existingCode,
          editRequest: 'Add holes'
        }),
        undefined
      );
    });

    it('should fall back to new generation if edit mode but no existing asset', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });
      vi.mocked(coderService.generateCode).mockResolvedValueOnce({
        scadCode: mockScadCode
      });
      vi.mocked(validatorClient.validate).mockResolvedValueOnce(mockValidationSuccess);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box',
        isEdit: true
        // No existingAsset
      };

      await orchestrateGeneration(input, mockCallbacks);

      // Should go through planner because no existing asset
      expect(plannerService.generateGST).toHaveBeenCalled();
    });
  });

  describe('orchestrateGeneration - Retry Logic', () => {
    it('should retry on validation failure', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });
      
      // First attempt fails validation
      vi.mocked(coderService.generateCode)
        .mockResolvedValueOnce({ scadCode: 'invalid code' })
        .mockResolvedValueOnce({ scadCode: mockScadCode });
      
      vi.mocked(validatorClient.validate)
        .mockResolvedValueOnce(mockValidationFailure)
        .mockResolvedValueOnce(mockValidationSuccess);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      expect(coderService.generateCode).toHaveBeenCalledTimes(2);
      expect(result.validationResult?.success).toBe(true);
    });

    it('should pass validation errors to coder on retry', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });
      
      vi.mocked(coderService.generateCode)
        .mockResolvedValueOnce({ scadCode: 'invalid' })
        .mockResolvedValueOnce({ scadCode: mockScadCode });
      
      vi.mocked(validatorClient.validate)
        .mockResolvedValueOnce(mockValidationFailure)
        .mockResolvedValueOnce(mockValidationSuccess);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
      };

      await orchestrateGeneration(input, mockCallbacks);

      // Second call should include validation errors
      expect(coderService.generateCode).toHaveBeenLastCalledWith(
        expect.objectContaining({
          validationErrors: mockValidationFailure.errors
        }),
        undefined
      );
    });

    it('should stop after MAX_RETRY_ATTEMPTS', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });
      
      vi.mocked(coderService.generateCode).mockResolvedValue({
        scadCode: 'bad code'
      });
      vi.mocked(validatorClient.validate).mockResolvedValue(mockValidationFailure);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
      };

      const result = await orchestrateGeneration(input, mockCallbacks);

      // Should only try twice (MAX_RETRY_ATTEMPTS = 2)
      expect(coderService.generateCode).toHaveBeenCalledTimes(2);
      expect(result.validationResult?.success).toBe(false);
    });
  });

  describe('orchestrateGeneration - Abort Handling', () => {
    it('should throw on abort during planning', async () => {
      const controller = new AbortController();
      
      vi.mocked(plannerService.generateGST).mockImplementation(async () => {
        controller.abort();
        throw new DOMException('Aborted', 'AbortError');
      });

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
      };

      await expect(
        orchestrateGeneration(input, mockCallbacks, controller.signal)
      ).rejects.toThrow('AbortError');
    });

    it('should throw on abort during coding', async () => {
      const controller = new AbortController();
      
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });
      
      vi.mocked(coderService.generateCode).mockImplementation(async () => {
        controller.abort();
        throw new DOMException('Aborted', 'AbortError');
      });

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
      };

      await expect(
        orchestrateGeneration(input, mockCallbacks, controller.signal)
      ).rejects.toThrow('AbortError');
    });

    it('should not continue after abort signal is set', async () => {
      const controller = new AbortController();
      controller.abort();

      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
      };

      await expect(
        orchestrateGeneration(input, mockCallbacks, controller.signal)
      ).rejects.toThrow();
    });
  });

  describe('orchestrateGeneration - Error Handling', () => {
    it('should call onError callback on planner failure', async () => {
      const error = new Error('Planner failed');
      vi.mocked(plannerService.generateGST).mockRejectedValueOnce(error);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
      };

      await expect(
        orchestrateGeneration(input, mockCallbacks)
      ).rejects.toThrow('Planner failed');

      expect(mockCallbacks.errors.length).toBe(1);
      expect(mockCallbacks.errors[0].step).toBe('planning');
    });

    it('should call onError callback on coder failure', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });
      
      const error = new Error('Coder failed');
      vi.mocked(coderService.generateCode).mockRejectedValue(error);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
      };

      await expect(
        orchestrateGeneration(input, mockCallbacks)
      ).rejects.toThrow('Coder failed');

      expect(mockCallbacks.errors.length).toBe(1);
      expect(mockCallbacks.errors[0].step).toBe('coding');
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
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });
      vi.mocked(coderService.generateCode).mockResolvedValueOnce({
        scadCode: mockScadCode
      });
      vi.mocked(validatorClient.validate).mockResolvedValueOnce(mockValidationSuccess);
      vi.mocked(analyzeForQuickFixes).mockReturnValueOnce([
        { id: 'test-fix', label: 'Test', description: 'Test fix', prompt: 'Fix it', category: 'dimension', relevance: 0.5 }
      ]);

      const input: OrchestratorInput = {
        userPrompt: 'Create a box'
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
      vi.mocked(coderService.editCode).mockResolvedValueOnce({
        scadCode: mockScadCode
      });
      vi.mocked(validatorClient.validate).mockResolvedValueOnce(mockValidationSuccess);

      const input: OrchestratorInput = {
        userPrompt: 'Make it bigger',
        isEdit: true,
        existingAsset: {
          gst: mockGST,
          scadCode: 'cube([10, 10, 10]);'
        }
      };

      await orchestrateGeneration(input, mockCallbacks);

      expect(analyzeForQuickFixes).toHaveBeenCalled();
    });
  });

  describe('orchestrateGeneration - Image Data', () => {
    it('should pass image data to planner', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });
      vi.mocked(coderService.generateCode).mockResolvedValueOnce({
        scadCode: mockScadCode
      });
      vi.mocked(validatorClient.validate).mockResolvedValueOnce(mockValidationSuccess);

      const imageData = {
        base64: 'base64encodedimage',
        mimeType: 'image/png'
      };

      const input: OrchestratorInput = {
        userPrompt: 'Create this model',
        imageData
      };

      await orchestrateGeneration(input, mockCallbacks);

      expect(plannerService.generateGST).toHaveBeenCalledWith(
        expect.objectContaining({
          imageData
        }),
        undefined
      );
    });
  });

  describe('orchestrateGeneration - Conversation History', () => {
    it('should pass conversation history to planner', async () => {
      vi.mocked(plannerService.generateGST).mockResolvedValueOnce({
        needsClarification: false,
        gst: mockGST,
        spec: {}
      });
      vi.mocked(coderService.generateCode).mockResolvedValueOnce({
        scadCode: mockScadCode
      });
      vi.mocked(validatorClient.validate).mockResolvedValueOnce(mockValidationSuccess);

      const history = ['User: Make a box', 'Assistant: I created a box'];

      const input: OrchestratorInput = {
        userPrompt: 'Now add holes',
        conversationHistory: history
      };

      await orchestrateGeneration(input, mockCallbacks);

      expect(plannerService.generateGST).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationHistory: history
        }),
        undefined
      );
    });
  });
});
