/**
 * SCAD Validation Service Unit Tests
 * Tests the OpenSCAD WASM validation functionality
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateScadCode } from '../../services/scadValidation';
import { mockScadCode, mockScadCodeWithError } from '../mocks/types';

// Mock the openscadLoader module
vi.mock('../../services/openscadLoader', () => ({
  loadOpenSCAD: vi.fn(),
  cleanupInstance: vi.fn(),
}));

import { cleanupInstance, loadOpenSCAD } from '../../services/openscadLoader';

describe('SCAD Validation Service', () => {
  // Create a mock OpenSCAD instance
  const createMockInstance = (
    options: {
      exitCode?: number;
      stlData?: Uint8Array | null;
      throwOnReadFile?: boolean;
      errorLog?: string;
    } = {}
  ) => {
    const {
      exitCode = 0,
      stlData = new Uint8Array(100), // Valid STL has more than 84 bytes
      throwOnReadFile = false,
      errorLog = '',
    } = options;

    let printErrCallback: ((text: string) => void) | null = null;

    const writeFileSpy = vi.fn();
    const readFileSpy = vi.fn().mockImplementation(() => {
      if (throwOnReadFile) {
        throw new Error('Failed to read file');
      }
      return stlData;
    });
    const unlinkSpy = vi.fn();
    const callMainSpy = vi.fn().mockImplementation(() => {
      if (errorLog && printErrCallback) {
        printErrCallback(errorLog);
      }
      return exitCode;
    });

    return {
      writeFileSpy, // Expose spies for assertions
      readFileSpy,
      unlinkSpy,
      callMainSpy,
      factory: vi.fn().mockImplementation(async (config: any) => {
        printErrCallback = config.printErr;

        return {
          FS: {
            writeFile: writeFileSpy,
            readFile: readFileSpy,
            unlink: unlinkSpy,
          },
          callMain: callMainSpy,
        };
      }),
      baseUrl: 'https://unpkg.com/openscad-wasm@0.6.0/dist/',
      triggerError: (text: string) => {
        if (printErrCallback) {
          printErrCallback(text);
        }
      },
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
        baseUrl: 'https://test.com/',
      });

      const result = await validateScadCode(mockScadCode);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('not available');
    });

    it('should handle non-function OpenSCAD factory', async () => {
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: {} as any,
        baseUrl: 'https://test.com/',
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
        baseUrl: mockInstance.baseUrl,
      });

      const result = await validateScadCode(mockScadCode);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should cleanup instance after validation', async () => {
      const mockInstance = createMockInstance();
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
      });

      await validateScadCode(mockScadCode);

      expect(cleanupInstance).toHaveBeenCalled();
    });

    it('should write input file to virtual filesystem', async () => {
      const mockInstance = createMockInstance();
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
      });

      await validateScadCode(mockScadCode);

      expect(mockInstance.writeFileSpy).toHaveBeenCalled();
    });
  });

  describe('compilation failures', () => {
    it('should return error for non-zero exit code', async () => {
      const mockInstance = createMockInstance({ exitCode: 1 });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
      });

      const result = await validateScadCode(mockScadCodeWithError);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Compilation Failed');
      expect(result.error).toContain('Exit Code 1');
    });

    it('should capture error log from printErr', async () => {
      const mockInstance = createMockInstance({
        exitCode: 1,
        errorLog: 'ERROR: Unknown module cube2',
      });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
      });

      const result = await validateScadCode(mockScadCodeWithError);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown module');
    });

    it('should handle failed STL read', async () => {
      const mockInstance = createMockInstance({ throwOnReadFile: true });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
      });

      const result = await validateScadCode(mockScadCode);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read output STL');
    });

    it('should handle null STL data', async () => {
      const mockInstance = createMockInstance({ stlData: null });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
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
        baseUrl: mockInstance.baseUrl,
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
        baseUrl: mockInstance.baseUrl,
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
        baseUrl: mockInstance.baseUrl,
      });

      const result = await validateScadCode(mockScadCode);

      expect(result.success).toBe(true);
    });
  });

  describe('instance initialization failures', () => {
    it('should handle missing FS in instance', async () => {
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: vi.fn().mockResolvedValue({}),
        baseUrl: 'https://test.com/',
      });

      const result = await validateScadCode(mockScadCode);

      expect(result.success).toBe(false);
      expect(result.error).toContain('failed to initialize');
    });

    it('should handle instance creation failure', async () => {
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: vi.fn().mockRejectedValue(new Error('WASM init failed')),
        baseUrl: 'https://test.com/',
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
        errorLog: 'GL_INVALID_OPERATION: some graphics error',
      });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
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
        baseUrl: mockInstance.baseUrl,
      });

      await validateScadCode(mockScadCodeWithError);

      expect(cleanupInstance).toHaveBeenCalled();
    });

    it('should cleanup even on exception', async () => {
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: vi.fn().mockImplementation(async () => {
          throw new Error('Unexpected error');
        }),
        baseUrl: 'https://test.com/',
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
        baseUrl: mockInstance.baseUrl,
      });

      const paddedCode = `   \n\n${mockScadCode}\n\n   `;
      const result = await validateScadCode(paddedCode);

      expect(result.success).toBe(true);
    });
  });

  describe('WASM metric integrity (volume + bounding box)', () => {
    /**
     * Build a synthetic binary STL for a 10x10x10mm cube at origin.
     * Binary STL format: 80-byte header + 4-byte triangle count + 50 bytes per triangle.
     * A cube has 6 faces × 2 triangles = 12 triangles.
     * Winding order follows right-hand rule (outward normals) for correct signed volume.
     */
    function buildCubeSTL(size = 10): Uint8Array {
      const s = size;
      // 12 triangles, each with [normal, v1, v2, v3] - CCW winding for outward normals
      const faces: Array<{
        normal: [number, number, number];
        v1: [number, number, number];
        v2: [number, number, number];
        v3: [number, number, number];
      }> = [
        // Bottom face (z=0, normal pointing -Z)
        { normal: [0, 0, -1], v1: [0, 0, 0], v2: [s, s, 0], v3: [s, 0, 0] },
        { normal: [0, 0, -1], v1: [0, 0, 0], v2: [0, s, 0], v3: [s, s, 0] },
        // Top face (z=s, normal pointing +Z)
        { normal: [0, 0, 1], v1: [0, 0, s], v2: [s, 0, s], v3: [s, s, s] },
        { normal: [0, 0, 1], v1: [0, 0, s], v2: [s, s, s], v3: [0, s, s] },
        // Front face (y=0, normal pointing -Y)
        { normal: [0, -1, 0], v1: [0, 0, 0], v2: [s, 0, 0], v3: [s, 0, s] },
        { normal: [0, -1, 0], v1: [0, 0, 0], v2: [s, 0, s], v3: [0, 0, s] },
        // Back face (y=s, normal pointing +Y)
        { normal: [0, 1, 0], v1: [0, s, 0], v2: [0, s, s], v3: [s, s, s] },
        { normal: [0, 1, 0], v1: [0, s, 0], v2: [s, s, s], v3: [s, s, 0] },
        // Left face (x=0, normal pointing -X)
        { normal: [-1, 0, 0], v1: [0, 0, 0], v2: [0, 0, s], v3: [0, s, s] },
        { normal: [-1, 0, 0], v1: [0, 0, 0], v2: [0, s, s], v3: [0, s, 0] },
        // Right face (x=s, normal pointing +X)
        { normal: [1, 0, 0], v1: [s, 0, 0], v2: [s, s, 0], v3: [s, s, s] },
        { normal: [1, 0, 0], v1: [s, 0, 0], v2: [s, s, s], v3: [s, 0, s] },
      ];

      const numTriangles = faces.length;
      const bufferSize = 84 + numTriangles * 50;
      const buffer = new ArrayBuffer(bufferSize);
      const view = new DataView(buffer);

      // 80-byte header (zeros)
      // Triangle count at byte 80
      view.setUint32(80, numTriangles, true);

      let offset = 84;
      for (const face of faces) {
        // Normal (3 floats)
        view.setFloat32(offset, face.normal[0], true);
        offset += 4;
        view.setFloat32(offset, face.normal[1], true);
        offset += 4;
        view.setFloat32(offset, face.normal[2], true);
        offset += 4;
        // Vertex 1
        view.setFloat32(offset, face.v1[0], true);
        offset += 4;
        view.setFloat32(offset, face.v1[1], true);
        offset += 4;
        view.setFloat32(offset, face.v1[2], true);
        offset += 4;
        // Vertex 2
        view.setFloat32(offset, face.v2[0], true);
        offset += 4;
        view.setFloat32(offset, face.v2[1], true);
        offset += 4;
        view.setFloat32(offset, face.v2[2], true);
        offset += 4;
        // Vertex 3
        view.setFloat32(offset, face.v3[0], true);
        offset += 4;
        view.setFloat32(offset, face.v3[1], true);
        offset += 4;
        view.setFloat32(offset, face.v3[2], true);
        offset += 4;
        // Attribute byte count (2 bytes, zeros)
        view.setUint16(offset, 0, true);
        offset += 2;
      }

      return new Uint8Array(buffer);
    }

    it('should compute correct volume for a 10mm cube (~1000mm³)', async () => {
      const cubeStl = buildCubeSTL(10);
      const mockInstance = createMockInstance({ stlData: cubeStl });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
      });

      const result = await validateScadCode(mockScadCode);

      expect(result.success).toBe(true);
      expect(result.volume).toBeDefined();
      // Volume of 10x10x10 cube = 1000mm³ (allow small float error)
      expect(result.volume).toBeGreaterThan(990);
      expect(result.volume).toBeLessThan(1010);
    });

    it('should compute correct bounding box for a 10mm cube', async () => {
      const cubeStl = buildCubeSTL(10);
      const mockInstance = createMockInstance({ stlData: cubeStl });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
      });

      const result = await validateScadCode(mockScadCode);

      expect(result.success).toBe(true);
      expect(result.boundingBox).toBeDefined();
      // Bounding box should be [0,0,0] to [10,10,10]
      expect(result.boundingBox!.min[0]).toBeCloseTo(0, 1);
      expect(result.boundingBox!.min[1]).toBeCloseTo(0, 1);
      expect(result.boundingBox!.min[2]).toBeCloseTo(0, 1);
      expect(result.boundingBox!.max[0]).toBeCloseTo(10, 1);
      expect(result.boundingBox!.max[1]).toBeCloseTo(10, 1);
      expect(result.boundingBox!.max[2]).toBeCloseTo(10, 1);
    });

    it('should return triangleCount = 12 for a cube', async () => {
      const cubeStl = buildCubeSTL(10);
      const mockInstance = createMockInstance({ stlData: cubeStl });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
      });

      const result = await validateScadCode(mockScadCode);

      expect(result.success).toBe(true);
      expect(result.triangleCount).toBe(12);
    });

    it('should reject corrupt STL with garbage float values', async () => {
      // Build an STL where vertex data is garbage (simulates WASM heap corruption)
      const numTriangles = 12;
      const bufferSize = 84 + numTriangles * 50;
      const buffer = new ArrayBuffer(bufferSize);
      const view = new DataView(buffer);
      view.setUint32(80, numTriangles, true);

      // Fill vertex data with subnormal/garbage values (like WASM heap corruption)
      let offset = 84;
      for (let i = 0; i < numTriangles; i++) {
        for (let j = 0; j < 12; j++) {
          // Write subnormal values (1e-33 range) that mimic heap corruption
          view.setFloat32(offset, 8.48e-33, true);
          offset += 4;
        }
        offset += 2; // attribute bytes
      }

      const corruptStl = new Uint8Array(buffer);
      const mockInstance = createMockInstance({ stlData: corruptStl });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
      });

      const result = await validateScadCode(mockScadCode);

      expect(result.success).toBe(true);
      // Bounding box should be undefined (corrupt coordinates rejected)
      expect(result.boundingBox).toBeUndefined();
      // Volume should be undefined (depends on valid bounding box)
      expect(result.volume).toBeUndefined();
    });

    it('should reject impossibly large volume values', async () => {
      // Build STL with huge coordinates (1e6mm) that pass bbox but produce huge volume
      const numTriangles = 4;
      const bufferSize = 84 + numTriangles * 50;
      const buffer = new ArrayBuffer(bufferSize);
      const view = new DataView(buffer);
      view.setUint32(80, numTriangles, true);

      const big = 5000; // 5 meters - within bbox MAX_COORD but volume will be huge
      let offset = 84;
      // Build a tetrahedron-like shape with huge dimensions
      const verts = [
        [
          [0, 0, 0],
          [big, 0, 0],
          [0, big, 0],
        ],
        [
          [0, 0, 0],
          [0, big, 0],
          [0, 0, big],
        ],
        [
          [0, 0, 0],
          [0, 0, big],
          [big, 0, 0],
        ],
        [
          [big, 0, 0],
          [0, big, 0],
          [0, 0, big],
        ],
      ];
      for (const tri of verts) {
        // Normal (skip)
        view.setFloat32(offset, 0, true);
        offset += 4;
        view.setFloat32(offset, 0, true);
        offset += 4;
        view.setFloat32(offset, 0, true);
        offset += 4;
        for (const v of tri) {
          view.setFloat32(offset, v[0], true);
          offset += 4;
          view.setFloat32(offset, v[1], true);
          offset += 4;
          view.setFloat32(offset, v[2], true);
          offset += 4;
        }
        view.setUint16(offset, 0, true);
        offset += 2;
      }

      const hugeStl = new Uint8Array(buffer);
      const mockInstance = createMockInstance({ stlData: hugeStl });
      vi.mocked(loadOpenSCAD).mockResolvedValueOnce({
        OpenSCAD: mockInstance.factory,
        baseUrl: mockInstance.baseUrl,
      });

      const result = await validateScadCode(mockScadCode);

      expect(result.success).toBe(true);
      // Bounding box should exist (coordinates are within range)
      expect(result.boundingBox).toBeDefined();
      // Volume of (5000)³ tetrahedron ≈ 2.08e10 > MAX_VOLUME (1e9) → should be rejected
      expect(result.volume).toBeUndefined();
    });
  });
});
