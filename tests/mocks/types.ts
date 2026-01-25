/**
 * Test Mock Data
 * Reusable mock objects for testing
 */

import type {
  GeometricStructureTree,
  GSTComponent,
  GSTParameter,
  ValidationResult,
  SmartQuickFix,
  SpecData,
  GeneratedAsset,
  OrchestratorCallbacks,
  WorkflowStep
} from '../../types';
import { vi } from 'vitest';

// ============================================
// Mock GST Data
// ============================================

export const mockGSTParameter: GSTParameter = {
  name: 'width',
  value: 50,
  unit: 'mm',
  description: 'Overall width of the part'
};

export const mockGSTComponent: GSTComponent = {
  id: 'base',
  name: 'base_plate',
  type: 'cuboid',
  parameters: [
    { name: 'width', value: 50, unit: 'mm' },
    { name: 'height', value: 30, unit: 'mm' },
    { name: 'depth', value: 5, unit: 'mm' }
  ],
  children: []
};

export const mockGSTWithScrewHoles: GSTComponent = {
  id: 'main',
  name: 'assembly',
  type: 'union',
  children: [
    {
      id: 'base',
      name: 'base_plate',
      type: 'cuboid',
      parameters: [
        { name: 'width', value: 50, unit: 'mm' },
        { name: 'height', value: 30, unit: 'mm' },
        { name: 'depth', value: 5, unit: 'mm' }
      ]
    },
    {
      id: 'hole1',
      name: 'mounting_hole',
      type: 'screw_hole',
      parameters: [
        { name: 'diameter', value: 3.4, unit: 'mm' },
        { name: 'depth', value: 5, unit: 'mm' }
      ],
      booleanOp: 'subtract'
    }
  ]
};

export const mockGSTWithGear: GSTComponent = {
  id: 'main',
  name: 'gear_assembly',
  type: 'union',
  children: [
    {
      id: 'gear1',
      name: 'main_gear',
      type: 'spur_gear',
      parameters: [
        { name: 'teeth', value: 24, unit: 'count' },
        { name: 'module', value: 2, unit: 'mm' },
        { name: 'thickness', value: 5, unit: 'mm' }
      ]
    }
  ]
};

export const mockGSTWithThreads: GSTComponent = {
  id: 'main',
  name: 'threaded_part',
  type: 'union',
  children: [
    {
      id: 'body',
      name: 'cylinder_body',
      type: 'cylinder',
      parameters: [
        { name: 'diameter', value: 10, unit: 'mm' },
        { name: 'height', value: 20, unit: 'mm' }
      ]
    },
    {
      id: 'thread1',
      name: 'external_thread',
      type: 'ext_thread',
      parameters: [
        { name: 'pitch', value: 1.5, unit: 'mm' },
        { name: 'length', value: 15, unit: 'mm' }
      ]
    }
  ]
};

export const mockGSTWithRoundedCube: GSTComponent = {
  id: 'main',
  name: 'rounded_box',
  type: 'rcube',
  parameters: [
    { name: 'width', value: 50, unit: 'mm' },
    { name: 'height', value: 30, unit: 'mm' },
    { name: 'depth', value: 20, unit: 'mm' },
    { name: 'radius', value: 3, unit: 'mm' }
  ]
};

export const mockGST: GeometricStructureTree = {
  version: '1.0',
  name: 'test_model',
  description: 'A test model for unit testing',
  globalParameters: [
    { name: 'wall_thickness', value: 2, unit: 'mm', description: 'Wall thickness' },
    { name: 'hole_diameter', value: 5, unit: 'mm', description: 'Mounting hole size' }
  ],
  root: mockGSTComponent,
  boundingBox: {
    min: [0, 0, 0],
    max: [50, 30, 5]
  },
  printOrientation: 'flat'
};

export const mockGSTWithScrewHolesTree: GeometricStructureTree = {
  version: '1.0',
  name: 'mounting_plate',
  description: 'A plate with screw holes',
  globalParameters: [
    { name: 'wall_thickness', value: 2, unit: 'mm' },
    { name: 'hole_diameter', value: 3.4, unit: 'mm' }
  ],
  root: mockGSTWithScrewHoles,
  boundingBox: {
    min: [0, 0, 0],
    max: [50, 30, 5]
  }
};

export const mockGSTWithGearTree: GeometricStructureTree = {
  version: '1.0',
  name: 'gear_model',
  description: 'A spur gear',
  globalParameters: [],
  root: mockGSTWithGear
};

export const mockGSTWithThreadsTree: GeometricStructureTree = {
  version: '1.0',
  name: 'threaded_model',
  description: 'A part with external threads',
  globalParameters: [],
  root: mockGSTWithThreads
};

export const mockGSTWithRoundedCubeTree: GeometricStructureTree = {
  version: '1.0',
  name: 'rounded_box_model',
  description: 'A box with rounded corners',
  globalParameters: [],
  root: mockGSTWithRoundedCube
};

export const mockGSTUpright: GeometricStructureTree = {
  version: '1.0',
  name: 'upright_model',
  description: 'A tall model printed upright',
  globalParameters: [],
  root: mockGSTComponent,
  printOrientation: 'upright'
};

export const mockGSTLarge: GeometricStructureTree = {
  version: '1.0',
  name: 'large_model',
  description: 'A very large model',
  globalParameters: [],
  root: mockGSTComponent,
  boundingBox: {
    min: [0, 0, 0],
    max: [300, 300, 200]
  }
};

