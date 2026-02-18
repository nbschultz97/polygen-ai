/**
 * Tests for previewImageService
 * Tests GST-to-prompt conversion and component type extraction
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { previewImageService } from '../../services/previewImageService';

// Mock apiClient
vi.mock('../../services/apiClient', () => ({
  getAuthToken: vi.fn().mockResolvedValue('test-token'),
}));

describe('Preview Image Service', () => {
  describe('gstToImagePrompt', () => {
    it('should include model name', () => {
      const gst = {
        name: 'Phone Stand',
        root: { id: 'root', type: 'union' as const, children: [] },
      };
      const prompt = previewImageService.gstToImagePrompt(gst as any);
      expect(prompt).toContain('Phone Stand');
    });

    it('should include description when provided', () => {
      const gst = {
        name: 'Box',
        description: 'A small storage box with lid',
        root: { id: 'root', type: 'union' as const, children: [] },
      };
      const prompt = previewImageService.gstToImagePrompt(gst as any);
      expect(prompt).toContain('A small storage box with lid');
    });

    it('should include dimensions from globalParameters', () => {
      const gst = {
        name: 'Plate',
        globalParameters: [
          { name: 'width', value: 50, unit: 'mm' },
          { name: 'height', value: 30, unit: 'mm' },
        ],
        root: { id: 'root', type: 'union' as const, children: [] },
      };
      const prompt = previewImageService.gstToImagePrompt(gst as any);
      expect(prompt).toContain('width: 50mm');
      expect(prompt).toContain('height: 30mm');
    });

    it('should extract component types from root', () => {
      const gst = {
        name: 'Mount',
        root: {
          id: 'root',
          type: 'union',
          children: [
            { id: 'c1', type: 'cuboid', children: [] },
            { id: 'c2', type: 'cylinder', children: [] },
            { id: 'c3', type: 'screw_hole', children: [] },
          ],
        },
      };
      const prompt = previewImageService.gstToImagePrompt(gst as any);
      expect(prompt).toContain('cuboid');
      expect(prompt).toContain('cylinder');
      expect(prompt).toContain('screw hole');
    });

    it('should include style guidance', () => {
      const gst = {
        name: 'Test',
        root: { id: 'root', type: 'union' as const, children: [] },
      };
      const prompt = previewImageService.gstToImagePrompt(gst as any);
      expect(prompt).toContain('studio lighting');
      expect(prompt).toContain('3/4 angle');
    });

    it('should skip non-mm parameters', () => {
      const gst = {
        name: 'Test',
        globalParameters: [
          { name: 'count', value: 5, unit: 'pcs' },
          { name: 'width', value: 100, unit: 'mm' },
        ],
        root: { id: 'root', type: 'union' as const, children: [] },
      };
      const prompt = previewImageService.gstToImagePrompt(gst as any);
      expect(prompt).not.toContain('count');
      expect(prompt).toContain('width: 100mm');
    });

    it('should not include boolean ops as component types', () => {
      const gst = {
        name: 'Test',
        root: {
          id: 'root',
          type: 'difference',
          children: [
            { id: 'c1', type: 'cuboid', children: [] },
          ],
        },
      };
      const prompt = previewImageService.gstToImagePrompt(gst as any);
      expect(prompt).not.toContain('difference');
      expect(prompt).toContain('cuboid');
    });
  });

  describe('isImageGenAvailable', () => {
    it('should always return true', () => {
      expect(previewImageService.isImageGenAvailable()).toBe(true);
    });
  });

  describe('generatePreviewImage', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should return null when aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const result = await previewImageService.generatePreviewImage(
        { name: 'Test', root: { id: 'root', type: 'union' as any, children: [] } } as any,
        controller.signal
      );
      expect(result).toBeNull();
    });

    it('should return null when not authenticated', async () => {
      const { getAuthToken } = await import('../../services/apiClient');
      vi.mocked(getAuthToken).mockResolvedValueOnce(null);
      
      const result = await previewImageService.generatePreviewImage(
        { name: 'Test', root: { id: 'root', type: 'union' as any, children: [] } } as any
      );
      expect(result).toBeNull();
    });

    it('should return data URL on success', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ imageBase64: 'abc123' }),
      });

      const result = await previewImageService.generatePreviewImage(
        { name: 'Test', root: { id: 'root', type: 'union' as any, children: [] } } as any
      );
      expect(result).toBe('data:image/png;base64,abc123');
    });

    it('should return null on API error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'quota exceeded' }),
      });

      const result = await previewImageService.generatePreviewImage(
        { name: 'Test', root: { id: 'root', type: 'union' as any, children: [] } } as any
      );
      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await previewImageService.generatePreviewImage(
        { name: 'Test', root: { id: 'root', type: 'union' as any, children: [] } } as any
      );
      expect(result).toBeNull();
    });
  });
});
