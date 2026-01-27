import { describe, expect, it, vi } from 'vitest';
import { validatorClient } from '../../services/validatorClient';
import { workerValidationService } from '../../services/workerValidationService';

// Mock the worker service since it requires a browser/WASM
vi.mock('../../services/workerValidationService', () => ({
  workerValidationService: {
    validate: vi.fn(),
    isAvailable: () => true,
  },
}));

describe('validatorClient SOTA Metrics', () => {
  it('should pass if P_succ >= 0.8', async () => {
    // Mock a perfect match
    vi.mocked(workerValidationService.validate).mockResolvedValue({
      success: true,
      isManifold: true,
      volume: 1000,
      boundingBox: { min: [0, 0, 0], max: [10, 10, 10] },
      error: undefined,
      warnings: [],
      triangleCount: 100,
    });

    const gst = {
      boundingBox: { min: [0, 0, 0], max: [10, 10, 10] },
      root: { id: '1', type: 'cube' as const, parameters: { size: [10, 10, 10] }, children: [] },
    };

    const result = await validatorClient.validate({
      scadCode: 'cube(10);',
      gst: gst as any,
    });

    expect(result.success).toBe(true);
    expect(result.pSucc).toBeGreaterThanOrEqual(0.8);
  });

  it('should fail if geometry is non-manifold (M=0 penalty)', async () => {
    // Mock a non-manifold result
    vi.mocked(workerValidationService.validate).mockResolvedValue({
      success: true,
      isManifold: false, // BROKEN MESH
      volume: 1000,
      boundingBox: { min: [0, 0, 0], max: [10, 10, 10] },
      error: 'NON-MANIFOLD GEOMETRY',
      warnings: [],
      triangleCount: 100,
    });

    const gst = {
      boundingBox: { min: [0, 0, 0], max: [10, 10, 10] },
      root: { id: '1', type: 'cube' as const, parameters: {}, children: [] },
    };

    const result = await validatorClient.validate({
      scadCode: 'cube(10);',
      gst: gst as any,
    });

    // Even if Sv/Sd are perfect, M=0 makes P_succ = 0
    expect(result.pSucc).toBe(0);
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('SOTA QUALITY GATE FAILED'));
  });

  it('should fail if volume mismatch is high (Sv < 0.8)', async () => {
    // Mock a "Hollow Box" result (Low volume, but high bounding box)
    vi.mocked(workerValidationService.validate).mockResolvedValue({
      success: true,
      isManifold: true,
      volume: 100, // TARGET IS 1000
      boundingBox: { min: [0, 0, 0], max: [10, 10, 10] }, // BBox looks correct!
      error: undefined,
      warnings: [],
      triangleCount: 100,
    });

    const gst = {
      boundingBox: { min: [0, 0, 0], max: [10, 10, 10] },
      root: { id: '1', type: 'cube' as const, parameters: {}, children: [] },
    };

    const result = await validatorClient.validate({
      scadCode: 'cube(10);',
      gst: gst as any,
    });

    // Sv = 1 - |100 - 1000| / 1000 = 1 - 0.9 = 0.1
    // P_succ = 1 * (0.65 * 0.1 + 0.35 * 1.0) = 0.065 + 0.35 = 0.415
    expect(result.pSucc).toBeLessThan(0.8);
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('SOTA QUALITY GATE FAILED'));
  });
});
