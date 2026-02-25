/**
 * Planner Service Unit Tests
 */

import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../services/apiClient', () => ({
  getAuthToken: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('../../services/preferencesService', () => ({
  loadPreferences: vi.fn().mockReturnValue({}),
  getPreferencesForPrompt: vi.fn().mockReturnValue(''),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { generateGST, plannerService } from '../../services/plannerService';
import { getAuthToken } from '../../services/apiClient';

describe('Planner Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthToken).mockResolvedValue('mock-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateGST', () => {
    it('throws when not authenticated', async () => {
      vi.mocked(getAuthToken).mockResolvedValue(null as any);

      await expect(
        generateGST({ userPrompt: 'make a box' })
      ).rejects.toThrow('Authentication required');
    });

    it('throws on abort signal already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        generateGST({ userPrompt: 'make a box' }, controller.signal)
      ).rejects.toThrow();
    });

    it('throws on API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      await expect(
        generateGST({ userPrompt: 'make a box' })
      ).rejects.toThrow('Planner failed: Internal Server Error');
    });

    it('throws on API error with nested message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Bad request details' } }),
      });

      await expect(
        generateGST({ userPrompt: 'make a box' })
      ).rejects.toThrow('Planner failed: Bad request details');
    });

    it('parses a valid GST response', async () => {
      const gstResponse = {
        version: '1.0',
        name: 'test_box',
        description: 'A simple box',
        boundingBox: { min: [0, 0, 0], max: [50, 30, 10] },
        globalParameters: [],
        root: {
          id: 'main',
          name: 'box',
          type: 'union',
          children: [
            {
              id: 'base',
              name: 'base_plate',
              type: 'cuboid',
              parameters: [
                { name: 'width', value: 50, unit: 'mm' },
                { name: 'depth', value: 30, unit: 'mm' },
                { name: 'height', value: 10, unit: 'mm' },
              ],
            },
          ],
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: JSON.stringify(gstResponse) }),
      });

      const result = await generateGST({ userPrompt: 'make a 50x30x10 box' });

      expect(result.needsClarification).toBe(false);
      expect(result.gst).toBeDefined();
      expect(result.gst!.name).toBe('test_box');
      expect(result.spec).toBeDefined();
      expect(result.spec!.product_class).toBe('test_box');
    });

    it('parses clarification response', async () => {
      const clarificationResponse = {
        needsClarification: true,
        clarifications: [
          {
            question: 'What dimensions?',
            suggestions: ['50mm', '100mm'],
          },
        ],
        partialSpec: { name: 'phone_holder', description: 'TBD' },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: JSON.stringify(clarificationResponse) }),
      });

      const result = await generateGST({ userPrompt: 'make a phone holder' });

      expect(result.needsClarification).toBe(true);
      expect(result.clarifications).toHaveLength(1);
      expect(result.clarifications![0].question).toBe('What dimensions?');
    });

    it('handles markdown-wrapped JSON response', async () => {
      const gst = {
        version: '1.0',
        name: 'box',
        description: 'box',
        root: { id: 'main', name: 'box', type: 'union', children: [] },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: '```json\n' + JSON.stringify(gst) + '\n```' }),
      });

      const result = await generateGST({ userPrompt: 'box' });
      expect(result.needsClarification).toBe(false);
      expect(result.gst!.name).toBe('box');
    });

    it('throws on invalid JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'not valid json at all' }),
      });

      await expect(
        generateGST({ userPrompt: 'box' })
      ).rejects.toThrow('Failed to parse Planner response');
    });

    it('throws on GST missing root', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: JSON.stringify({ name: 'box' }) }),
      });

      await expect(
        generateGST({ userPrompt: 'box' })
      ).rejects.toThrow('Invalid GST: missing root or name');
    });

    it('includes conversation history in prompt', async () => {
      const gst = {
        version: '1.0',
        name: 'box',
        description: 'box',
        root: { id: 'main', name: 'box', type: 'union', children: [] },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: JSON.stringify(gst) }),
      });

      await generateGST({
        userPrompt: 'use 50mm',
        conversationHistory: ['User: make a box', 'AI: What dimensions?'],
      });

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(fetchBody.prompt).toContain('CONVERSATION HISTORY');
      expect(fetchBody.prompt).toContain('make a box');
    });

    it('includes imageData when provided', async () => {
      const gst = {
        version: '1.0',
        name: 'box',
        description: 'box',
        root: { id: 'main', name: 'box', type: 'union', children: [] },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: JSON.stringify(gst) }),
      });

      await generateGST({
        userPrompt: 'replicate this',
        imageData: { base64: 'abc123', mimeType: 'image/png' } as any,
      });

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(fetchBody.prompt).toContain('REFERENCE IMAGE ATTACHED');
      expect(fetchBody.imageData).toBeDefined();
    });

    it('sends auth header', async () => {
      const gst = {
        version: '1.0',
        name: 'box',
        description: 'box',
        root: { id: 'main', name: 'box', type: 'union', children: [] },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: JSON.stringify(gst) }),
      });

      await generateGST({ userPrompt: 'box' });

      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer mock-token');
    });

    it('extracts spec with bounding box dimensions', async () => {
      const gst = {
        version: '1.0',
        name: 'plate',
        description: 'A plate',
        boundingBox: { min: [0, 0, 0], max: [100, 50, 5] },
        root: { id: 'main', name: 'plate', type: 'union', children: [] },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ text: JSON.stringify(gst) }),
      });

      const result = await generateGST({ userPrompt: 'plate' });
      expect(result.spec!.envelope).toEqual({
        max_x_mm: 100,
        max_y_mm: 50,
        max_z_mm: 5,
      });
    });
  });

  describe('plannerService export', () => {
    it('exports generateGST as method', () => {
      expect(plannerService.generateGST).toBe(generateGST);
    });
  });
});
