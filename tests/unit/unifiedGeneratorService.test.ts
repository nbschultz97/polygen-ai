/**
 * Unified Generator Service Unit Tests
 */

import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../services/apiClient', () => ({
  getAuthToken: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('../../services/preferencesService', () => ({
  loadPreferences: vi.fn().mockReturnValue({}),
  getPreferencesForPrompt: vi.fn().mockReturnValue(''),
}));

vi.mock('../../services/streamingClient', () => ({
  streamClaudeResponse: vi.fn().mockResolvedValue('cube([10,10,10]);'),
}));

vi.mock('../../services/telemetryService', () => ({
  telemetryService: {
    logLibraryDefect: vi.fn(),
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { generate, unifiedGeneratorService } from '../../services/unifiedGeneratorService';
import { getAuthToken } from '../../services/apiClient';
import { streamClaudeResponse } from '../../services/streamingClient';

describe('Unified Generator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthToken).mockResolvedValue('mock-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generate', () => {
    it('throws when not authenticated', async () => {
      vi.mocked(getAuthToken).mockResolvedValue(null as any);

      await expect(
        generate({ userPrompt: 'make a box' })
      ).rejects.toThrow('Authentication required');
    });

    it('throws on pre-aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        generate({ userPrompt: 'make a box' }, controller.signal)
      ).rejects.toThrow();
    });

    it('returns SCAD code for a simple request using streaming', async () => {
      vi.mocked(streamClaudeResponse).mockResolvedValue('cube([10,10,10]);');

      const result = await generate({
        userPrompt: 'make a 10mm cube',
        onChunk: vi.fn(),
      });

      expect(result.needsClarification).toBe(false);
      expect(result.scadCode).toContain('cube');
    });

    it('returns SCAD code via non-streaming path', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'cube([20,20,20]);' }],
        }),
      });

      const result = await generate({
        userPrompt: 'make a 20mm cube',
        useStreaming: false,
      });

      expect(result.needsClarification).toBe(false);
      expect(result.scadCode).toContain('cube');
    });

    it('handles clarification JSON response', async () => {
      const clarification = JSON.stringify({
        needsClarification: true,
        clarifications: [
          { question: 'What size?', suggestions: ['small', 'large'] },
        ],
      });

      vi.mocked(streamClaudeResponse).mockResolvedValue(clarification);

      const result = await generate({
        userPrompt: 'make a thing',
        onChunk: vi.fn(),
      });

      expect(result.needsClarification).toBe(true);
      expect(result.clarifications).toHaveLength(1);
    });

    it('extracts code from markdown fenced blocks', async () => {
      vi.mocked(streamClaudeResponse).mockResolvedValue(
        '```openscad\nsphere(d=10);\n```'
      );

      const result = await generate({
        userPrompt: 'make a sphere',
        onChunk: vi.fn(),
      });

      expect(result.scadCode).toBe('sphere(d=10);');
    });

    it('auto-injects tactical library for picatinny modules', async () => {
      vi.mocked(streamClaudeResponse).mockResolvedValue(
        'picatinny_rail(slots=5);'
      );

      const result = await generate({
        userPrompt: 'make a picatinny rail',
        onChunk: vi.fn(),
      });

      expect(result.scadCode).toContain('use <libraries/tactical.scad>');
      expect(result.scadCode).toContain('picatinny_rail');
    });

    it('auto-injects tactical library for molle modules', async () => {
      vi.mocked(streamClaudeResponse).mockResolvedValue(
        'molle_clip(rows=2);'
      );

      const result = await generate({
        userPrompt: 'make a molle clip',
        onChunk: vi.fn(),
      });

      expect(result.scadCode).toContain('use <libraries/tactical.scad>');
    });

    it('does not double-inject tactical library', async () => {
      vi.mocked(streamClaudeResponse).mockResolvedValue(
        'use <libraries/tactical.scad>\npicatinny_rail(slots=5);'
      );

      const result = await generate({
        userPrompt: 'make a rail',
        onChunk: vi.fn(),
      });

      const matches = result.scadCode!.match(/use <libraries\/tactical\.scad>/g);
      expect(matches).toHaveLength(1);
    });

    it('includes existing code in edit prompt', async () => {
      vi.mocked(streamClaudeResponse).mockResolvedValue('cube([20,20,20]);');

      await generate({
        userPrompt: 'make it bigger',
        existingCode: 'cube([10,10,10]);',
        isEdit: true,
        onChunk: vi.fn(),
      });

      const callArgs = vi.mocked(streamClaudeResponse).mock.calls[0];
      // The prompt should contain the existing code
      expect(JSON.stringify(callArgs)).toContain('cube([10,10,10])');
    });

    it('includes validation errors in non-edit prompt', async () => {
      vi.mocked(streamClaudeResponse).mockResolvedValue('cube([10,10,10]);');

      await generate({
        userPrompt: 'fix the cube module error',
        existingCode: 'cub([10,10,10]);',
        validationErrors: ['Unknown module cub'],
        isEdit: false,
        onChunk: vi.fn(),
      });

      const callArgs = vi.mocked(streamClaudeResponse).mock.calls[0];
      expect(JSON.stringify(callArgs)).toContain('Unknown module cub');
    });

    it('wraps non-AbortError exceptions', async () => {
      vi.mocked(streamClaudeResponse).mockRejectedValue(new Error('Network fail'));

      await expect(
        generate({ userPrompt: 'box', onChunk: vi.fn() })
      ).rejects.toThrow('Generation failed: Network fail');
    });

    it('re-throws AbortError directly', async () => {
      vi.mocked(streamClaudeResponse).mockRejectedValue(
        new DOMException('Aborted', 'AbortError')
      );

      await expect(
        generate({ userPrompt: 'box', onChunk: vi.fn() })
      ).rejects.toThrow('Aborted');
    });
  });

  describe('exports', () => {
    it('exports generate as method on service object', () => {
      expect(unifiedGeneratorService.generate).toBe(generate);
    });
  });
});
