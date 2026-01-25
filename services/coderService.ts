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
import { buildValidationFeedback, buildRetryPrompt, ValidationFeedback } from './validationFeedbackBuilder';

// Extended CoderInput with validation feedback
export interface EnhancedCoderInput extends CoderInput {
  validationFeedback?: ValidationFeedback;
}

// System prompt for the Coder agent - Enhanced with OpenSCAD rules and GST mapping
const CODER_SYSTEM_PROMPT = `
You convert Geometric Structure Trees (GST) to OpenSCAD code for 3D printing.
Output ONLY valid OpenSCAD code. No markdown, no explanations.

## CRITICAL OPENSCAD RULES

### 1. Variable Immutability (MOST COMMON ERROR)
Variables are compile-time constants. Define ALL variables at the TOP before use.
WRONG: cube([width, height, depth]); width = 10;
RIGHT: width = 10; cube([width, height, depth]);

### 2. Epsilon for Boolean Operations (REQUIRED)
All difference() and union() operations need epsilon overlap to avoid rendering bugs.
ALWAYS add: eps = 0.01;
Cutting geometry must extend PAST surfaces: h = thickness + eps*2

### 3. Transform Order (Right-to-Left)
translate([10,0,0]) rotate([0,0,45]) cube(5);
// 1. cube created, 2. rotated 45°, 3. translated

### 4. Standard Primitives Only
NO libraries (no BOSL2, MCAD, include, use statements)
Use: cube, sphere, cylinder, polyhedron, linear_extrude, rotate_extrude, hull, difference, union, intersection

## GST TO OPENSCAD MAPPING

### Component Types → OpenSCAD:
- cuboid → cube([width, depth, height], center=true)
- cylinder → cylinder(h=height, d=diameter, center=true, $fn=64)
- sphere → sphere(d=diameter, $fn=64)
- screw_hole → cylinder(h=depth+eps*2, d=diameter, $fn=32) [use in difference()]
- rcube → use hull() with 8 corner spheres for rounded corners
- tube → difference() { outer cylinder - inner cylinder }

### Boolean Operations:
GST booleanOp field maps to OpenSCAD:
- "add" or no booleanOp → geometry goes in union() or directly
- "subtract" → geometry goes inside difference() as cutter
- "intersect" → geometry goes in intersection()

### Example GST→OpenSCAD Conversion:
GST:
{
  "root": {
    "type": "union",
    "children": [
      { "type": "cuboid", "parameters": [{"name":"width","value":50},{"name":"depth","value":30},{"name":"height","value":10}] },
      { "type": "screw_hole", "booleanOp": "subtract", "parameters": [{"name":"diameter","value":3.4},{"name":"depth","value":10}] }
    ]
  }
}

OpenSCAD:
// Parameters from GST
width = 50;
depth = 30;
height = 10;
hole_diameter = 3.4;
hole_depth = 10;

// Settings
$fn = 64;
eps = 0.01;

// Geometry
difference() {
    cube([width, depth, height], center=true);  // cuboid (no booleanOp = positive)
    cylinder(h=hole_depth+eps*2, d=hole_diameter, center=true);  // screw_hole (booleanOp: subtract)
}

## PARAMETER EXTRACTION
1. Extract globalParameters → variables at top
2. Extract each component's parameters → more variables
3. Use descriptive names: base_width, hole_diameter (not w1, d)

## CODE STRUCTURE TEMPLATE
// [Model Name] - [Brief description]

// Global Parameters
param1 = value1;  // from globalParameters
param2 = value2;

// Component Parameters
comp1_width = value;  // from root.children[].parameters

// Settings
$fn = 64;
eps = 0.01;

// Modules (if needed for reuse)
module component_name() { ... }

// Main Geometry
difference() {  // or union() based on GST root.type
    // Positive geometry (no booleanOp or booleanOp: "add")
    // Negative geometry (booleanOp: "subtract")
}

## MANUFACTURING CONSTRAINTS
- Minimum wall thickness: 1.2mm
- Holes need clearance: diameter + 0.2mm for normal fit
- Use center=true for easier positioning
- Add eps*2 to ALL cutting geometry heights

## TACTICAL GEAR STANDARDS (if applicable)
- Picatinny (MIL-STD-1913): top=20.6mm, base=21.2mm, height=9.6mm
- MOLLE webbing: 25mm wide, 38mm row spacing
- Screw clearance: M3=3.4mm, M4=4.5mm, M5=5.5mm

## ERROR PREVENTION CHECKLIST
Before outputting code, verify:
[ ] All variables defined BEFORE use
[ ] eps = 0.01 is defined
[ ] difference() cutters extend by eps*2
[ ] All semicolons present
[ ] All braces matched
[ ] $fn set for smooth curves

NOW: Convert the provided GST to clean, printable OpenSCAD code.
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
    const errorBody = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    // Anthropic returns { error: { type, message } } or { error: { message } }
    const errorMessage = errorBody?.error?.message || errorBody?.error || `API error: ${response.status}`;
    console.error('Claude API error:', errorBody);
    throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
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

// Edit system prompt - more focused on precise modifications
const EDIT_SYSTEM_PROMPT = `
You are an OpenSCAD code editor. Apply precise modifications to existing code.