export const mockGSTSmall: GeometricStructureTree = {
  version: '1.0',
  name: 'small_model',
  description: 'A very small model',
  globalParameters: [],
  root: mockGSTComponent,
  boundingBox: {
    min: [0, 0, 0],
    max: [10, 8, 3]
  }
};

// ============================================
// Mock Validation Results
// ============================================

export const mockValidationSuccess: ValidationResult = {
  success: true,
  errors: [],
  warnings: [],
  isManifold: true,
  boundingBox: {
    min: [0, 0, 0],
    max: [50, 30, 5]
  },
  vertexCount: 24,
  triangleCount: 12,
  gstMatch: true
};

export const mockValidationFailure: ValidationResult = {
  success: false,
  errors: ['Compilation Failed (Exit Code 1): Unknown module cube2'],
  warnings: [],
  isManifold: false
};

export const mockValidationNonManifold: ValidationResult = {
  success: true,
  errors: [],
  warnings: ['Non-manifold edge detected'],
  isManifold: false,
  boundingBox: {
    min: [0, 0, 0],
    max: [50, 30, 5]
  }
};

export const mockValidationGSTMismatch: ValidationResult = {
  success: true,
  errors: [],
  warnings: [],
  isManifold: true,
  gstMatch: false,
  gstDeviationPercent: 35
};

export const mockValidationThinWall: ValidationResult = {
  success: true,
  errors: [],
  warnings: ['Thin wall detected: 0.8mm thickness may be too fragile'],
  isManifold: true
};

// ============================================
// Mock SCAD Code
// ============================================

export const mockScadCode = `// Test Model
// Generated by PolyGen AI

// Parameters
width = 50;
height = 30;
depth = 5;

$fn = 64;

// Main geometry
cube([width, height, depth], center=true);
`;

export const mockScadCodeWithError = `// Invalid SCAD
cube2([10, 10, 10]);
`;

export const mockScadCodeComplex = `// Complex Model with multiple features

// Main dimensions
base_width = 60;
base_height = 40;
thickness = 5;

// Hole parameters
hole_diameter = 3.4;
hole_depth = 5;

$fn = 64;
$slop = 0.1;

module base_plate() {
    cube([base_width, base_height, thickness], center=true);
}

module mounting_hole() {
    cylinder(h=hole_depth+1, d=hole_diameter, center=true);
}

difference() {
    base_plate();
    translate([20, 15, 0]) mounting_hole();
    translate([-20, 15, 0]) mounting_hole();
    translate([20, -15, 0]) mounting_hole();
    translate([-20, -15, 0]) mounting_hole();
}
`;

// ============================================
// Mock Spec Data
// ============================================

export const mockSpec: SpecData = {
  product_class: 'mounting_bracket',
  units: 'mm',
  intended_platform: 'FDM',
  mount_target: 'wall',
  constraints: {
    process: 'FDM',
    nozzle_mm: 0.4,
    layer_mm: 0.2,
    min_wall_mm: 1.2,
    clearance_mm: 0.2
  },
  envelope: {
    max_x_mm: 50,
    max_y_mm: 30,
    max_z_mm: 5
  }
};

// ============================================
// Mock Generated Asset
// ============================================

export const mockGeneratedAsset: GeneratedAsset = {
  scadCode: mockScadCode,
  spec: mockSpec,
  gst: mockGST,
  validationResult: mockValidationSuccess,
  smartFixes: []
};

// ============================================
// Mock Quick Fixes
// ============================================

export const mockSmartFixes: SmartQuickFix[] = [
  {
    id: 'tighter-fit',
    label: 'Tighter fit',
    description: 'Reduce hole clearance for press fit',
    prompt: 'Make all holes have a tighter fit',
    category: 'tolerance',
    relevance: 0.9
  },
  {
    id: 'scale-up',
    label: 'Scale up',
    description: 'Make the model 25% larger',
    prompt: 'Scale the model up by 25%',
    category: 'dimension',
    relevance: 0.6
  }
];

// ============================================
// Mock Callbacks Factory
// ============================================

export function createMockCallbacks(): OrchestratorCallbacks & { 
  stepChanges: WorkflowStep[];
  errors: Array<{ error: Error; step: WorkflowStep }>;
} {
  const stepChanges: WorkflowStep[] = [];
  const errors: Array<{ error: Error; step: WorkflowStep }> = [];

  return {
    stepChanges,
    errors,
    onStepChange: (step: WorkflowStep) => {
      stepChanges.push(step);
    },
    onGSTGenerated: vi.fn(),
    onPreviewImageGenerated: vi.fn(),
    onCodeGenerated: vi.fn(),
    onValidationComplete: vi.fn(),
    onSmartFixesGenerated: vi.fn(),
    onError: (error: Error, step: WorkflowStep) => {
      errors.push({ error, step });
    }
  };
}

// ============================================
// Mock API Response Factories
// ============================================

export function createMockGeminiResponse(gst: GeometricStructureTree) {
  return {
    text: JSON.stringify(gst)
  };
}

export function createMockGeminiClarificationResponse() {
  return {
    text: JSON.stringify({
      needsClarification: true,
      clarifications: [
        {
          question: 'What size should the mounting holes be?',
          suggestions: ['M3 (3.4mm)', 'M4 (4.5mm)', 'M5 (5.5mm)']
        }
      ],
      partialSpec: {
        name: 'partial_model'
      }
    })
  };
}

export function createMockClaudeResponse(scadCode: string) {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text: scadCode }]
    })
  };
}

export function createMockClaudeErrorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    json: async () => ({
      error: { message }
    })
  };
}
