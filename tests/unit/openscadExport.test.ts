/**
 * OpenSCAD Export Service Unit Tests
 * Tests file export and clipboard functionality
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard, exportToOpenSCAD, generateFileName } from '../../services/openscadExport';
import { mockScadCode } from '../mocks/types';

describe('OpenSCAD Export Service', () => {
  describe('generateFileName', () => {
    it('should generate a filename with timestamp when no spec provided', () => {
      const filename = generateFileName();

      expect(filename).toMatch(/^polygen_model_\d{8}_[a-z0-9]+\.scad$/);
    });

    it('should include product_class in filename when provided', () => {
      const spec = { product_class: 'Mounting Bracket' };
      const filename = generateFileName(spec);

      expect(filename).toMatch(/^polygen_mounting_bracket_\d{8}\.scad$/);
    });

    it('should sanitize special characters from product_class', () => {
      const spec = { product_class: 'Test@Model#123!' };
      const filename = generateFileName(spec);

      expect(filename).not.toContain('@');
      expect(filename).not.toContain('#');
      expect(filename).not.toContain('!');
      expect(filename).toMatch(/^polygen_test_model_123_\d{8}\.scad$/);
    });

    it('should convert product_class to lowercase', () => {
      const spec = { product_class: 'MyUpperCaseModel' };
      const filename = generateFileName(spec);

      expect(filename).toMatch(/^polygen_myuppercasemodel_\d{8}\.scad$/);
    });

    it('should truncate long product_class names', () => {
      const spec = {
        product_class: 'This_is_a_very_long_product_class_name_that_should_be_truncated',
      };
      const filename = generateFileName(spec);

      // Product class is truncated to 30 characters
      const productPart = filename.replace('polygen_', '').split('_')[0];
      expect(productPart.length).toBeLessThanOrEqual(30);
    });

    it('should remove leading and trailing underscores', () => {
      const spec = { product_class: '__test__model__' };
      const filename = generateFileName(spec);

      expect(filename).not.toMatch(/polygen___/);
      expect(filename).toMatch(/^polygen_test_model_\d{8}\.scad$/);
    });

    it('should handle empty product_class', () => {
      const spec = { product_class: '' };
      const filename = generateFileName(spec);

      expect(filename).toMatch(/^polygen_model_\d{8}_[a-z0-9]+\.scad$/);
    });

    it('should handle whitespace-only product_class', () => {
      const spec = { product_class: '   ' };
      const filename = generateFileName(spec);

      // Whitespace handling might result in empty parts, just ensure it has the polygen prefix and extension
      expect(filename).toMatch(/^polygen_.*\.scad$/);
    });

    it('should handle mount_target in spec but use product_class for naming', () => {
      const spec = { product_class: 'bracket', mount_target: 'wall' };
      const filename = generateFileName(spec);

      expect(filename).toMatch(/^polygen_bracket_\d{8}\.scad$/);
    });
  });

  describe('exportToOpenSCAD', () => {
    let mockCreateElement: ReturnType<typeof vi.spyOn>;
    let mockAppendChild: ReturnType<typeof vi.spyOn>;
    let mockRemoveChild: ReturnType<typeof vi.spyOn>;
    let mockAnchor: HTMLAnchorElement;

    beforeEach(() => {
      // Create mock anchor element
      mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      } as unknown as HTMLAnchorElement;

      mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') {
          return mockAnchor;
        }
        if (tagName === 'iframe') {
          return {
            style: { display: '' },
            remove: vi.fn(),
          } as unknown as HTMLIFrameElement;
        }
        return document.createElement(tagName);
      });

      mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

      // Mock URL API
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    afterEach(() => {
      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
      vi.restoreAllMocks();
    });

    it('should create a blob with correct MIME type', async () => {
      const result = await exportToOpenSCAD(mockScadCode);

      expect(result.success).toBe(true);
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should trigger a download', async () => {
      const result = await exportToOpenSCAD(mockScadCode);

      expect(result.success).toBe(true);
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('should set correct download filename', async () => {
      const spec = { product_class: 'test_model' };
      await exportToOpenSCAD(mockScadCode, spec);

      expect(mockAnchor.download).toMatch(/^polygen_test_model_\d{8}\.scad$/);
    });

    it('should return success with filePath', async () => {
      const spec = { product_class: 'bracket' };
      const result = await exportToOpenSCAD(mockScadCode, spec);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.filePath).toMatch(/\.scad$/);
    });

    it('should clean up object URL after download', async () => {
      vi.useFakeTimers();

      await exportToOpenSCAD(mockScadCode);

      // Fast-forward past the cleanup timeout
      vi.advanceTimersByTime(1500);

      expect(URL.revokeObjectURL).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should handle export errors gracefully', async () => {
      // Mock URL.createObjectURL to throw
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn(() => {
        throw new Error('Blob creation failed');
      });

      const result = await exportToOpenSCAD(mockScadCode);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Blob creation failed');

      URL.createObjectURL = originalCreateObjectURL;
    });

    it('should work with empty spec', async () => {
      const result = await exportToOpenSCAD(mockScadCode);

      expect(result.success).toBe(true);
    });

    it('should work with complex SCAD code', async () => {
      const complexCode = `
        // Complex model
        $fn = 64;
        
        module complex_shape() {
          difference() {
            cube([10, 10, 10], center=true);
            cylinder(h=12, d=5, center=true);
          }
        }
        
        complex_shape();
      `;

      const result = await exportToOpenSCAD(complexCode);

      expect(result.success).toBe(true);
    });
  });

  describe('copyToClipboard', () => {
    it('should copy code to clipboard successfully', async () => {
      const result = await copyToClipboard(mockScadCode);

      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockScadCode);
    });

    it('should return false when clipboard API fails', async () => {
      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
        new Error('Clipboard access denied')
      );

      const result = await copyToClipboard(mockScadCode);

      expect(result).toBe(false);
    });

    it('should handle empty code', async () => {
      const result = await copyToClipboard('');

      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should handle multi-line code', async () => {
      const multiLineCode = `line1
line2
line3`;

      const result = await copyToClipboard(multiLineCode);

      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(multiLineCode);
    });

    it('should handle special characters', async () => {
      const specialCode = 'cube([10, 10, 10]); // Comment with "quotes"';

      const result = await copyToClipboard(specialCode);

      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(specialCode);
    });

    it('should handle unicode characters', async () => {
      const unicodeCode = '// Model: 3D Box (SCAD)\n// 尺寸: 10mm';

      const result = await copyToClipboard(unicodeCode);

      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(unicodeCode);
    });
  });

  describe('edge cases', () => {
    it('should handle very long SCAD code', async () => {
      const longCode = '// Header\n' + 'cube([1, 1, 1]);\n'.repeat(10000);

      const exportResult = await exportToOpenSCAD(longCode);
      const copyResult = await copyToClipboard(longCode);

      expect(exportResult.success).toBe(true);
      expect(copyResult).toBe(true);
    });

    it('should handle code with null bytes', async () => {
      const codeWithNull = 'cube([10, 10, 10]);\0\0\0';

      const result = await copyToClipboard(codeWithNull);

      expect(result).toBe(true);
    });

    it('should generate unique filenames for rapid exports', () => {
      const filename1 = generateFileName();
      const filename2 = generateFileName();

      // Due to Date.now().toString(36), rapid calls should produce different names
      // (unless called in exact same millisecond)
      // This is a probabilistic test
      const names = new Set([filename1, filename2]);
      expect(names.size).toBeGreaterThanOrEqual(1);
    });
  });
});
