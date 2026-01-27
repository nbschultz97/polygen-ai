/**
 * Coder Service
 * Generates OpenSCAD code from GST using Claude API (via server proxy)
 * Uses pure OpenSCAD primitives (no BOSL2) for WASM compatibility
 * SECURITY: All requests require authentication
 */

import type { CoderEditInput, CoderInput, CoderOutput } from '../types';
import { getAuthToken } from './apiClient';
import type { ValidationFeedback } from './validationFeedbackBuilder';

// ============================================================================
// TACTICAL LIBRARY INLINE (for standalone code that works in desktop OpenSCAD)
// ============================================================================
// This is inlined into generated code so users can open it in any OpenSCAD
const TACTICAL_LIBRARY_INLINE = `
// ============================================================================
// TACTICAL LIBRARY (Inlined for standalone use)
// MIL-STD-1913 Picatinny Rail & TW-PL-507F MOLLE Standards
// ============================================================================

// Picatinny Constants
PICATINNY_SLOT_WIDTH = 5.23;
PICATINNY_SLOT_SPACING = 10.01;
PICATINNY_RAIL_TOP_WIDTH = 20.6;
PICATINNY_RAIL_BASE_WIDTH = 21.2;
PICATINNY_RAIL_HEIGHT = 9.6;
PICATINNY_DOVETAIL_DEPTH = 5.31;
PICATINNY_SLOT_DEPTH = 4.5;

// MOLLE Constants
MOLLE_WEBBING_WIDTH = 25;
MOLLE_ROW_SPACING = 38;
MOLLE_COLUMN_SPACING = 38;
MOLLE_WEBBING_THICKNESS = 3;
MOLLE_ATTACHMENT_GAP = 4;

module picatinny_rail(slots = 5, height = 15, with_slots = true) {
    length = slots * PICATINNY_SLOT_SPACING;
    body_width = PICATINNY_RAIL_BASE_WIDTH + 4;
    eps = 0.01;
    difference() {
        cube([length, body_width, height], center = true);
        translate([0, 0, height/2 - PICATINNY_DOVETAIL_DEPTH/2 + eps])
            linear_extrude(height = PICATINNY_DOVETAIL_DEPTH + eps, scale = PICATINNY_RAIL_TOP_WIDTH / PICATINNY_RAIL_BASE_WIDTH)
                square([length + eps*2, PICATINNY_RAIL_BASE_WIDTH], center = true);
        if (with_slots) {
            for (i = [0:slots-1]) {
                x_pos = (i - (slots-1)/2) * PICATINNY_SLOT_SPACING;
                translate([x_pos, 0, height/2 - PICATINNY_SLOT_DEPTH/2 + eps])
                    cube([PICATINNY_SLOT_WIDTH, body_width + eps*2, PICATINNY_SLOT_DEPTH + eps], center = true);
            }
        }
    }
}

module picatinny_rail_male(slots = 5, with_slots = true) {
    length = slots * PICATINNY_SLOT_SPACING;
    eps = 0.01;
    difference() {
        linear_extrude(height = length, center = true)
            polygon([
                [-PICATINNY_RAIL_TOP_WIDTH/2, PICATINNY_RAIL_HEIGHT],
                [PICATINNY_RAIL_TOP_WIDTH/2, PICATINNY_RAIL_HEIGHT],
                [PICATINNY_RAIL_BASE_WIDTH/2, 0],
                [-PICATINNY_RAIL_BASE_WIDTH/2, 0]
            ]);
        if (with_slots) {
            for (i = [0:slots-1]) {
                z_pos = (i - (slots-1)/2) * PICATINNY_SLOT_SPACING;
                translate([0, PICATINNY_RAIL_HEIGHT - PICATINNY_SLOT_DEPTH/2 + eps, z_pos])
                    cube([PICATINNY_RAIL_TOP_WIDTH + eps*2, PICATINNY_SLOT_DEPTH + eps, PICATINNY_SLOT_WIDTH], center = true);
            }
        }
    }
}

module picatinny_groove(length = 50) {
    linear_extrude(height = length, center = true)
        rotate([0, 0, 90])
            polygon([
                [-PICATINNY_DOVETAIL_DEPTH, -PICATINNY_RAIL_BASE_WIDTH/2],
                [-PICATINNY_DOVETAIL_DEPTH, PICATINNY_RAIL_BASE_WIDTH/2],
                [0, PICATINNY_RAIL_TOP_WIDTH/2],
                [0, -PICATINNY_RAIL_TOP_WIDTH/2]
            ]);
}

module molle_clip(width = 28, height = 40, rows = 1) {
    wall = 3;
    hook_depth = 12;
    hook_height = min(20, height * 0.4);
    slot_width = MOLLE_WEBBING_WIDTH - 2;
    eps = 0.01;
    difference() {
        union() {
            cube([width, wall, height], center = true);
            translate([0, -hook_depth/2 - wall/2, height/2 - hook_height/2])
                cube([width, hook_depth, hook_height], center = true);
            if (rows > 1) {
                translate([0, -hook_depth/2 - wall/2, -height/2 + hook_height/2])
                    cube([width, hook_depth, hook_height], center = true);
            }
        }
        translate([0, -hook_depth/2, height/2 - hook_height + MOLLE_ATTACHMENT_GAP])
            cube([slot_width, hook_depth + wall + eps*2, MOLLE_ATTACHMENT_GAP + eps], center = true);
        if (rows > 1) {
            translate([0, -hook_depth/2, -height/2 + hook_height - MOLLE_ATTACHMENT_GAP])
                cube([slot_width, hook_depth + wall + eps*2, MOLLE_ATTACHMENT_GAP + eps], center = true);
        }
    }
}

module molle_adapter_plate(plate_width = 80, plate_height = 60, plate_thickness = 5, clip_columns = 2) {
    clip_spacing = plate_width / (clip_columns + 1);
    union() {
        cube([plate_width, plate_thickness, plate_height], center = true);
        for (i = [1:clip_columns]) {
            x_pos = (i - (clip_columns + 1)/2) * clip_spacing;
            translate([x_pos, -plate_thickness/2, 0])
                rotate([90, 0, 0])
                    molle_clip(width = 28, height = plate_height * 0.8);
        }
    }
}

module picatinny_molle_adapter(slots = 5, plate_width = 80, plate_height = 50, clip_columns = 2) {
    plate_thickness = 5;
    clip_spacing = plate_width / (clip_columns + 1);
    union() {
        cube([plate_width, plate_thickness, plate_height], center = true);
        translate([0, plate_thickness/2 + 7.5, 0])
            rotate([90, 0, 0])
                picatinny_rail(slots = slots, height = 15);
        for (i = [1:clip_columns]) {
            x_pos = (i - (clip_columns + 1)/2) * clip_spacing;
            translate([x_pos, -plate_thickness/2 - 1.5, 0])
                rotate([90, 0, 0])
                    molle_clip(width = 28, height = plate_height * 0.8);
        }
    }
}

module rcube(size, r = 2) {
    hull() {
        for (x = [-1, 1], y = [-1, 1], z = [-1, 1]) {
            translate([x * (size[0]/2 - r), y * (size[1]/2 - r), z * (size[2]/2 - r)])
                sphere(r = r);
        }
    }
}

module counterbore(shaft_d, shaft_depth, head_d, head_depth) {
    eps = 0.01;
    union() {
        cylinder(h = shaft_depth + eps, d = shaft_d, center = false);
        translate([0, 0, shaft_depth - head_depth])
            cylinder(h = head_depth + eps, d = head_d, center = false);
    }
}

module tube(od, id, h) {
    eps = 0.01;
    difference() {
        cylinder(h = h, d = od, center = true);
        cylinder(h = h + eps*2, d = id, center = true);
    }
}

// ============================================================================
// END TACTICAL LIBRARY
// ============================================================================
`;

