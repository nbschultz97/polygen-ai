/**
 * Gemini Service Unit Tests
 */

import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('../../services/apiClient', () => ({
  getAuthToken: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('../../services/preferencesService', () => ({
  loadPreferences: vi.fn().mockReturnValue({ enableWebSearch: false }),
  getPreferencesForPrompt: vi.fn().mockReturnValue(''),
  addRecentDesign: vi.fn(),
}));

vi.mock('../../services/scadValidation', () => ({
  validateScadCode: vi.fn().mockResolvedValue({ success: true }),
}));

import { APP_VERSION, APP_BUILD_DATE, processArchitectRequest } from '../../services/geminiService';
import { getAuthToken } from '../../services/apiClient';

describe('Gemini Service', () => {
  afterEach(() => {
    vi.mocked(getAuthToken).mockResolvedValue('mock-token');
  });

  describe('App Version Constants', () => {
    it('APP_VERSION is a semver string', () => {
      expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('APP_BUILD_DATE is a valid date string', () => {
      expect(APP_BUILD_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('processArchitectRequest', () => {
    it('throws when not authenticated', async () => {
      vi.mocked(getAuthToken).mockResolvedValue(null as any);

      await expect(processArchitectRequest('make a box')).rejects.toThrow('Authentication required');
    });

    it('throws on abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        processArchitectRequest('make a box', [], null, controller.signal)
      ).rejects.toThrow('aborted');
    });

    it('handles API error response with retry', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Rate limited' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(processArchitectRequest('make a cube')).rejects.toThrow('Rate limited');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('parses valid response with scad_body', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          text: JSON.stringify({
            status: 'ok',
            clarifications: [],
            spec: { product_class: 'box' },
            scad_body: 'module main() { cube([10,10,10]); } main();',
          }),
        }),
      }));

      const result = await processArchitectRequest('make a 10mm cube');
      expect(result.spec?.product_class).toBe('box');
      expect(result.scadCode).toContain('cube');
    });

    it('handles clarification response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          text: JSON.stringify({
            status: 'needs_clarification',
            clarifications: [{ question: 'What size?', suggestions: ['10mm', '20mm'] }],
            spec: { product_class: 'unknown' },
            scad_body: '',
          }),
        }),
      }));

      const result = await processArchitectRequest('make something');
      expect(result.clarifications).toHaveLength(1);
      expect(result.clarifications![0].question).toBe('What size?');
    });

    it('handles malformed JSON gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'not json at all' }),
      }));

      const result = await processArchitectRequest('test');
      expect(result).toBeDefined();
      expect(result.explanation).toContain('Error');
    });
  });
});
