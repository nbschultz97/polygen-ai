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
You write OpenSCAD code for 3D printing. Output ONLY valid code, no markdown.

RULES:
- Standard OpenSCAD only (cube, cylinder, sphere, difference, union, hull, etc.)
- NO libraries (no BOSL2, MCAD, include, use)
- All dimensions as variables at top
- $fn=64 for curves, $slop=0.1 for tolerances
- Write clean, readable code like a human engineer would

STYLE:
- Brief header comment with model name
- Group related parameters together
- Use descriptive variable names (rail_width not w1)
- Modules for reusable parts
- Minimal comments - code should be self-explanatory
- NO section banners like "=== PARAMETERS ==="
- NO excessive commenting on obvious operations

EXAMPLE STYLE:
// Drone MOLLE Mount - chest carrier adapter

// Main dimensions
mount_width = 60;
mount_height = 80;
thickness = 4;

// Picatinny interface (MIL-STD-1913)
rail_top = 20.6;
rail_base = 21.2;
rail_height = 9.6;

$fn = 64;
$slop = 0.1;

module base_plate() {
    cube([mount_width, mount_height, thickness], center=true);
}

module picatinny_groove() {
    // Female dovetail - wider at bottom
    linear_extrude(50)
        polygon([[-rail_base/2, 0], [-rail_top/2, rail_height],
                 [rail_top/2, rail_height], [rail_base/2, 0]]);
}

difference() {
    base_plate();
    picatinny_groove();
}

## TACTICAL GEAR DOMAIN KNOWLEDGE

### MOLLE/PALS CLIPS (Malice-style)
Real MOLLE clips hook BEHIND the webbing straps:
- Webbing width: 25mm (1 inch)
- Webbing gap: 12-15mm between rows
- Clip design: Hook shape that slides DOWN through gap, then locks behind strap
- Typical clip: 25mm wide body, 6mm hook depth, 3mm hook thickness

module molle_clip(clip_width=25, hook_depth=6, thickness=3) {
    // Main body that sits against vest
    cube([clip_width, 20, thickness]);
    // Hook that goes behind webbing
    translate([0, 20-hook_depth, -15])
        cube([clip_width, hook_depth, 15+thickness]);
    // Retention lip
    translate([0, 20-hook_depth, -15])
        cube([clip_width, 2, 18]);
}

### PICATINNY RAIL (MIL-STD-1913)
- Top width: 20.6mm
- Base width: 21.2mm
- Overall height: 9.6mm
- Dovetail angle: 45 degrees
- Slot: 5.23mm wide, 9.525mm spacing

FEMALE RAIL (groove that receives male rail):
module picatinny_female(length=50) {
    difference() {
        cube([30, length, 15], center=true);
        // Dovetail groove - WIDER at bottom, NARROW at top
        translate([0, 0, 15/2 - 9.6/2])
        linear_extrude(height=9.6+1)
            polygon([
                [-21.2/2, 0],   // bottom left (wide)
                [-20.6/2, 9.6], // top left (narrow)
                [20.6/2, 9.6],  // top right (narrow)
                [21.2/2, 0]     // bottom right (wide)
            ]);
    }
}

MALE RAIL (raised rail with cross slots):
module picatinny_male(length=50) {
    linear_extrude(height=length)
        polygon([
            [-21.2/2, 0],
            [-20.6/2, 9.6],
            [20.6/2, 9.6],
            [21.2/2, 0]
        ]);
}

## CRITICAL: UNDERSTAND THE DESIGN
- Read the GST description carefully
- FEMALE rail = GROOVE that accepts a male rail
- MALE rail = the RAISED dovetail shape
- MOLLE clips hook BEHIND webbing, not in front

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