/**
 * Inline the tactical library into code that uses it
 * This makes the code self-contained for desktop OpenSCAD
 */
function inlineTacticalLibrary(code: string): string {
  if (!code.includes('libraries/tactical.scad')) {
    return code;
  }

  // Remove the use statement and add the inlined library
  const codeWithoutUse = code.replace(/use\s*<libraries\/tactical\.scad>\s*;?\n*/gi, '');

  // Add the library at the top, followed by the user's code
  return TACTICAL_LIBRARY_INLINE + '\n' + codeWithoutUse;
}

// Extended CoderInput with validation feedback
export interface EnhancedCoderInput extends CoderInput {
  validationFeedback?: ValidationFeedback;
}

// System prompt for the Coder agent - Enhanced with OpenSCAD rules and GST mapping
const CODER_SYSTEM_PROMPT = `
You convert Geometric Structure Trees (GST) to OpenSCAD code for 3D printing.
Output ONLY valid OpenSCAD code. No markdown, no explanations.

## ⚠️ MANDATORY: TACTICAL LIBRARY DETECTION (CHECK FIRST!)

BEFORE generating ANY code, scan the GST for these keywords:
- picatinny, rail, MIL-STD-1913, dovetail groove
- molle, PALS, webbing, plate carrier, tactical
- tactical, military, mount, adapter

IF ANY of these keywords appear in GST name, description, or component names:
1. ADD this line at the top of your output: use <libraries/tactical.scad>
2. USE the pre-built modules instead of writing your own:
   - picatinny_rail(slots=5, height=15) → Female Picatinny receiver
   - picatinny_rail_male(slots=5) → Male rail
   - picatinny_groove(length=50) → Subtraction primitive for grooves
   - molle_clip(width=28, height=40, rows=1) → Hook-style MOLLE clip
   - picatinny_molle_adapter(slots=5, plate_width=80, plate_height=50, clip_columns=2) → Complete adapter!

EXAMPLE - Picatinny to MOLLE adapter:
\`\`\`openscad
use <libraries/tactical.scad>

// Just call the pre-built module!
picatinny_molle_adapter(slots=5, plate_width=100, plate_height=50, clip_columns=2);
\`\`\`

DO NOT manually define picatinny_groove_dovetail, molle_clip, or similar modules - they already exist!

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

### 4. ATOMIC LMP - Module Encapsulation (CRITICAL)
Every GST component MUST be wrapped in its own module with LOCAL variables.
This prevents 'Variable Shadowing' bugs in large assemblies.

WRONG (Variables leak between scopes):
\`\`\`
width = 50;
cube([width, 10, 5]);
cylinder(h=width, d=10);  // Uses same 'width' - confusing!
\`\`\`

RIGHT (Atomic modules with local scope):
\`\`\`
module base_plate() {
    local_width = 50;
    local_depth = 10;
    local_height = 5;
    cube([local_width, local_depth, local_height], center=true);
}

module mounting_post() {
    local_height = 50;  // Different 'height', no conflict!
    local_diameter = 10;
    cylinder(h=local_height, d=local_diameter, center=true);
}

// Assembly uses modules
union() {
    base_plate();
    translate([0, 0, 2.5]) mounting_post();
}
\`\`\`

RULE: Each GST child component → separate module → called in assembly

### 5. Standard Primitives + Built-in Library
Use built-in primitives: cube, sphere, cylinder, polyhedron, linear_extrude, rotate_extrude, hull, difference, union, intersection

For tactical/military equipment from GST, USE the built-in tactical library:
use <libraries/tactical.scad>

Available tactical modules (NEVER redefine - just call them):
- picatinny_rail(slots=5, height=15, with_slots=true) - Female receiver
- picatinny_rail_male(slots=5, with_slots=true) - Male rail
- picatinny_groove(length=50) - Subtraction primitive
- molle_clip(width=28, height=40, rows=1) - Hook-style clip
- molle_adapter_plate(plate_width=80, plate_height=60, plate_thickness=5, clip_columns=2)
- picatinny_molle_adapter(slots=5, plate_width=80, plate_height=50, clip_columns=2)
- rcube(size, r=2) - Rounded cube
- counterbore(shaft_d, shaft_depth, head_d, head_depth) - Flush screw holes
- tube(od, id, h) - Hollow cylinder

IMPORTANT: Use \`use <>\` NOT \`include <>\`, NO external libraries (BOSL2, MCAD)

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
- Picatinny (MIL-STD-1913):
  - Slot width: 5.23mm, slot spacing: 10.01mm center-to-center
  - Rail width: top=20.6mm (narrower), base=21.2mm (wider), height=9.6mm
  - FEMALE mount: dovetail groove that GRIPS a male rail (wider at bottom, narrower at top)
  - MALE mount: dovetail ridge that FITS IN a female mount (narrower at top, wider at base)
- MOLLE webbing:
  - Webbing width: 25mm, row spacing: 38mm
  - Clips should be hook-shaped (inverted J) to slide behind and grip webbing
  - NOT just rectangular blocks with cuts!
- Screw clearance: M3=3.4mm, M4=4.5mm, M5=5.5mm

IMPORTANT: When asked for "female Picatinny", create a GROOVE that is WIDER at the bottom (21.2mm) and NARROWER at the top (20.6mm). This creates the dovetail that grips a male rail.

## ERROR PREVENTION CHECKLIST
Before outputting code, verify:
[ ] All variables defined BEFORE use
[ ] eps = 0.01 is defined
[ ] difference() cutters extend by eps*2
[ ] All semicolons present
[ ] All braces matched
[ ] $fn set for smooth curves

## COMPLETE EXAMPLE: GST to OpenSCAD

INPUT GST:
{
  "name": "mounting_plate",
  "globalParameters": [
    { "name": "plate_width", "value": 50, "unit": "mm" },
    { "name": "plate_depth", "value": 30, "unit": "mm" },
    { "name": "plate_height", "value": 5, "unit": "mm" }
  ],
  "root": {
    "id": "main",
    "type": "union",
    "children": [
      {
        "id": "base_plate",
        "type": "cuboid",
        "parameters": [
          { "name": "width", "value": 50, "unit": "mm" },
          { "name": "depth", "value": 30, "unit": "mm" },
          { "name": "height", "value": 5, "unit": "mm" }
        ]
      },
      {
        "id": "hole_1",
        "type": "screw_hole",
        "booleanOp": "subtract",
        "parameters": [
          { "name": "diameter", "value": 3.4, "unit": "mm" },
          { "name": "depth", "value": 5, "unit": "mm" }
        ],
        "anchors": [{ "name": "center", "position": [-20, -10, 0], "orientation": "TOP" }]
      },
      {
        "id": "hole_2",
        "type": "screw_hole",
        "booleanOp": "subtract",
        "parameters": [
          { "name": "diameter", "value": 3.4, "unit": "mm" },
          { "name": "depth", "value": 5, "unit": "mm" }
        ],
        "anchors": [{ "name": "center", "position": [20, -10, 0], "orientation": "TOP" }]
      }
    ]
  }
}

OUTPUT SCAD:
// Mounting Plate - Rectangular plate with mounting holes
// Generated from GST

// ============ Global Parameters ============
plate_width = 50;   // mm
plate_depth = 30;   // mm
plate_height = 5;   // mm

// ============ Component Parameters ============
hole_diameter = 3.4;  // M3 clearance hole
hole_depth = 5;       // mm

// ============ Settings ============
$fn = 64;
eps = 0.01;

// ============ Main Geometry ============
difference() {
    // Base plate (cuboid - no booleanOp = positive geometry)
    cube([plate_width, plate_depth, plate_height], center=true);

    // Hole 1 (screw_hole with booleanOp: subtract)
    translate([-20, -10, 0])
        cylinder(h=hole_depth + eps*2, d=hole_diameter, center=true, $fn=32);

    // Hole 2 (screw_hole with booleanOp: subtract)
    translate([20, -10, 0])
        cylinder(h=hole_depth + eps*2, d=hole_diameter, center=true, $fn=32);
}

## COMMON PATTERNS

### Pattern: Rounded Cuboid (rcube)
module rcube(size, r) {
    hull() {
        for (x = [-1, 1], y = [-1, 1], z = [-1, 1]) {
            translate([x*(size[0]/2-r), y*(size[1]/2-r), z*(size[2]/2-r)])
                sphere(r=r, $fn=32);
        }
    }
}

### Pattern: Tube
module tube(od, id, h) {
    difference() {
        cylinder(h=h, d=od, center=true);
        cylinder(h=h + eps*2, d=id, center=true);
    }
}

### Pattern: Counterbore Hole
module counterbore(shaft_d, shaft_depth, head_d, head_depth) {
    union() {
        cylinder(h=shaft_depth + eps, d=shaft_d, center=false);
        translate([0, 0, shaft_depth - head_depth])
            cylinder(h=head_depth + eps, d=head_d, center=false);
    }
}

### Pattern: Tactical Equipment (USE LIBRARY - DON'T REDEFINE!)
// For Picatinny/MOLLE equipment, USE THE LIBRARY:
use <libraries/tactical.scad>

// Then CALL the pre-built modules:
picatinny_rail(slots=5);           // Female mount
picatinny_groove(length=50);       // For subtractive grooves
molle_clip(width=28, height=40);   // MOLLE attachment

// DO NOT copy-paste module definitions - just use the library!

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
 * SECURITY: Requires authentication
 */
async function callClaudeProxy(
  prompt: string,
  systemPrompt: string,
  abortSignal?: AbortSignal
): Promise<string> {
  // Get auth token for authenticated request
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: process.env.CODER_MODEL || DEFAULT_MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    // Anthropic returns { error: { type, message } } or { error: { message } }
    const errorMessage =
      errorBody?.error?.message || errorBody?.error || `API error: ${response.status}`;
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
${input.validationErrors.map((e) => `- ${e}`).join('\n')}
`;
  }

  prompt += `\nGenerate the OpenSCAD code. Output ONLY valid SCAD code, no markdown.`;

  try {
    const text = await callClaudeProxy(prompt, CODER_SYSTEM_PROMPT, abortSignal);

    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    // Post-process to ensure mandatory library is present if tactical modules are used
    let code = extractScadCode(text);
    if (
      (code.includes('picatinny_') || code.includes('molle_')) &&
      !code.includes('libraries/tactical.scad')
    ) {
      console.log('Tactical Guard: Auto-injecting missing tactical library import');
      code = `use <libraries/tactical.scad>\n\n${code}`;
    }

    // Inline the library so code works in desktop OpenSCAD
    code = inlineTacticalLibrary(code);

    return {
      scadCode: code,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error('Coder service error:', error);
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
6. **TACTICAL LIBRARY**: For Picatinny/MOLLE/Military gear, use ONLY these pre-built modules:
   \`\`\`
   use <libraries/tactical.scad>

   // AVAILABLE MODULES (use ONLY these - NO OTHERS EXIST!):
   picatinny_rail(slots=5, height=15, with_slots=true)     // Female receiver
   picatinny_rail_male(slots=5, with_slots=true)          // Male rail
   picatinny_groove(length=50)                             // Subtraction primitive
   molle_clip(width=28, height=40, rows=1)                // MOLLE hook clip
   molle_adapter_plate(plate_width=80, plate_height=60, plate_thickness=5, clip_columns=2)
   picatinny_molle_adapter(slots=5, plate_width=80, plate_height=50, clip_columns=2) // COMPLETE ADAPTER!
   rcube(size=[x,y,z], r=2)                                // Rounded cube
   counterbore(shaft_d, shaft_depth, head_d, head_depth)  // Screw hole
   tube(od, id, h)                                         // Hollow cylinder
   \`\`\`
   ⚠️ DO NOT invent modules like 'picatinny_dovetail_female' - they don't exist!

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
  const validationSection = input.validationErrors?.length
    ? `\n## PREVIOUS VALIDATION ERRORS (must fix these!)
${input.validationErrors.map((e) => `- ${e}`).join('\n')}
`
    : '';

  // Detect vague error reports like "doesn't work", "broken", etc.
  const vagueErrorPhrases = /doesn'?t work|broken|error|fail|wrong|bad|not working|issue/i;
  const isVagueErrorReport =
    vagueErrorPhrases.test(input.editRequest) && !input.validationErrors?.length;

  const vagueErrorWarning = isVagueErrorReport
    ? `
## ⚠️ VAGUE ERROR REPORT DETECTED
The user says "${input.editRequest}" but no specific errors were provided.
When editing:
1. Review the code for common OpenSCAD issues:
   - Variables used before definition
   - Missing semicolons or braces
   - eps not defined for difference() operations
   - Module/function calls with wrong number of arguments
2. Ensure proper $fn is set for curves
3. Check that difference() cutters extend past surfaces
4. Verify all variable names match their definitions
`
    : '';

  const prompt = `## EXISTING GST (Design Specification)
\`\`\`json
${JSON.stringify(input.existingGST, null, 2)}
\`\`\`

## EXISTING OPENSCAD CODE
\`\`\`openscad
${input.existingCode}
\`\`\`
${validationSection}${vagueErrorWarning}
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

    // Post-process to ensure mandatory library is present if tactical modules are used
    let code = extractScadCode(text);
    if (
      (code.includes('picatinny_') || code.includes('molle_')) &&
      !code.includes('libraries/tactical.scad')
    ) {
      console.log(
        'Tactical Guard: Auto-injecting missing tactical library import into edited code'
      );
      code = `use <libraries/tactical.scad>\n\n${code}`;
    }

    // Inline the library so code works in desktop OpenSCAD
    code = inlineTacticalLibrary(code);

    return {
      scadCode: code,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error('Coder edit error:', error);
    throw new Error(
      `Coder edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// SOTA Diff-Based Editing
// ============================================================================

// System prompt for targeted module fixes
const DIFF_FIX_SYSTEM_PROMPT = `
You are an OpenSCAD module debugger. Fix ONLY the broken module, not the entire file.

## RULES
1. Output ONLY the fixed module definition (module name() { ... })
2. Do NOT include surrounding code, parameters, or other modules
3. Preserve the module signature (name and parameters)
4. Fix the specific error mentioned
5. Ensure eps is used for boolean operations

## OUTPUT FORMAT
Return ONLY the fixed module:
module module_name(param1, param2) {
    // fixed implementation
}

No explanations, no markdown, just the module code.
`;

/**
 * Extract module names and their code from OpenSCAD
 */
function extractModulesFromCode(
  code: string
): Map<string, { start: number; end: number; code: string }> {
  const modules = new Map<string, { start: number; end: number; code: string }>();
  const modulePattern = /module\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match;

  while ((match = modulePattern.exec(code)) !== null) {
    const moduleName = match[1];
    const startIndex = match.index;
    let braceCount = 1;
    let endIndex = match.index + match[0].length;

    while (braceCount > 0 && endIndex < code.length) {
      if (code[endIndex] === '{') braceCount++;
      if (code[endIndex] === '}') braceCount--;
      endIndex++;
    }

    if (braceCount === 0) {
      modules.set(moduleName, {
        start: startIndex,
        end: endIndex,
        code: code.substring(startIndex, endIndex),
      });
    }
  }

  return modules;
}

/**
 * Identify which module contains an error based on error message
 */
function identifyBrokenModule(errorMessage: string, modules: Map<string, any>): string | null {
  for (const moduleName of modules.keys()) {
    if (errorMessage.toLowerCase().includes(moduleName.toLowerCase())) {
      return moduleName;
    }
  }
  return null;
}

/**
 * SOTA Diff-Based Fix
 * Requests only the broken module to be fixed, then patches it back
 * Much faster and more reliable than regenerating entire file
 */
export async function fixBrokenModule(
  input: {
    existingCode: string;
    brokenModuleName: string;
    validationError: string;
    gst?: any;
  },
  abortSignal?: AbortSignal
): Promise<{ scadCode: string; fixedModule: string }> {
  if (abortSignal?.aborted) {
    throw new DOMException('Request was aborted', 'AbortError');
  }

  const modules = extractModulesFromCode(input.existingCode);
  const brokenModule = modules.get(input.brokenModuleName);

  if (!brokenModule) {
    throw new Error(`Module ${input.brokenModuleName} not found in code`);
  }

  const prompt = `## BROKEN MODULE
\`\`\`openscad
${brokenModule.code}
\`\`\`

## VALIDATION ERROR
${input.validationError}

## CONTEXT (from GST)
${
  input.gst
    ? JSON.stringify(
        input.gst.root?.children?.find((c: any) => c.name?.includes(input.brokenModuleName)),
        null,
        2
      )
    : 'No GST context'
}

Fix ONLY this module. Output the corrected module definition.`;

  try {
    const text = await callClaudeProxy(prompt, DIFF_FIX_SYSTEM_PROMPT, abortSignal);

    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    const fixedModule = extractScadCode(text);

    // Patch the fixed module back into the original code
    const patchedCode =
      input.existingCode.substring(0, brokenModule.start) +
      fixedModule +
      input.existingCode.substring(brokenModule.end);

    console.log(`Diff-based fix applied to module: ${input.brokenModuleName}`);

    return {
      scadCode: patchedCode,
      fixedModule,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error('Diff-based fix error:', error);
    throw new Error(
      `Module fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Attempt diff-based fix if possible, fall back to full edit
 */
export async function smartFix(
  input: {
    existingCode: string;
    existingGST?: any;
    validationErrors: string[];
  },
  abortSignal?: AbortSignal
): Promise<{ scadCode: string; method: 'diff' | 'full' }> {
  const modules = extractModulesFromCode(input.existingCode);

  for (const error of input.validationErrors) {
    const brokenModule = identifyBrokenModule(error, modules);

    if (brokenModule) {
      try {
        console.log(`Attempting diff-based fix for module: ${brokenModule}`);
        const result = await fixBrokenModule(
          {
            existingCode: input.existingCode,
            brokenModuleName: brokenModule,
            validationError: error,
            gst: input.existingGST,
          },
          abortSignal
        );

        return {
          scadCode: result.scadCode,
          method: 'diff',
        };
      } catch (diffError) {
        console.warn('Diff-based fix failed, falling back to full edit:', diffError);
      }
    }
  }

  console.log('Using full edit (diff-based fix not applicable)');
  const result = await editCode(
    {
      existingGST: input.existingGST,
      existingCode: input.existingCode,
      editRequest: `Fix these validation errors:\n${input.validationErrors.join('\n')}`,
      validationErrors: input.validationErrors,
    },
    abortSignal
  );

  return {
    scadCode: result.scadCode,
    method: 'full',
  };
}

/**
 * Extract clean OpenSCAD code from response
 * Handles cases where Claude outputs explanation before/after code blocks
 */
function extractScadCode(text: string): string {
  const trimmed = text.trim();

  // First, try to find a code block anywhere in the text
  // This handles cases where Claude outputs explanation before the code
  const codeBlockMatch = trimmed.match(/```(?:openscad|scad)?\s*\n([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const extracted = codeBlockMatch[1].trim();
    // Verify it looks like OpenSCAD (has variables or primitives)
    if (extracted.match(/(?:cube|cylinder|sphere|difference|union|module|=\s*\d)/)) {
      console.log('Extracted OpenSCAD code from markdown block');
      return extracted;
    }
  }

  // Fallback: Remove markdown code fences if at start/end (legacy behavior)
  let code = trimmed;
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

  // Check if the result looks like explanation text (not OpenSCAD code)
  // If it starts with conversational text, try to find where code begins
  const codeStart = code.trim();
  if (codeStart && !codeStart.startsWith('//') && !codeStart.match(/^[$\w]+\s*=/)) {
    // Text doesn't look like OpenSCAD - might have explanation at start
    // Try to find where the actual code begins (line starting with // or variable assignment)
    const lines = codeStart.split('\n');
    const codeStartIdx = lines.findIndex(
      (line) =>
        line.trim().startsWith('//') ||
        line.trim().match(/^[$\w]+\s*=/) ||
        line.trim().match(/^(?:module|function|difference|union|cube|cylinder|sphere)\s*[({]?/)
    );
    if (codeStartIdx > 0) {
      console.warn(`Stripped ${codeStartIdx} lines of explanation text from Claude response`);
      return lines.slice(codeStartIdx).join('\n').trim();
    }
  }

  return code.trim();
}

// Export as object for consistent API
export const coderService = {
  generateCode,
  editCode,
  fixBrokenModule,
  smartFix,
  isCoderAvailable,
};

export default coderService;
