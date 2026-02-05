/**
 * Benchmark Runner for SOTA Pipeline Evaluation
 *
 * Measures:
 * - Sv (Volumetric Similarity): IoU of generated vs target bounding boxes
 * - Sd (Dimensional Accuracy): 1 - |Dg - Dt| / Dg per axis
 * - Success Rate: Percentage of prompts that compile without errors
 *
 * Usage:
 *   npx vitest run tests/benchmark/benchmarkRunner.test.ts
 *   OR
 *   npm run benchmark (add script to package.json)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import goldenSet from './goldenSet.json';

// Types from the golden set - using number[] for JSON compatibility
interface GoldenPrompt {
  id: string;
  category: string;
  difficulty: string;
  prompt: string;
  expectedFeatures: string[];
  targetDimensions: Record<string, number>;
  targetBoundingBox: {
    min: number[];
    max: number[];
  };
  criticalParams: string[];
  usesLibrary?: string;
}

interface BenchmarkResult {
  id: string;
  success: boolean;
  compilationTime: number;
  generationTime: number;
  Sv: number | null;
  Sd: { x: number; y: number; z: number } | null;
  errors: string[];
  warnings: string[];
  generatedBoundingBox?: {
    min: number[];
    max: number[];
  };
}

interface BenchmarkReport {
  timestamp: string;
  version: string;
  totalPrompts: number;
  successCount: number;
  successRate: number;
  averageSv: number;
  averageSd: number;
  averageGenerationTime: number;
  results: BenchmarkResult[];
  categoryBreakdown: Record<
    string,
    {
      total: number;
      success: number;
      avgSv: number;
    }
  >;
}

/**
 * Calculate Volumetric Similarity (Sv) using Intersection over Union
 * Sv = Volume(Intersection) / Volume(Union)
 */
function calculateSv(
  generated: { min: number[]; max: number[] },
  target: { min: number[]; max: number[] }
): number {
  // Calculate intersection box
  const intMin: number[] = [
    Math.max(generated.min[0], target.min[0]),
    Math.max(generated.min[1], target.min[1]),
    Math.max(generated.min[2], target.min[2]),
  ];

  const intMax: number[] = [
    Math.min(generated.max[0], target.max[0]),
    Math.min(generated.max[1], target.max[1]),
    Math.min(generated.max[2], target.max[2]),
  ];

  // Calculate volumes
  const calcVolume = (min: number[], max: number[]): number => {
    const dims = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    // If any dimension is negative, no intersection
    if (dims.some((d) => d < 0)) return 0;
    return dims[0] * dims[1] * dims[2];
  };

  const genVolume = calcVolume(generated.min, generated.max);
  const targetVolume = calcVolume(target.min, target.max);
  const intersectionVolume = calcVolume(intMin, intMax);

  // Union = A + B - Intersection
  const unionVolume = genVolume + targetVolume - intersectionVolume;

  if (unionVolume === 0) return 0;

  return intersectionVolume / unionVolume;
}

/**
 * Calculate Dimensional Accuracy (Sd) per axis
 * Sd = 1 - |Dg - Dt| / Dg
 */
function calculateSd(
  generated: { min: number[]; max: number[] },
  target: { min: number[]; max: number[] }
): { x: number; y: number; z: number } {
  const genDims = [
    generated.max[0] - generated.min[0],
    generated.max[1] - generated.min[1],
    generated.max[2] - generated.min[2],
  ];

  const targetDims = [
    target.max[0] - target.min[0],
    target.max[1] - target.min[1],
    target.max[2] - target.min[2],
  ];

  const calcAxisSd = (gen: number, target: number): number => {
    const denominator = gen > 0 ? gen : target > 0 ? target : 1;
    return Math.max(0, 1 - Math.abs(gen - target) / denominator);
  };

  return {
    x: calcAxisSd(genDims[0], targetDims[0]),
    y: calcAxisSd(genDims[1], targetDims[1]),
    z: calcAxisSd(genDims[2], targetDims[2]),
  };
}

/**
 * Run a single benchmark prompt
 * In real usage, this would call the actual generation pipeline
 */
