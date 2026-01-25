/**
 * Code Explainer Service
 * Adds educational comments to generated OpenSCAD code
 * Helps users learn OpenSCAD while using PolyGen
 */

export interface CodeExplanation {
  enhancedCode: string;
  conceptsUsed: string[];
  tips: string[];
}

/**
 * OpenSCAD concept explanations
 */
const CONCEPT_EXPLANATIONS: Record<string, string> = {
  // Primitives
  'cube': 'cube([x, y, z]) creates a rectangular box. center=true places origin at center.',
  'cylinder': 'cylinder(h, d) creates a cylinder. d1/d2 make cones. $fn controls smoothness.',
  'sphere': 'sphere(d) creates a sphere. Higher $fn = smoother surface but slower render.',

  // Transforms
  'translate': 'translate([x, y, z]) moves geometry. Applied AFTER the object is created.',
  'rotate': 'rotate([x, y, z]) rotates in degrees around each axis. Order: X, then Y, then Z.',
  'scale': 'scale([x, y, z]) resizes geometry. Use uniform [s, s, s] for proportional scaling.',
  'mirror': 'mirror([x, y, z]) creates a mirror copy across the specified axis plane.',

  // Boolean Operations
  'difference': 'difference() { base; cutter; } subtracts cutter from base. First child is kept.',
  'union': 'union() { a; b; } combines multiple shapes into one solid.',
  'intersection': 'intersection() { a; b; } keeps only the overlapping volume.',
  'hull': 'hull() { a; b; } creates a convex hull wrapping around all children.',

  // Extrusions
  'linear_extrude': 'linear_extrude(height) stretches a 2D shape into 3D along Z axis.',
  'rotate_extrude': 'rotate_extrude() spins a 2D shape around Y axis (lathe operation).',

  // Variables
  'eps': 'eps (epsilon) is a tiny offset (usually 0.01mm) to prevent z-fighting in boolean ops.',
  '$fn': '$fn controls curve smoothness. Higher = smoother but slower. 64 is good for final renders.',

  // Modules
  'module': 'module name() { ... } defines reusable geometry, like a function for shapes.',
  'function': 'function name() = ... defines a calculation that returns a value.',
};

/**
 * Detect which concepts are used in the code
 */
function detectConcepts(code: string): string[] {
  const concepts: string[] = [];

  for (const concept of Object.keys(CONCEPT_EXPLANATIONS)) {
    // Use word boundary to avoid false positives
    const pattern = new RegExp(`\\b${concept}\\b`, 'i');
    if (pattern.test(code)) {
      concepts.push(concept);
    }
  }

  return concepts;
}

/**
 * Generate educational tips based on code content
 */
function generateTips(code: string, concepts: string[]): string[] {
  const tips: string[] = [];

  // Transform order tip
  if (concepts.includes('translate') && concepts.includes('rotate')) {
    tips.push('💡 Transform order matters! Transforms apply RIGHT-TO-LEFT (innermost first).');
  }

  // Epsilon tip
  if (concepts.includes('difference') || concepts.includes('union')) {
    if (!code.includes('eps')) {
      tips.push('💡 Add eps = 0.01 for boolean operations to prevent z-fighting artifacts.');
    }
  }

  // Center tip
  if ((concepts.includes('cube') || concepts.includes('cylinder')) && !code.includes('center=true')) {
    tips.push('💡 Using center=true makes positioning easier since origin is at the center.');
  }

  // $fn tip
  if (concepts.includes('cylinder') || concepts.includes('sphere') || concepts.includes('circle')) {
    if (!code.includes('$fn')) {
      tips.push('💡 Set $fn = 64 (or higher) for smooth curves in final renders.');
    }
  }

  // Module tip
  if (code.split(concepts.includes('difference') ? 'difference' : 'union').length > 3) {
    if (!concepts.includes('module')) {
      tips.push('💡 Consider using modules to organize repeated or complex geometry.');
    }
  }

  // Clearance tip
  if (code.includes('hole') || code.includes('screw')) {
    tips.push('💡 For 3D printing, add 0.2-0.4mm clearance to holes for proper fit.');
  }

  return tips.slice(0, 4); // Max 4 tips
}