## CRITICAL: PRESERVE DESIGN INTENT
When editing, you MUST preserve the user's original design intent:
- If they designed a mount, keep it functional as a mount
- If parts need clearance from each other, maintain that clearance
- If components attach to each other, keep them properly connected

## RULES FOR EDITING
1. **PRESERVE RELATIONSHIPS**: When modifying one part, check how it affects OTHER parts
   - If you change plate thickness, adjust anything that sits ON or IN the plate
   - If you round edges, ensure attached components still have proper contact
   - If you resize, proportionally adjust related features
2. **MINIMAL CHANGES**: Only modify what's directly requested
3. **MAINTAIN CLEARANCES**: Don't let parts collide or intersect unintentionally
4. **VARIABLE SCOPE**: OpenSCAD variables are immutable - add new ones, don't reassign
5. **EPSILON**: Ensure eps = 0.01 exists if using boolean operations
6. **NO LIBRARIES**: Pure OpenSCAD only - no include/use statements

## BEFORE MAKING CHANGES - ASK YOURSELF:
1. What other components depend on the part I'm changing?
2. Will my change cause parts to overlap or lose clearance?
3. Does my change preserve the functional purpose of the design?
4. Are mounting points, holes, and attachments still accessible?

## COMMON EDIT PATTERNS

### Shape Change (rounding, chamfering, streamlining):
- KEEP the same overall bounding dimensions unless asked to resize
- Adjust internal geometry to fit within the new shape
- Ensure cutouts and attachments still have proper clearance
- Example: "round the plate" → round the OUTLINE, don't change thickness

### Dimension Change:
- Find the variable controlling the dimension
- Update its value directly
- CHECK: Does this affect other parts? Adjust them too!

### Add Feature:
- Add new module if complex
- Ensure proper boolean operation (union for add, difference for cut)
- Position relative to existing geometry

### Remove Feature:
- Comment out or delete the feature
- Clean up unused variables

## OUTPUT
Return the COMPLETE modified SCAD file - not just the changed parts.
Output ONLY valid OpenSCAD code, no markdown fences.
Preserve ALL existing functionality while applying the requested change.
`;

/**
 * Edit existing OpenSCAD code (Symbolic Correction)
 * Enhanced with validation feedback awareness
 */
export async function editCode(
  input: CoderEditInput,
  abortSignal?: AbortSignal
): Promise<CoderOutput> {
  if (abortSignal?.aborted) {
    throw new DOMException('Request was aborted', 'AbortError');
  }

  // Analyze the existing code to provide context
  const hasEpsilon = /\beps\s*=/.test(input.existingCode);
  const hasFn = /\$fn\s*=/.test(input.existingCode);
  const hasBooleans = /\b(difference|union)\s*\(/.test(input.existingCode);

  // Extract component names from GST for relationship awareness
  const componentNames: string[] = [];
  function extractComponents(node: any) {
    if (node?.name) componentNames.push(node.name);
    if (node?.children) node.children.forEach(extractComponents);
  }
  extractComponents(input.existingGST?.root);

  // Build context-aware prompt
  let prompt = `## EXISTING GST (Design Specification)
\`\`\`json
${JSON.stringify(input.existingGST, null, 2)}
\`\`\`

## EXISTING OPENSCAD CODE
\`\`\`openscad
${input.existingCode}
\`\`\`

## CODE ANALYSIS
- Epsilon defined: ${hasEpsilon ? 'YES' : 'NO - add eps = 0.01 if needed'}
- Quality ($fn) defined: ${hasFn ? 'YES' : 'NO - add $fn = 64 for curves'}
- Boolean operations: ${hasBooleans ? 'YES - ensure proper epsilon extension' : 'NO'}
- Components in design: ${componentNames.join(', ') || 'unknown'}

## EDIT REQUEST
${input.editRequest}

## CRITICAL REMINDERS
- This design has ${componentNames.length} components that may depend on each other
- When changing one part, CHECK if other parts need adjustment
- PRESERVE the functional relationships between components
- Don't let shape changes cause parts to overlap or lose clearance

## INSTRUCTIONS
Apply the requested change using SYMBOLIC CORRECTION:
1. Identify the relevant parameters/modules to modify
2. Make MINIMAL changes - preserve existing structure
3. CHECK: How does this change affect ${componentNames.slice(0, 3).join(', ')}${componentNames.length > 3 ? ', etc.' : ''}?
4. If adding cutting geometry, extend by eps*2 past surfaces
5. Ensure all variables are defined before use
6. Maintain existing code style and comments

Output the complete modified SCAD code with ALL changes applied.`;

  try {
    const text = await callClaudeProxy(prompt, EDIT_SYSTEM_PROMPT, abortSignal);

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