async function runSingleBenchmark(prompt: GoldenPrompt): Promise<BenchmarkResult> {
  const startTime = Date.now();
  const result: BenchmarkResult = {
    id: prompt.id,
    success: false,
    compilationTime: 0,
    generationTime: 0,
    Sv: null,
    Sd: null,
    errors: [],
    warnings: [],
  };

  try {
    // In a real benchmark, we would:
    // 1. Call orchestrateGeneration with the prompt
    // 2. Get the generated SCAD code
    // 3. Validate it and get the bounding box
    // 4. Compare with target

    // For now, this is a placeholder that tests the framework
    // Actual integration requires browser/WASM environment

    // Simulated call - replace with actual pipeline call in integration tests
    const mockGeneration = await simulateGeneration(prompt);

    result.generationTime = Date.now() - startTime;

    if (mockGeneration.success && mockGeneration.boundingBox) {
      result.success = true;
      result.generatedBoundingBox = mockGeneration.boundingBox;
      result.Sv = calculateSv(mockGeneration.boundingBox, prompt.targetBoundingBox);
      result.Sd = calculateSd(mockGeneration.boundingBox, prompt.targetBoundingBox);
      result.compilationTime = mockGeneration.compilationTime;
    } else {
      result.errors = mockGeneration.errors;
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}

/**
 * Simulated generation for testing the benchmark framework
 * In production, replace with actual pipeline calls
 */
async function simulateGeneration(prompt: GoldenPrompt): Promise<{
  success: boolean;
  boundingBox?: { min: number[]; max: number[] };
  compilationTime: number;
  errors: string[];
}> {
  // Simulate network/processing delay
  await new Promise((r) => setTimeout(r, 100));

  // For framework testing, return slightly varied bounding boxes
  // to verify Sv/Sd calculations work correctly
  const target = prompt.targetBoundingBox;

  // Add some variance to simulate real generation
  const variance = prompt.difficulty === 'very_hard' ? 0.3 : 0.1;

  const randomOffset = () => (Math.random() - 0.5) * variance;

  return {
    success: true,
    boundingBox: {
      min: [
        target.min[0] * (1 + randomOffset()),
        target.min[1] * (1 + randomOffset()),
        target.min[2] * (1 + randomOffset()),
      ],
      max: [
        target.max[0] * (1 + randomOffset()),
        target.max[1] * (1 + randomOffset()),
        target.max[2] * (1 + randomOffset()),
      ],
    },
    compilationTime: 500 + Math.random() * 1000,
    errors: [],
  };
}

/**
 * Generate benchmark report
 */
function generateReport(results: BenchmarkResult[]): BenchmarkReport {
  const successResults = results.filter((r) => r.success);

  // Calculate category breakdown
  const categoryMap = new Map<string, { total: number; success: number; svSum: number }>();

  for (const result of results) {
    const prompt = (goldenSet.prompts as GoldenPrompt[]).find((p) => p.id === result.id);
    if (!prompt) continue;

    const cat = prompt.category;
    const existing = categoryMap.get(cat) || { total: 0, success: 0, svSum: 0 };
    existing.total++;
    if (result.success) {
      existing.success++;
      existing.svSum += result.Sv || 0;
    }
    categoryMap.set(cat, existing);
  }

  const categoryBreakdown: Record<string, { total: number; success: number; avgSv: number }> = {};

  categoryMap.forEach((value, key) => {
    categoryBreakdown[key] = {
      total: value.total,
      success: value.success,
      avgSv: value.success > 0 ? value.svSum / value.success : 0,
    };
  });

  // Calculate averages
  const avgSv =
    successResults.length > 0
      ? successResults.reduce((sum, r) => sum + (r.Sv || 0), 0) / successResults.length
      : 0;

  const avgSd =
    successResults.length > 0
      ? successResults.reduce((sum, r) => {
          if (!r.Sd) return sum;
          return sum + (r.Sd.x + r.Sd.y + r.Sd.z) / 3;
        }, 0) / successResults.length
      : 0;

  const avgGenTime =
    results.length > 0 ? results.reduce((sum, r) => sum + r.generationTime, 0) / results.length : 0;

  return {
    timestamp: new Date().toISOString(),
    version: goldenSet.version,
    totalPrompts: results.length,
    successCount: successResults.length,
    successRate: results.length > 0 ? successResults.length / results.length : 0,
    averageSv: avgSv,
    averageSd: avgSd,
    averageGenerationTime: avgGenTime,
    results,
    categoryBreakdown,
  };
}

// ============================================================================
// Vitest Test Suite
// ============================================================================

describe('Benchmark Framework', () => {
  it('should load golden set correctly', () => {
    expect(goldenSet.prompts).toHaveLength(10);
    expect(goldenSet.version).toBe('1.0.0');
  });

  it('should calculate Sv correctly for identical boxes', () => {
    const box = {
      min: [0, 0, 0] as [number, number, number],
      max: [10, 10, 10] as [number, number, number],
    };
    expect(calculateSv(box, box)).toBe(1);
  });

  it('should calculate Sv correctly for non-overlapping boxes', () => {
    const box1 = {
      min: [0, 0, 0] as [number, number, number],
      max: [10, 10, 10] as [number, number, number],
    };
    const box2 = {
      min: [20, 20, 20] as [number, number, number],
      max: [30, 30, 30] as [number, number, number],
    };
    expect(calculateSv(box1, box2)).toBe(0);
  });

  it('should calculate Sv correctly for partial overlap', () => {
    const box1 = {
      min: [0, 0, 0] as [number, number, number],
      max: [10, 10, 10] as [number, number, number],
    };
    const box2 = {
      min: [5, 5, 5] as [number, number, number],
      max: [15, 15, 15] as [number, number, number],
    };
    // Intersection: 5x5x5 = 125
    // Union: 1000 + 1000 - 125 = 1875
    // Sv = 125/1875 = 0.0667
    const sv = calculateSv(box1, box2);
    expect(sv).toBeCloseTo(0.0667, 3);
  });

  it('should calculate Sd correctly for identical dimensions', () => {
    const box = {
      min: [0, 0, 0] as [number, number, number],
      max: [10, 10, 10] as [number, number, number],
    };
    const sd = calculateSd(box, box);
    expect(sd.x).toBe(1);
    expect(sd.y).toBe(1);
    expect(sd.z).toBe(1);
  });

  it('should calculate Sd correctly for 20% deviation', () => {
    const box1 = {
      min: [0, 0, 0] as [number, number, number],
      max: [10, 10, 10] as [number, number, number],
    };
    const box2 = {
      min: [0, 0, 0] as [number, number, number],
      max: [12, 10, 10] as [number, number, number],
    };
    const sd = calculateSd(box1, box2);
    // X: 1 - |10-12|/10 = 1 - 0.2 = 0.8
    expect(sd.x).toBeCloseTo(0.8, 2);
    expect(sd.y).toBe(1);
    expect(sd.z).toBe(1);
  });
});

describe('Golden Set Prompts', () => {
  const prompts = goldenSet.prompts as GoldenPrompt[];

  it('should have required fields for all prompts', () => {
    for (const prompt of prompts) {
      expect(prompt.id).toBeDefined();
      expect(prompt.category).toBeDefined();
      expect(prompt.difficulty).toBeDefined();
      expect(prompt.prompt).toBeDefined();
      expect(prompt.targetBoundingBox).toBeDefined();
      expect(prompt.targetBoundingBox.min).toHaveLength(3);
      expect(prompt.targetBoundingBox.max).toHaveLength(3);
    }
  });

  it('should have valid bounding boxes', () => {
    for (const prompt of prompts) {
      const { min, max } = prompt.targetBoundingBox;
      expect(max[0]).toBeGreaterThanOrEqual(min[0]);
      expect(max[1]).toBeGreaterThanOrEqual(min[1]);
      expect(max[2]).toBeGreaterThanOrEqual(min[2]);
    }
  });

  it('should cover multiple categories', () => {
    const categories = new Set(prompts.map((p) => p.category));
    expect(categories.size).toBeGreaterThanOrEqual(5);
  });

  it('should include hard and very_hard difficulty prompts', () => {
    const difficulties = new Set(prompts.map((p) => p.difficulty));
    expect(difficulties.has('hard')).toBe(true);
    expect(difficulties.has('very_hard')).toBe(true);
  });
});

describe('Benchmark Framework (Unit Tests - Simulated)', () => {
  let report: BenchmarkReport;

  beforeAll(async () => {
    const prompts = goldenSet.prompts as GoldenPrompt[];
    const results = await Promise.all(prompts.map(runSingleBenchmark));
    report = generateReport(results);
  });

  it('should run all prompts', () => {
    expect(report.totalPrompts).toBe(10);
  });

  it('should generate valid Sv scores', () => {
    for (const result of report.results) {
      if (result.success && result.Sv !== null) {
        expect(result.Sv).toBeGreaterThanOrEqual(0);
        expect(result.Sv).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should generate valid Sd scores', () => {
    for (const result of report.results) {
      if (result.success && result.Sd !== null) {
        expect(result.Sd.x).toBeGreaterThanOrEqual(0);
        expect(result.Sd.x).toBeLessThanOrEqual(1);
        expect(result.Sd.y).toBeGreaterThanOrEqual(0);
        expect(result.Sd.y).toBeLessThanOrEqual(1);
        expect(result.Sd.z).toBeGreaterThanOrEqual(0);
        expect(result.Sd.z).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should provide category breakdown', () => {
    expect(Object.keys(report.categoryBreakdown).length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Real Pipeline Benchmark (Browser-Only, Gated by POLYGEN_BENCHMARK env var)
// ============================================================================

/**
 * Real pipeline execution — requires browser environment + API keys
 *
 * ENVIRONMENT REQUIREMENTS:
 * - Must run in Vitest Browser Mode (vitest --browser) or Playwright
 * - orchestrateGeneration() depends on Web Workers + WASM (browser-only)
 * - Requires GEMINI_API_KEY and ANTHROPIC_API_KEY environment variables
 * - Costs real API tokens. Run manually, never in CI.
 *
 * Usage:
 *   POLYGEN_BENCHMARK=true npx vitest --browser.enabled run tests/benchmark/benchmarkRunner.test.ts
 */
async function executeRealPipeline(prompt: GoldenPrompt): Promise<{
  success: boolean;
  boundingBox?: { min: number[]; max: number[] };
  compilationTime: number;
  errors: string[];
}> {
  // Dynamic import — only resolves in browser environment with WASM support
  const { orchestrateGeneration } = await import('../../services/agentOrchestrator');

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const asset = await orchestrateGeneration(
      { userPrompt: prompt.prompt, conversationHistory: [], isEdit: false },
      {
        onStepChange: () => {},
        onGSTGenerated: () => {},
        onCodeGenerated: () => {},
        onCodeChunk: () => {},
        onValidationComplete: (res) => {
          if (!res.success) errors.push(...res.errors);
        },
        onSmartFixesGenerated: () => {},
        onPreviewImageGenerated: () => {},
        onError: (err) => errors.push(err.message),
      },
      new AbortController().signal
    );

    const success = asset.validationResult?.success ?? false;
    return {
      success,
      boundingBox: asset.validationResult?.boundingBox as
        | { min: number[]; max: number[] }
        | undefined,
      compilationTime: Date.now() - startTime,
      errors,
    };
  } catch (e: unknown) {
    return { success: false, compilationTime: 0, errors: [(e as Error).message] };
  }
}

const IS_REAL_BENCHMARK = process.env.POLYGEN_BENCHMARK === 'true';

describe.skipIf(!IS_REAL_BENCHMARK)('Benchmark Runner (REAL Pipeline)', () => {
  // REQUIRES: Vitest Browser Mode (--browser.enabled) for WASM + Worker APIs
  // REQUIRES: API keys (GEMINI_API_KEY, ANTHROPIC_API_KEY)
  // Command: POLYGEN_BENCHMARK=true npx vitest --browser.enabled run tests/benchmark/benchmarkRunner.test.ts

  it('should compile a simple box prompt', async () => {
    const result = await executeRealPipeline(goldenSet.prompts[0] as GoldenPrompt);
    expect(result.success).toBe(true);
  }, 120_000); // 2 min timeout for API calls

  it('should produce valid bounding box for first prompt', async () => {
    const prompt = goldenSet.prompts[0] as GoldenPrompt;
    const result = await executeRealPipeline(prompt);
    if (result.success && result.boundingBox) {
      const sv = calculateSv(result.boundingBox, prompt.targetBoundingBox);
      expect(sv).toBeGreaterThan(0);
    }
  }, 120_000);
});

// Export for external use
export {
  calculateSv,
  calculateSd,
  runSingleBenchmark,
  generateReport,
  executeRealPipeline,
  type GoldenPrompt,
  type BenchmarkResult,
  type BenchmarkReport,
};