/**
 * Add inline comments explaining key constructs
 */
function addInlineComments(code: string): string {
  const lines = code.split('\n');
  const annotatedLines: string[] = [];

  let inDifference = false;
  let differenceDepth = 0;
  let isFirstChild = true;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Track difference() blocks
    if (trimmed.includes('difference()')) {
      inDifference = true;
      differenceDepth = 0;
      isFirstChild = true;
    }

    // Track braces for difference context
    if (inDifference) {
      if (trimmed.includes('{')) differenceDepth++;
      if (trimmed.includes('}')) {
        differenceDepth--;
        if (differenceDepth <= 0) {
          inDifference = false;
        }
      }
    }

    // Add explanatory comments for key constructs
    if (!line.includes('//')) {
      // Explain first child in difference
      if (inDifference && differenceDepth === 1 && isFirstChild) {
        if (trimmed.match(/^(cube|cylinder|sphere|hull)/)) {
          line += '  // Base shape (kept)';
          isFirstChild = false;
        }
      }

      // Explain subsequent children in difference
      if (inDifference && differenceDepth === 1 && !isFirstChild) {
        if (trimmed.match(/^(cube|cylinder|translate)/)) {
          line += '  // Cutting shape (subtracted)';
        }
      }

      // Explain epsilon usage
      if (trimmed.match(/\beps\s*\*\s*2/)) {
        line += '  // Extends past both surfaces for clean cut';
      }

      // Explain -eps offset
      if (trimmed.match(/-\s*eps/)) {
        line += '  // Starts below surface to fully penetrate';
      }

      // Explain center=true
      if (trimmed.includes('center=true') && !line.includes('//')) {
        // Don't add duplicate comment
      }

      // Explain $fn
      if (trimmed.match(/\$fn\s*=\s*\d+/) && !line.includes('//')) {
        const fn = trimmed.match(/\$fn\s*=\s*(\d+)/);
        if (fn) {
          const val = parseInt(fn[1]);
          if (val >= 64) {
            line += '  // Smooth curves for final render';
          } else if (val >= 32) {
            line += '  // Moderate smoothness';
          } else {
            line += '  // Fast preview (increase for final)';
          }
        }
      }
    }

    annotatedLines.push(line);
  }

  return annotatedLines.join('\n');
}

/**
 * Add a header explaining the code structure
 */
function addExplanatoryHeader(code: string, concepts: string[]): string {
  const header: string[] = [
    '// ═══════════════════════════════════════════════════════════════════',
    '// OPENSCAD LEARNING GUIDE',
    '// ═══════════════════════════════════════════════════════════════════',
    '//',
    '// This code uses the following OpenSCAD concepts:',
  ];

  // Add concept explanations
  for (const concept of concepts.slice(0, 6)) {
    const explanation = CONCEPT_EXPLANATIONS[concept];
    if (explanation) {
      header.push(`// • ${concept}: ${explanation}`);
    }
  }

  header.push('//');
  header.push('// ═══════════════════════════════════════════════════════════════════');
  header.push('');

  return header.join('\n') + '\n' + code;
}

/**
 * Main function: Enhance code with educational content
 */
export function explainCode(code: string, addHeader: boolean = true): CodeExplanation {
  // Detect concepts used
  const conceptsUsed = detectConcepts(code);

  // Generate tips
  const tips = generateTips(code, conceptsUsed);

  // Add inline comments
  let enhancedCode = addInlineComments(code);

  // Optionally add header
  if (addHeader && conceptsUsed.length > 0) {
    enhancedCode = addExplanatoryHeader(enhancedCode, conceptsUsed);
  }

  return {
    enhancedCode,
    conceptsUsed,
    tips
  };
}

/**
 * Get explanation for a specific concept
 */
export function getConceptExplanation(concept: string): string | undefined {
  return CONCEPT_EXPLANATIONS[concept.toLowerCase()];
}

/**
 * Get all available concept explanations
 */
export function getAllConceptExplanations(): Record<string, string> {
  return { ...CONCEPT_EXPLANATIONS };
}

export const codeExplainer = {
  explainCode,
  getConceptExplanation,
  getAllConceptExplanations
};

export default codeExplainer;
