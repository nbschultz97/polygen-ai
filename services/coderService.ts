/**
 * Coder Service
 * Generates OpenSCAD code from GST using Claude API (via server proxy)
 * Uses pure OpenSCAD primitives (no BOSL2) for WASM compatibility
 */

import {
  GeometricStructureTree,
  CoderInput,
  CoderEditInput,
  CoderOutput
} from '../types';

// System prompt for the Coder agent - Pure OpenSCAD (no BOSL2)
const CODER_SYSTEM_PROMPT = `
You are the PolyGen Coder - an expert OpenSCAD developer for 3D printing.

## OUTPUT FORMAT
Return ONLY valid OpenSCAD code. No markdown fences, no commentary, no explanations.

## MANDATORY RULES
1. Use ONLY standard OpenSCAD primitives: cube(), cylinder(), sphere(), linear_extrude(), rotate_extrude()
2. Use translate(), rotate(), scale() for positioning
3. Use difference(), union(), intersection() for boolean operations
4. DO NOT use BOSL2, MCAD, or ANY external libraries (no include/use statements)
5. ALL dimensions MUST be variables defined at the top of the file
6. Use $fn = 64 for smooth curves
7. Add $slop = 0.1 for printer tolerance adjustments

## CODE STRUCTURE
// PolyGen Generated Model
// Name: {model_name}

// === PARAMETERS ===
length = 50;
width = 30;
height = 20;
wall_thickness = 2;
hole_diameter = 5;

$fn = 64;
$slop = 0.1;

// === MODULES ===
module base_shape() {
    // Implementation
}

module cutouts() {
    // Implementation
}

// === MAIN ASSEMBLY ===
module main() {
    difference() {
        base_shape();
        cutouts();
    }
}

main();

## POSITIONING RULES
- Center objects at origin when logical
- Use translate([x, y, z]) for positioning
- Use rotate([x, y, z]) for rotation (degrees)
- Build assemblies from bottom up (z=0 is print bed)

## ROUNDED EDGES
For rounded cubes, use hull() with spheres or cylinders:
module rounded_cube(size, r) {
    hull() {
        for (x = [r, size[0]-r])
            for (y = [r, size[1]-r])
                for (z = [r, size[2]-r])
                    translate([x, y, z]) sphere(r=r);
    }
}

## COMMON PATTERNS
- Mounting holes: cylinder(h=thickness+0.1, d=hole_d+$slop, center=true)
- Countersink: cylinder(h=head_h, d1=head_d, d2=shaft_d)
- Threads: Use cylinder with appropriate diameter (add $slop for fit)
- Snap fits: Use difference() with appropriate tolerances
- Fillets: Use hull() with cylinders for edge rounding

## NOW EXECUTE
Convert the GST to clean, printable OpenSCAD code.
`;

// Quick reference for common operations
const OPENSCAD_QUICK_REF = `
OpenSCAD Quick Reference:
- cube([x,y,z]) or cube([x,y,z], center=true)
- cylinder(h=h, d=d) or cylinder(h=h, r=r, center=true)
- cylinder(h=h, d1=bottom_d, d2=top_d) for cones
- sphere(d=d) or sphere(r=r)
- translate([x,y,z]) child();
- rotate([x,y,z]) child(); (angles in degrees)
- difference() { base(); cutter(); }
- union() { part1(); part2(); }
- intersection() { shape1(); shape2(); }
- hull() { shape1(); shape2(); }
- linear_extrude(height=h) 2D_shape();
- rotate_extrude(angle=360) 2D_profile();
`;

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Check if Claude API is available (proxy endpoint exists)
 */
export function isCoderAvailable(): boolean {
  // In deployed environment, proxy is available
  // Returns true optimistically; proxy will return 503 if API key not configured
  return true;
}

/**
 * Call Claude API via server proxy
 */
async function callClaudeProxy(
  prompt: string,
  systemPrompt: string,
  abortSignal?: AbortSignal
): Promise<string> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.CODER_MODEL || DEFAULT_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    }),
    signal: abortSignal
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract text from Claude response
  const content = data.content?.[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response format from Claude');
  }

  return content.text;
}

/**
 * Generate OpenSCAD code from a GST
 */
export async function generateCode(
  input: CoderInput,
  abortSignal?: AbortSignal
): Promise<CoderOutput> {
  if (abortSignal?.aborted) {
    throw new DOMException('Request was aborted', 'AbortError');
  }

  // Build prompt
  let prompt = `## GEOMETRIC STRUCTURE TREE (GST)
\`\`\`json
${JSON.stringify(input.gst, null, 2)}
\`\`\`

${OPENSCAD_QUICK_REF}
`;

  // Add validation errors if this is a retry
  if (input.validationErrors && input.validationErrors.length > 0) {
    prompt += `\n## PREVIOUS VALIDATION ERRORS - FIX THESE
${input.validationErrors.map(e => `- ${e}`).join('\n')}
`;
  }

  prompt += `\nGenerate the OpenSCAD code. Output ONLY valid SCAD code, no markdown.`;

  try {
    const text = await callClaudeProxy(prompt, CODER_SYSTEM_PROMPT, abortSignal);

    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    return {
      scadCode: extractScadCode(text)
    };

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error("Coder service error:", error);
    throw new Error(`Coder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Edit existing OpenSCAD code (Symbolic Correction)
 */
export async function editCode(
  input: CoderEditInput,
  abortSignal?: AbortSignal
): Promise<CoderOutput> {
  if (abortSignal?.aborted) {
    throw new DOMException('Request was aborted', 'AbortError');
  }

  const prompt = `## EXISTING GST
\`\`\`json
${JSON.stringify(input.existingGST, null, 2)}
\`\`\`

## EXISTING CODE
\`\`\`openscad
${input.existingCode}
\`\`\`

## EDIT REQUEST
${input.editRequest}

## INSTRUCTIONS
Apply SYMBOLIC CORRECTION:
1. Modify ONLY the relevant variables or module parameters
2. DO NOT rewrite the entire file structure
3. Preserve comments and formatting
4. If adding a new feature, add a new module
5. Keep using pure OpenSCAD (no external libraries)

Output the complete modified SCAD code.`;

  try {
    const text = await callClaudeProxy(prompt, CODER_SYSTEM_PROMPT, abortSignal);

    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    return {
      scadCode: extractScadCode(text)
    };

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error("Coder edit error:", error);
    throw new Error(`Coder edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract clean OpenSCAD code from response
 */
function extractScadCode(text: string): string {
  let code = text.trim();

  // Remove markdown code fences
  if (code.startsWith('```openscad')) {
    code = code.slice(12);
  } else if (code.startsWith('```scad')) {
    code = code.slice(7);
  } else if (code.startsWith('```')) {
    code = code.slice(3);
  }

  if (code.endsWith('```')) {
    code = code.slice(0, -3);
  }

  return code.trim();
}

// Export as object for consistent API
export const coderService = {
  generateCode,
  editCode,
  isCoderAvailable
};

export default coderService;
