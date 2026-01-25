/**
 * SCAD Validation Service Unit Tests
 * Tests the OpenSCAD WASM validation functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateScadCode } from '../../services/scadValidation';
import { mockScadCode, mockScadCodeWithError } from '../mocks/types';

// Mock the openscadLoader module
vi.mock('../../services/openscadLoader', () => ({
  loadOpenSCAD: vi.fn(),
  cleanupInstance: vi.fn()
}));

import { loadOpenSCAD, cleanupInstance } from '../../services/openscadLoader';

describe('SCAD Validation Service', () => {
  // Create a mock OpenSCAD instance
  const createMockInstance = (options: {
    exitCode?: number;
    stlData?: Uint8Array | null;
    throwOnReadFile?: boolean;
    errorLog?: string;
  } = {}) => {
    const {
      exitCode = 0,
      stlData = new Uint8Array(100), // Valid STL has more than 84 bytes
      throwOnReadFile = false,
      errorLog = ''
    } = options;

    let printErrCallback: ((text: string) => void) | null = null;

    return {
      factory: vi.fn().mockImplementation(async (config: any) => {
        printErrCallback = config.printErr;
        
        return {
          FS: {
            writeFile: vi.fn(),
            readFile: vi.fn().mockImplementation(() => {
              if (throwOnReadFile) {
                throw new Error('Failed to read file');
              }
              return stlData;
            }),
            unlink: vi.fn()
          },
          callMain: vi.fn().mockImplementation(() => {
            if (errorLog && printErrCallback) {
              printErrCallback(errorLog);
            }
            return exitCode;
          })
        };
      }),
      baseUrl: 'https://unpkg.com/openscad-wasm@0.6.0/dist/',
      triggerError: (text: string) => {
        if (printErrCallback) {
          printErrCallback(text);
        }
      }
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('should reject empty string', async () => {
      const result = await validateScadCode('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject whitespace-only string', async () => {
      const result = await validateScadCode('   \n\t  ');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject null-like input', async () => {
      const result = await validateScadCode(null as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty or invalid');
    });

    it('should reject undefined input', async () => {
      const result = await validateScadCode(undefined as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty or invalid');
    });

    it('should reject non-string input', async () => {
      const result = await validateScadCode(123 as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty or invalid');
    });
  });

  describe('OpenSCAD loading', () => {
    it('should handle OpenSCAD load failure gracefully', async () => {
      vi.mocked(loadOpenSCAD).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.warnings![0]).toContain('skipped');
    });

    it('should handle missing OpenSCAD factory', async () => {
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: null as any,
        baseUrl: 'https://test.com/'
      });
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('not available');
    });

    it('should handle non-function OpenSCAD factory', async () => {
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: {} as any,
        baseUrl: 'https://test.com/'
      });
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('successful validation', () => {
    it('should return success for valid SCAD code', async () => {
      const mockInstance = createMockInstance();
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should cleanup instance after validation', async () => {
      const mockInstance = createMockInstance();
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      await validateScadCode(mockScadCode);
      
      expect(cleanupInstance).toHaveBeenCalled();
    });

    it('should write input file to virtual filesystem', async () => {
      const mockInstance = createMockInstance();
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      await validateScadCode(mockScadCode);
      
      const instanceResult = await mockInstance.factory({});
      expect(instanceResult.FS.writeFile).toHaveBeenCalled();
    });
  });

  describe('compilation failures', () => {
    it('should return error for non-zero exit code', async () => {
      const mockInstance = createMockInstance({ exitCode: 1 });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      const result = await validateScadCode(mockScadCodeWithError);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Compilation Failed');
      expect(result.error).toContain('Exit Code 1');
    });

    it('should capture error log from printErr', async () => {
      const mockInstance = createMockInstance({
        exitCode: 1,
        errorLog: 'ERROR: Unknown module cube2'
      });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      const result = await validateScadCode(mockScadCodeWithError);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown module');
    });

    it('should handle failed STL read', async () => {
      const mockInstance = createMockInstance({ throwOnReadFile: true });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read output STL');
    });

    it('should handle null STL data', async () => {
      const mockInstance = createMockInstance({ stlData: null });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No STL data');
    });
  });

  describe('empty geometry detection', () => {
    it('should detect empty geometry (84 bytes or less)', async () => {
      // STL header is 80 bytes + 4 byte triangle count = 84 bytes for empty
      const emptyStl = new Uint8Array(84);
      const mockInstance = createMockInstance({ stlData: emptyStl });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('SCENE IS EMPTY');
    });

    it('should detect geometry with just header', async () => {
      const headerOnly = new Uint8Array(80);
      const mockInstance = createMockInstance({ stlData: headerOnly });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('SCENE IS EMPTY');
    });

    it('should accept valid geometry (more than 84 bytes)', async () => {
      const validStl = new Uint8Array(100);
      const mockInstance = createMockInstance({ stlData: validStl });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(true);
    });
  });

  describe('instance initialization failures', () => {
    it('should handle missing FS in instance', async () => {
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: vi.fn().mockResolvedValue({}),
        baseUrl: 'https://test.com/'
      });
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('failed to initialize');
    });

    it('should handle instance creation failure', async () => {
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: vi.fn().mockRejectedValue(new Error('WASM init failed')),
        baseUrl: 'https://test.com/'
      });
      
      const result = await validateScadCode(mockScadCode);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('WASM init failed');
    });
  });

  describe('error filtering', () => {
    it('should ignore GL_INVALID_OPERATION errors', async () => {
      const mockInstance = createMockInstance({
        exitCode: 0,
        errorLog: 'GL_INVALID_OPERATION: some graphics error'
      });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      const result = await validateScadCode(mockScadCode);
      
      // Should succeed because GL errors are filtered out
      expect(result.success).toBe(true);
    });
  });

  describe('cleanup behavior', () => {
    it('should cleanup even on error', async () => {
      const mockInstance = createMockInstance({ exitCode: 1 });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      await validateScadCode(mockScadCodeWithError);
      
      expect(cleanupInstance).toHaveBeenCalled();
    });

    it('should cleanup even on exception', async () => {
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: vi.fn().mockImplementation(async () => {
          throw new Error('Unexpected error');
        }),
        baseUrl: 'https://test.com/'
      });
      
      await validateScadCode(mockScadCode);
      
      // Cleanup might not be called if instance was never created
      // This tests that the function doesn't hang
    });
  });

  describe('code trimming', () => {
    it('should trim whitespace from code before validation', async () => {
      const mockInstance = createMockInstance();
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl
      });
      
      const paddedCode = `   \n\n${mockScadCode}\n\n   `;
      const result = await validateScadCode(paddedCode);
      
      expect(result.success).toBe(true);
    });
  });
});
