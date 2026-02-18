/**
 * Tests for coderService
 * Tests code generation, editing, and module extraction logic
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthToken } from '../../services/apiClient';
import { isCoderAvailable, generateCode, editCode, fixBrokenModule } from '../../services/coderService';

// Mock dependencies
vi.mock('../../services/apiClient', () => ({
  getAuthToken: vi.fn().mockResolvedValue('test-token'),
}));

vi.mock('../../services/telemetryService', () => ({
  telemetryService: {
    logLibraryDefect: vi.fn(),
  },
}));

describe('Coder Service', () => {
  beforeEach(() => {
    vi.mocked(getAuthToken).mockResolvedValue('test-token');
  });

  describe('isCoderAvailable', () => {
    it('should always return true', () => {
      expect(isCoderAvailable()).toBe(true);
    });
  });

  describe('generateCode', () => {
    it('should throw when not authenticated', async () => {
      vi.mocked(getAuthToken).mockResolvedValueOnce(null);

      await expect(
        generateCode({ gst: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any })
      ).rejects.toThrow('Authentication required');
    });

    it('should return SCAD code from Claude response', async () => {
      const scadCode = '$fn = 64;\neps = 0.01;\ncube([10, 10, 10]);';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ type: 'text', text: scadCode }],
        }),
      });

      const result = await generateCode({
        gst: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any,
      });
      expect(result.scadCode).toContain('cube([10, 10, 10])');
    });

    it('should strip markdown code fences from response', async () => {
      const text = '```openscad\ncube([5,5,5]);\n```';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ type: 'text', text }],
        }),
      });

      const result = await generateCode({
        gst: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any,
      });
      expect(result.scadCode).not.toContain('```');
      expect(result.scadCode).toContain('cube([5,5,5])');
    });

    it('should auto-inject tactical library when tactical modules used', async () => {
      const text = 'picatinny_rail(slots=5);';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ type: 'text', text }],
        }),
      });

      const result = await generateCode({
        gst: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any,
      });
      expect(result.scadCode).toContain('use <libraries/tactical.scad>');
    });

    it('should not inject tactical library when already present', async () => {
      const text = 'use <libraries/tactical.scad>\npicatinny_rail(slots=5);';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ type: 'text', text }],
        }),
      });

      const result = await generateCode({
        gst: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any,
      });
      // Should have exactly one occurrence
      const matches = result.scadCode.match(/use <libraries\/tactical\.scad>/g);
      expect(matches).toHaveLength(1);
    });

    it('should throw on abort', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        generateCode(
          { gst: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any },
          controller.signal
        )
      ).rejects.toThrow();
    });

    it('should throw on API error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Rate limited' } }),
      });

      await expect(
        generateCode({ gst: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any })
      ).rejects.toThrow('Rate limited');
    });

    it('should throw on unexpected response format', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ content: [{ type: 'image', data: 'abc' }] }),
      });

      await expect(
        generateCode({ gst: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any })
      ).rejects.toThrow('Unexpected response format');
    });
  });

  describe('editCode', () => {
    it('should return edited SCAD code', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ type: 'text', text: 'cube([20, 20, 20]);' }],
        }),
      });

      const result = await editCode({
        existingGST: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any,
        existingCode: 'cube([10, 10, 10]);',
        editRequest: 'Make it bigger',
      });
      expect(result.scadCode).toContain('cube([20, 20, 20])');
    });

    it('should throw when not authenticated', async () => {
      vi.mocked(getAuthToken).mockResolvedValueOnce(null);

      await expect(
        editCode({
          existingGST: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any,
          existingCode: 'cube([10,10,10]);',
          editRequest: 'Make bigger',
        })
      ).rejects.toThrow('Authentication required');
    });

    it('should throw on abort', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        editCode(
          {
            existingGST: { name: 'test', root: { id: 'root', type: 'union', children: [] } } as any,
            existingCode: 'cube([10,10,10]);',
            editRequest: 'Make bigger',
          },
          controller.signal
        )
      ).rejects.toThrow();
    });
  });

  describe('fixBrokenModule', () => {
    it('should patch fixed module back into code', async () => {
      const existingCode = `$fn = 64;
eps = 0.01;

module broken_part() {
    cube([10, 10]);
}

module good_part() {
    sphere(d=10);
}

broken_part();
good_part();`;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ type: 'text', text: 'module broken_part() {\n    cube([10, 10, 10]);\n}' }],
        }),
      });

      const result = await fixBrokenModule({
        existingCode,
        brokenModuleName: 'broken_part',
        validationError: 'Expected 3D object, got 2D',
      });

      expect(result.scadCode).toContain('cube([10, 10, 10])');
      expect(result.scadCode).toContain('good_part');
      expect(result.fixedModule).toContain('cube([10, 10, 10])');
    });

    it('should throw if module not found', async () => {
      await expect(
        fixBrokenModule({
          existingCode: 'cube([10,10,10]);',
          brokenModuleName: 'nonexistent',
          validationError: 'error',
        })
      ).rejects.toThrow('Module nonexistent not found');
    });

    it('should throw on abort', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        fixBrokenModule(
          {
            existingCode: 'module test() { cube(10); }',
            brokenModuleName: 'test',
            validationError: 'error',
          },
          controller.signal
        )
      ).rejects.toThrow();
    });
  });
});
